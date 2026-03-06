# ============================================================
# MODEL 3: Metadata Neural Network — REAL ML VERSION
# Uses Random Forest Classifier (scikit-learn) on structured fields.
#
# Run standalone:  python python_models/metadataModel.py
# NOTE: Run train_models.py first to generate metadata_model.pkl
# ============================================================

import re
import os
import sys
import joblib
import numpy as np
from dataclasses import dataclass
from typing import List

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "metadata_model.pkl")

SUSPICIOUS_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]

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


def _extract_metadata_features(job: dict):
    """Extract 6 structured metadata features for the Random Forest."""
    salary_str   = job.get("salary", "").lower()
    email        = job.get("email", "")
    location     = job.get("location", "").lower().strip()
    company      = job.get("company", "").lower().strip()
    description  = job.get("description", "")

    # Feature 1: salary missing
    salary_missing = 1.0 if not salary_str else 0.0

    # Feature 2: unrealistically high weekly/monthly salary
    salary_too_high = 0.0
    amounts = [a.replace(",", "") for a in re.findall(r'[\d,]+', salary_str) if a.replace(",", "")]
    if amounts:
        max_amt = max(float(a) for a in amounts)
        if (max_amt > 10000 and "week" in salary_str) or \
           (max_amt > 50000 and "month" in salary_str):
            salary_too_high = 1.0

    # Feature 3: vague salary ("unlimited", "uncapped")
    salary_unlimited = 1.0 if ("unlimited" in salary_str or "uncapped" in salary_str) else 0.0

    # Feature 4: personal email domain
    email_personal = 0.0
    if email:
        domain = email.split("@")[-1].lower() if "@" in email else ""
        if any(d in domain for d in SUSPICIOUS_DOMAINS):
            email_personal = 1.0
    elif re.search(r'@(gmail|yahoo|hotmail|outlook)\.', description, re.IGNORECASE):
        email_personal = 1.0

    # Feature 5: location missing or vague
    location_missing = 1.0 if (not location or location in ("anywhere", "any location")) else 0.0

    # Feature 6: company name missing or very short
    company_short = 1.0 if (not company or len(company) < 3) else 0.0

    features = np.array([[salary_missing, salary_too_high, salary_unlimited,
                          email_personal, location_missing, company_short]])
    flags_raw = {
        "salary_missing":   bool(salary_missing),
        "salary_too_high":  bool(salary_too_high),
        "salary_unlimited": bool(salary_unlimited),
        "email_personal":   bool(email_personal),
        "location_missing": bool(location_missing),
        "company_short":    bool(company_short),
    }
    return features, flags_raw


def run_metadata_model(job: dict) -> MetadataModelResult:
    """
    Metadata Neural Network — Model 3 (Real ML Version)
    Uses Random Forest trained on structured job metadata features.

    Args:
        job: dict with keys: salary, email, location, company, description

    Returns:
        MetadataModelResult with score and individual field flags
    """
    features, flags_raw = _extract_metadata_features(job)

    proba = _model.predict_proba(features)[0]  # [legit_prob, fraud_prob]
    fraud_prob = float(proba[1])
    score = int(round(fraud_prob * 100))

    # Build human-readable flags
    flags = []
    salary_flag = email_flag = location_flag = company_flag = False

    if flags_raw["salary_missing"]:
        salary_flag = True
        flags.append("No salary information provided")
    if flags_raw["salary_too_high"]:
        salary_flag = True
        flags.append("Unrealistically high salary claim")
    if flags_raw["salary_unlimited"]:
        salary_flag = True
        flags.append("Vague 'unlimited earnings' salary claim")
    if flags_raw["email_personal"]:
        email_flag = True
        flags.append("Contact email uses a personal domain (gmail/yahoo/hotmail)")
    if flags_raw["location_missing"]:
        location_flag = True
        flags.append("No specific location or vague location provided")
    if flags_raw["company_short"]:
        company_flag = True
        flags.append("Company name is missing or suspiciously short")

    return MetadataModelResult(
        score=min(100, max(0, score)),
        flags=flags,
        fraud_probability=round(fraud_prob, 4),
        salary_flag=salary_flag,
        email_flag=email_flag,
        location_flag=location_flag,
        company_flag=company_flag,
    )


# ============================================================
# STANDALONE RUNNER
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM METADATA (personal email + unrealistic salary)",
            "job": {
                "title": "Data Entry",
                "company": "XY",
                "salary": "$15,000 per week",
                "email": "recruiter@gmail.com",
                "location": "anywhere",
                "description": "Contact us at jobs@yahoo.com",
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
                "description": "Please apply through our official careers portal.",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   Metadata Neural Network — Real ML Standalone Runner")
    print("   (Random Forest Classifier | scikit-learn)")
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
