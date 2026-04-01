# ============================================================
# MODEL 2: Isolation Forest Anomaly Detector — REAL ML VERSION
# Trained on 17,880 real EMSCAD job postings (structural features).
# Uses scikit-learn IsolationForest on 7 structural features.
#
# Run standalone:  python python_models/anomalyModel.py
# NOTE: Run train_models.py first to generate anomaly_model.pkl
# ============================================================

import os
import re
import sys
import joblib
import numpy as np
from dataclasses import dataclass, field
from typing import List

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "anomaly_model.pkl")

# ---- Auto-train if model not found ----
def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("  [anomalyModel] Model not found. Running train_models.py automatically...")
        import subprocess
        train_script = os.path.join(os.path.dirname(__file__), "train_models.py")
        subprocess.run([sys.executable, train_script], check=True)

_ensure_model()
_model = joblib.load(MODEL_PATH)


@dataclass
class AnomalyModelResult:
    score: int
    flags: List[str]
    model_name: str = "Isolation Forest Anomaly Detector (ML)"
    anomaly_score_raw: float = 0.0
    is_anomaly: bool = False
    anomalies_found: List[str] = field(default_factory=list)
    anomaly_indicators: List[str] = field(default_factory=list)


ANOMALY_MESSAGES = {
    "SHORT_DESCRIPTION":               "Job description is unusually short (common in fraud postings)",
    "MISSING_REQUIREMENTS":            "No requirements listed — legitimate jobs almost always specify requirements",
    "MISSING_COMPANY_INFO":            "No company profile or name provided",
    "TITLE_TOO_SHORT":                 "Job title is unusually short",
    "UPFRONT_PAYMENT_REQUIRED":        "Upfront payment requirement detected — strong fraud signal",
    "MESSAGING_APP_ONLY_CONTACT":      "Communication restricted to messaging apps only",
    "STRUCTURAL_ANOMALY":              "ML Isolation Forest detected structural anomaly in this posting",
    "HIGH_CAPS_RATIO":                 "Excessive capitalization detected in posting",
}


def _extract_features(job: dict) -> np.ndarray:
    """
    Extract 7 structural features for Isolation Forest.
    These match the features used during EMSCAD training.

    Features:
      1. description_length   — length of description (capped at 5000)
      2. title_length         — length of job title
      3. caps_ratio           — ratio of uppercase letters in title+description
      4. digit_ratio          — ratio of digits in title+description
      5. has_salary           — whether salary info is provided
      6. has_company_profile  — whether company info is provided
      7. requirements_length  — length of requirements text
    """
    title = job.get("title", "")
    desc = job.get("description", "")
    reqs = job.get("requirements", "")
    salary = job.get("salary", "") or job.get("salary_range", "")
    company = job.get("company", "") or job.get("company_profile", "")

    text = title + " " + desc

    description_length   = min(len(desc), 5000)
    title_length         = len(title)
    caps_ratio           = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    digit_ratio          = sum(1 for c in text if c.isdigit()) / max(len(text), 1)
    has_salary           = 1.0 if salary.strip() else 0.0
    has_company_profile  = 1.0 if company.strip() else 0.0
    requirements_length  = len(reqs)

    return np.array([[description_length, title_length, caps_ratio, digit_ratio,
                      has_salary, has_company_profile, requirements_length]])


def run_anomaly_model(job: dict) -> AnomalyModelResult:
    """
    Isolation Forest Anomaly Detector — Model 2 (Real ML Version)
    Trained on structural features from 17,880 real EMSCAD job postings.

    Args:
        job: dict with keys: title, description, requirements, salary, company

    Returns:
        AnomalyModelResult with score (0-100) and anomalies list
    """
    features = _extract_features(job)

    # Isolation Forest: decision_function returns negative for anomalies
    raw_score = float(_model.decision_function(features)[0])
    # Convert: more negative = more anomalous → higher fraud score
    fraud_score = int(round(max(0, min(100, (-raw_score + 0.3) * 130))))

    anomalies_found = []
    desc = job.get("description", "")
    title = job.get("title", "")
    reqs = job.get("requirements", "")
    company = job.get("company", "") or job.get("company_profile", "")
    text_lower = (title + " " + desc + " " + reqs).lower()

    # Rule-based anomaly flags (on top of ML score)
    if len(desc) < 100:
        anomalies_found.append("SHORT_DESCRIPTION")
    if not reqs.strip():
        anomalies_found.append("MISSING_REQUIREMENTS")
    if not company.strip():
        anomalies_found.append("MISSING_COMPANY_INFO")
    if len(title) < 5:
        anomalies_found.append("TITLE_TOO_SHORT")
    if re.search(r'(pay|fee|deposit|investment).{0,30}(start|begin|join)', text_lower):
        anomalies_found.append("UPFRONT_PAYMENT_REQUIRED")
    if re.search(r'(whatsapp|telegram|wechat|signal).{0,20}(only|contact|reach)', text_lower):
        anomalies_found.append("MESSAGING_APP_ONLY_CONTACT")

    # Caps check
    text = title + " " + desc
    if len(text) > 0 and sum(1 for c in text if c.isupper()) / len(text) > 0.15:
        anomalies_found.append("HIGH_CAPS_RATIO")

    # If Isolation Forest says anomalous but no explicit rule fired, add ML flag
    if fraud_score > 50 and not anomalies_found:
        anomalies_found.append("STRUCTURAL_ANOMALY")

    flags = [ANOMALY_MESSAGES.get(a, a) for a in anomalies_found]

    return AnomalyModelResult(
        score=min(100, max(0, fraud_score)),
        flags=flags,
        anomaly_score_raw=round(raw_score, 4),
        is_anomaly=fraud_score >= 50,
        anomalies_found=anomalies_found,
        anomaly_indicators=anomalies_found,
    )


# ============================================================
# STANDALONE RUNNER
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM JOB (upfront payment + messaging app only)",
            "job": {
                "title": "Job",
                "description": "Pay a deposit to begin. WhatsApp only to contact us. No experience required with high salary offered. Guaranteed income weekly.",
                "requirements": "",
                "salary": "$15,000 per week",
            },
        },
        {
            "label": "🟢 LEGITIMATE JOB (no anomalies)",
            "job": {
                "title": "Backend Engineer",
                "company": "TechCorp",
                "description": "Join our engineering team working on scalable systems. Interview process includes technical assessment and HR rounds. We offer competitive salary and career growth. Our team values collaboration, mentorship, and professional development. We are looking for experienced engineers to build microservices for our cloud platform.",
                "requirements": "3+ years backend experience in Python, Java, or Go. Experience with distributed systems.",
                "salary": "$110,000/year",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   Isolation Forest Anomaly Detector — Real ML Runner")
    print("   (Trained on 17,880 EMSCAD job postings)")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_anomaly_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model       : {result.model_name}")
        print(f"  Score       : {result.score}/100")
        print(f"  Raw Score   : {result.anomaly_score_raw} (negative = anomalous)")
        print(f"  Is Anomaly  : {result.is_anomaly}")
        if result.anomalies_found:
            print(f"  Anomalies   : {', '.join(result.anomalies_found)}")
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No structural anomalies detected")
        print("-" * 60 + "\n")

    print("✅ anomalyModel.py (ML) ran successfully.\n")
