# ============================================================
# MODEL 3: Metadata Neural Network — REAL ML VERSION
# Trained on 17,880 real EMSCAD job postings (metadata features).
# Uses Random Forest Classifier (scikit-learn) on 6 metadata features.
#
# Run standalone:  python python_models/metadataModel.py
# NOTE: Run train_models.py first to generate metadata_model.pkl
# ============================================================

import re
import os
import sys
import joblib
import numpy as np
from dataclasses import dataclass, field
from typing import List

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "metadata_model.pkl")

# ---- Auto-train if model not found ----
def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("  [metadataModel] Model not found. Running train_models.py automatically...")
        import subprocess
        train_script = os.path.join(os.path.dirname(__file__), "train_models.py")
        subprocess.run([sys.executable, train_script], check=True)

_ensure_model()
_model = joblib.load(MODEL_PATH)


@dataclass
class MetadataModelResult:
    score: int
    flags: List[str]
    model_name: str = "Metadata Neural Network (ML)"
    fraud_probability: float = 0.0
    salary_flag: bool = False
    email_flag: bool = False
    location_flag: bool = False
    company_flag: bool = False
    red_flags: List[str] = field(default_factory=list)
    suspicious_features: List[str] = field(default_factory=list)


SUSPICIOUS_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]


def _extract_metadata_features(job: dict):
    """
    Extract 6 metadata features for Random Forest.
    These match the features used during EMSCAD training.

    Features:
      1. salary_missing           — no salary info provided
      2. company_profile_missing  — no company info provided
      3. has_company_logo         — from EMSCAD column; at inference, heuristic
      4. has_questions             — from EMSCAD column; at inference, default
      5. telecommuting            — from EMSCAD column; at inference, keyword check
      6. requirements_missing     — no requirements listed
    """
    salary = job.get("salary", "") or job.get("salary_range", "")
    company = job.get("company", "") or job.get("company_profile", "")
    location = job.get("location", "")
    reqs = job.get("requirements", "")
    desc = job.get("description", "")
    email = job.get("email", "")

    # Feature 1: salary missing
    salary_missing = 1.0 if not salary.strip() else 0.0

    # Feature 2: company profile missing
    company_missing = 1.0 if not company.strip() else 0.0

    # Feature 3: has_company_logo
    # From EMSCAD column if available; otherwise heuristic (company provided → likely has logo)
    if "has_company_logo" in job:
        try:
            has_logo = float(job["has_company_logo"])
        except (ValueError, TypeError):
            has_logo = 1.0 if company.strip() else 0.0
    else:
        has_logo = 1.0 if company.strip() else 0.0

    # Feature 4: has_questions
    if "has_questions" in job:
        try:
            has_questions = float(job["has_questions"])
        except (ValueError, TypeError):
            has_questions = 0.0
    else:
        has_questions = 0.0

    # Feature 5: telecommuting
    if "telecommuting" in job:
        try:
            telecommuting = float(job["telecommuting"])
        except (ValueError, TypeError):
            telecommuting = 0.0
    else:
        # Infer from text at inference time
        text_lower = (desc + " " + location).lower()
        remote_keywords = ["remote", "work from home", "telecommute", "wfh", "anywhere"]
        telecommuting = 1.0 if any(kw in text_lower for kw in remote_keywords) else 0.0

    # Feature 6: requirements missing
    requirements_missing = 1.0 if not reqs.strip() else 0.0

    features = np.array([[salary_missing, company_missing, has_logo,
                           has_questions, telecommuting, requirements_missing]])

    # Build flag info for human-readable output
    flags_raw = {
        "salary_missing": bool(salary_missing),
        "company_missing": bool(company_missing),
        "no_logo": has_logo < 0.5,
        "no_questions": has_questions < 0.5,
        "telecommuting": bool(telecommuting),
        "requirements_missing": bool(requirements_missing),
    }

    # Also check email if provided (extra signal, not part of ML features)
    email_personal = False
    if email:
        domain = email.split("@")[-1].lower() if "@" in email else ""
        if any(d in domain for d in SUSPICIOUS_DOMAINS):
            email_personal = True
    elif re.search(r'@(gmail|yahoo|hotmail|outlook)\.', desc, re.IGNORECASE):
        email_personal = True
    flags_raw["email_personal"] = email_personal

    return features, flags_raw


def run_metadata_model(job: dict) -> MetadataModelResult:
    """
    Metadata Neural Network — Model 3 (Real ML Version)
    Trained on Random Forest using 6 metadata features from 17,880 EMSCAD postings.

    Args:
        job: dict with keys: salary, email, location, company, description, requirements

    Returns:
        MetadataModelResult with score and individual field flags
    """
    features, flags_raw = _extract_metadata_features(job)

    proba = _model.predict_proba(features)[0]  # [legit_prob, fraud_prob]
    fraud_prob = float(proba[1])
    score = int(round(fraud_prob * 100))

    # Build human-readable flags
    flags = []
    suspicious_features = []
    salary_flag = email_flag = location_flag = company_flag = False

    if flags_raw["salary_missing"]:
        salary_flag = True
        flags.append("No salary information provided")
        suspicious_features.append("salary_missing")
    if flags_raw["company_missing"]:
        company_flag = True
        flags.append("Company name/profile is missing")
        suspicious_features.append("company_missing")
    if flags_raw["no_logo"]:
        flags.append("Job posting has no company logo")
        suspicious_features.append("no_company_logo")
    if flags_raw["requirements_missing"]:
        flags.append("No job requirements listed — common in fraudulent postings")
        suspicious_features.append("requirements_missing")
    if flags_raw["email_personal"]:
        email_flag = True
        flags.append("Contact email uses a personal domain (gmail/yahoo/hotmail)")
        suspicious_features.append("email_personal")

    # Location check (not ML feature but useful flag)
    location = job.get("location", "").lower().strip()
    if not location or location in ("anywhere", "any location"):
        location_flag = True
        flags.append("No specific location or vague location provided")

    return MetadataModelResult(
        score=min(100, max(0, score)),
        flags=flags,
        fraud_probability=round(fraud_prob, 4),
        salary_flag=salary_flag,
        email_flag=email_flag,
        location_flag=location_flag,
        company_flag=company_flag,
        red_flags=flags,
        suspicious_features=suspicious_features,
    )


# ============================================================
# STANDALONE RUNNER
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM METADATA (no company, no salary, no requirements)",
            "job": {
                "title": "Data Entry",
                "company": "",
                "salary": "",
                "email": "recruiter@gmail.com",
                "location": "anywhere",
                "description": "Contact us at jobs@yahoo.com. Easy money. No interview needed.",
                "requirements": "",
            },
        },
        {
            "label": "🟢 LEGITIMATE METADATA",
            "job": {
                "title": "Software Engineer",
                "company": "Google LLC",
                "salary": "$130,000/year",
                "email": "careers@google.com",
                "location": "Bangalore, India",
                "description": "Please apply through our official careers portal. We are looking for experienced engineers to join our cloud platform team. We offer competitive benefits including health insurance, 401k, and equity.",
                "requirements": "5+ years in Python, TypeScript. Strong team collaboration skills. Bachelor's degree in Computer Science.",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   Metadata Neural Network — Real ML Standalone Runner")
    print("   (Random Forest | Trained on 17,880 EMSCAD postings)")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_metadata_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model         : {result.model_name}")
        print(f"  Score         : {result.score}/100")
        print(f"  Fraud Prob    : {result.fraud_probability * 100:.1f}%")
        print(f"  Salary Flag   : {'⚠️ YES' if result.salary_flag   else '✅ OK'}")
        print(f"  Email Flag    : {'⚠️ YES' if result.email_flag    else '✅ OK'}")
        print(f"  Location Flag : {'⚠️ YES' if result.location_flag else '✅ OK'}")
        print(f"  Company Flag  : {'⚠️ YES' if result.company_flag  else '✅ OK'}")
        if result.flags:
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ All metadata looks legitimate")
        print("-" * 60 + "\n")

    print("✅ metadataModel.py (ML) ran successfully.\n")
