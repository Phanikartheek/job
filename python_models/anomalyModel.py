# ============================================================
# MODEL 2: Isolation Forest Anomaly Detector — REAL ML VERSION
# Uses scikit-learn IsolationForest trained on structural features.
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
    anomalies_found: List[str] = field(default_factory=list)


ANOMALY_MESSAGES = {
    "JOB_TITLE_DESCRIPTION_MISMATCH":  "Job title and description appear mismatched",
    "EXPERIENCE_SALARY_CONTRADICTION": "Contradiction: 'no experience required' with unusually high salary",
    "TITLE_TOO_SHORT":                 "Job title is unusually short",
    "UPFRONT_PAYMENT_REQUIRED":        "Upfront payment requirement detected — strong fraud signal",
    "MESSAGING_APP_ONLY_CONTACT":      "Communication restricted to messaging apps only",
    "STRUCTURAL_ANOMALY":              "ML Isolation Forest detected structural anomaly in this posting",
}


def _extract_features(job: dict) -> np.ndarray:
    """Extract 7 structural features from job dict for Isolation Forest."""
    text = " ".join(filter(None, [
        job.get("title", ""),
        job.get("description", ""),
        job.get("requirements", ""),
    ]))
    text_lower = text.lower()
    desc = job.get("description", "")

    text_len      = min(len(desc), 800)
    caps_ratio    = len(re.findall(r'[A-Z]', text)) / max(len(text), 1)
    digit_ratio   = len(re.findall(r'\d', text)) / max(len(text), 1)

    upfront_pay   = 1.0 if re.search(
        r'(pay|fee|deposit|investment).{0,30}(start|begin|join)', text_lower) else 0.0
    msg_app_only  = 1.0 if re.search(
        r'(whatsapp|telegram|wechat|signal).{0,20}(only|contact|reach)', text_lower) else 0.0
    guaranteed    = 1.0 if "guaranteed" in text_lower or "uncapped" in text_lower else 0.0

    salary_str    = job.get("salary", "").lower()
    amounts       = [a.replace(",", "") for a in re.findall(r'[\d,]+', salary_str) if a.replace(",", "")]
    salary_high   = 0.0
    if amounts:
        max_amt = max(float(a) for a in amounts)
        if max_amt > 5000 and "week" in salary_str:
            salary_high = 1.0

    return np.array([[text_len, caps_ratio, digit_ratio,
                      upfront_pay, msg_app_only, guaranteed, salary_high]])


def run_anomaly_model(job: dict) -> AnomalyModelResult:
    """
    Isolation Forest Anomaly Detector — Model 2 (Real ML Version)
    Uses scikit-learn IsolationForest to detect structural anomalies.

    Args:
        job: dict with keys: title, description, requirements, salary

    Returns:
        AnomalyModelResult with score (0-100) and anomalies list
    """
    features = _extract_features(job)

    # Isolation Forest: decision_function returns negative for anomalies
    raw_score = float(_model.decision_function(features)[0])
    # Convert: more negative = more anomalous → higher fraud score
    # Typical range: -0.5 to +0.5; we map to 0-100
    fraud_score = int(round(max(0, min(100, (-raw_score + 0.3) * 130))))

    anomalies_found = []
    text = " ".join(filter(None, [
        job.get("title", ""), job.get("description", ""), job.get("requirements", "")
    ])).lower()
    title = job.get("title", "").lower()

    if "data entry" in title and "sales" in text:
        anomalies_found.append("JOB_TITLE_DESCRIPTION_MISMATCH")
    if "no experience" in text and "high salary" in text:
        anomalies_found.append("EXPERIENCE_SALARY_CONTRADICTION")
    if len(job.get("title", "")) < 5:
        anomalies_found.append("TITLE_TOO_SHORT")
    if re.search(r'(pay|fee|deposit|investment).{0,30}(start|begin|join)', text):
        anomalies_found.append("UPFRONT_PAYMENT_REQUIRED")
    if re.search(r'(whatsapp|telegram|wechat|signal).{0,20}(only|contact|reach)', text):
        anomalies_found.append("MESSAGING_APP_ONLY_CONTACT")

    # If Isolation Forest says anomalous but no explicit rule fired, add ML flag
    if fraud_score > 50 and not anomalies_found:
        anomalies_found.append("STRUCTURAL_ANOMALY")

    flags = [ANOMALY_MESSAGES[a] for a in anomalies_found]

    return AnomalyModelResult(
        score=min(100, max(0, fraud_score)),
        flags=flags,
        anomaly_score_raw=round(raw_score, 4),
        anomalies_found=anomalies_found,
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
                "description": "Join our engineering team working on scalable systems. Interview process includes technical assessment and HR rounds. We offer competitive salary and career growth.",
                "requirements": "3+ years backend experience.",
                "salary": "$110,000/year",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   Isolation Forest Anomaly Detector — Real ML Runner")
    print("   (scikit-learn IsolationForest | Structural Features)")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_anomaly_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model       : {result.model_name}")
        print(f"  Score       : {result.score}/100")
        print(f"  Raw Score   : {result.anomaly_score_raw} (negative = anomalous)")
        if result.anomalies_found:
            print(f"  Anomalies   : {', '.join(result.anomalies_found)}")
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No structural anomalies detected")
        print("-" * 60 + "\n")

    print("✅ anomalyModel.py (ML) ran successfully.\n")
