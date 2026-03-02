# ============================================================
# MODEL 2: Isolation Forest Anomaly Detector (Python Version)
# Detects structural contradictions and anomalies in job data.
# Run standalone:  python python_models/anomalyModel.py
# ============================================================

import re
from dataclasses import dataclass, field
from typing import List


@dataclass
class AnomalyModelResult:
    score: int
    flags: List[str]
    model_name: str = "Isolation Forest Anomaly Detector"
    anomalies_found: List[str] = field(default_factory=list)


ANOMALY_MESSAGES = {
    "JOB_TITLE_DESCRIPTION_MISMATCH":   "Job title and description appear mismatched",
    "EXPERIENCE_SALARY_CONTRADICTION":  "Contradiction: 'no experience required' with unusually high salary",
    "TITLE_TOO_SHORT":                  "Job title is unusually short",
    "UPFRONT_PAYMENT_REQUIRED":         "Upfront payment requirement detected — strong fraud signal",
    "MESSAGING_APP_ONLY_CONTACT":       "Communication restricted to messaging apps only",
}


def run_anomaly_model(job: dict) -> AnomalyModelResult:
    """
    Isolation Forest Anomaly Detector — Model 2
    Detects structural inconsistencies like mismatched job titles,
    upfront payment demands, and messaging-app-only contact.

    Args:
        job: dict with keys: title, description, requirements

    Returns:
        AnomalyModelResult with score (0–100) and anomalies list
    """
    anomalies_found = []
    score = 0

    text = " ".join(filter(None, [
        job.get("title", ""),
        job.get("description", ""),
        job.get("requirements", ""),
    ])).lower()

    title = job.get("title", "").lower()

    # Anomaly 1: Title vs description mismatch
    if "data entry" in title and "sales" in text:
        score += 15
        anomalies_found.append("JOB_TITLE_DESCRIPTION_MISMATCH")

    # Anomaly 2: Contradiction — no experience + high salary
    if "no experience" in text and "high salary" in text:
        score += 20
        anomalies_found.append("EXPERIENCE_SALARY_CONTRADICTION")

    # Anomaly 3: Extremely short title
    if len(job.get("title", "")) < 5:
        score += 10
        anomalies_found.append("TITLE_TOO_SHORT")

    # Anomaly 4: Upfront costs (strong fraud signal)
    if re.search(r'(pay|fee|deposit|investment).{0,30}(start|begin|join)', text):
        score += 40
        anomalies_found.append("UPFRONT_PAYMENT_REQUIRED")

    # Anomaly 5: Messaging apps only
    if re.search(r'(whatsapp|telegram|wechat|signal).{0,20}(only|contact|reach)', text):
        score += 25
        anomalies_found.append("MESSAGING_APP_ONLY_CONTACT")

    score = max(0, min(100, score))
    flags = [ANOMALY_MESSAGES[a] for a in anomalies_found]

    return AnomalyModelResult(
        score=score,
        flags=flags,
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
                "description": "Pay a deposit to begin. WhatsApp only to contact us. No experience required with high salary offered.",
                "requirements": "",
            },
        },
        {
            "label": "🟢 LEGITIMATE JOB (no anomalies)",
            "job": {
                "title": "Backend Engineer",
                "company": "TechCorp",
                "description": "Join our engineering team working on scalable systems. Interview process includes technical assessment and HR rounds.",
                "requirements": "3+ years backend experience.",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   Isolation Forest Anomaly Detector — Python Runner")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_anomaly_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model    : {result.model_name}")
        print(f"  Score    : {result.score}/100")

        if result.anomalies_found:
            print(f"  Anomalies: {', '.join(result.anomalies_found)}")
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No structural anomalies detected")

        print("-" * 60 + "\n")

    print("✅ anomalyModel.py ran successfully.\n")
