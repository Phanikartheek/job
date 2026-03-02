# ============================================================
# MAIN ORCHESTRATOR — Full AI Pipeline (Python Version)
# Runs ALL models and produces a complete fraud analysis report.
# Run:  python python_models/run_all.py
#
# Architecture:
#   Combined Content Analyzer (70%)
#     ├── RoBERTa Text Analyzer      (75% of 70%)
#     └── Isolation Forest Detector  (25% of 70%)
#   +
#   Metadata Neural Network          (30%)
# ============================================================

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from textModel     import run_text_model
from anomalyModel  import run_anomaly_model
from metadataModel import run_metadata_model
from contentModel  import run_content_model


def get_risk_level(score: int) -> str:
    if score < 25: return "LOW ✅"
    if score < 50: return "MEDIUM 🟡"
    if score < 75: return "HIGH ⚠️"
    return "CRITICAL 🚨"


def analyze_job(job: dict) -> dict:
    """
    Full fraud analysis pipeline.
    Returns a complete result dict with all model scores.
    """
    content_result  = run_content_model(job)
    metadata_result = run_metadata_model(job)

    final_score = round(0.7 * content_result.score + 0.3 * metadata_result.score)
    final_score = max(0, min(100, final_score))

    all_flags = content_result.flags + metadata_result.flags

    return {
        "final_score":      final_score,
        "risk_level":       get_risk_level(final_score),
        "content_score":    content_result.score,
        "text_sub_score":   content_result.text_sub_score,
        "anomaly_sub_score": content_result.anomaly_sub_score,
        "metadata_score":   metadata_result.score,
        "flags":            all_flags,
        "is_fraud":         final_score >= 50,
    }


def print_report(job: dict, label: str = ""):
    """Prints a formatted fraud analysis report for a job."""
    result = analyze_job(job)

    print(f"\n{'='*62}")
    if label:
        print(f"  {label}")
        print(f"{'='*62}")
    print(f"  Job Title    : {job.get('title', 'N/A')}")
    print(f"  Company      : {job.get('company', 'N/A')}")
    print(f"{'─'*62}")
    print(f"  MODEL SCORES:")
    print(f"    RoBERTa Text Analyzer      : {result['text_sub_score']:>3}/100")
    print(f"    Isolation Forest (Anomaly)  : {result['anomaly_sub_score']:>3}/100")
    print(f"    ─── Combined Content Model  : {result['content_score']:>3}/100  (weight: 70%)")
    print(f"    Metadata Neural Network     : {result['metadata_score']:>3}/100  (weight: 30%)")
    print(f"{'─'*62}")
    print(f"  ★ FINAL FRAUD SCORE : {result['final_score']}/100")
    print(f"  ★ RISK LEVEL        : {result['risk_level']}")
    print(f"  ★ VERDICT           : {'🔴 FRAUD DETECTED' if result['is_fraud'] else '🟢 LIKELY LEGITIMATE'}")
    print(f"{'─'*62}")

    if result["flags"]:
        print(f"  DETECTED FLAGS ({len(result['flags'])}):")
        for flag in result["flags"]:
            print(f"      • {flag}")
    else:
        print("  ✅ No fraud signals detected")

    print(f"{'='*62}\n")


# ============================================================
# TEST CASES — modify these to demo any job in your HOD
# ============================================================

if __name__ == "__main__":
    print("\n" + "█" * 62)
    print("  AI-POWERED RECRUITMENT FRAUD INTELLIGENCE — Python Demo")
    print("  Models: RoBERTa + Isolation Forest + Metadata NN")
    print("█" * 62)

    jobs = [
        {
            "label": "TEST CASE 1: SCAM JOB",
            "job": {
                "title": "Data Entry Agent",
                "company": "FastCash",
                "salary": "$5000 per week",
                "email": "hire@gmail.com",
                "location": "anywhere",
                "description": (
                    "No experience required. Work from home. Earn $ 5000 per week guaranteed. "
                    "Unlimited income. Same day pay. WhatsApp only for contact. "
                    "No interview needed. Pay a deposit fee to begin training. "
                    "Financial freedom awaits you. Be your own boss."
                ),
                "requirements": "No skills needed. Training provided free.",
            },
        },
        {
            "label": "TEST CASE 2: LEGITIMATE JOB",
            "job": {
                "title": "Senior Software Engineer",
                "company": "Microsoft India",
                "salary": "$130,000/year",
                "email": "careers@microsoft.com",
                "location": "Hyderabad, India",
                "description": (
                    "We are looking for a senior engineer to join our cloud platform team. "
                    "You will work in an agile environment with sprint-based delivery. "
                    "We offer competitive salary, health insurance, 401k, equity, stock options, "
                    "paid time off, mentorship programs, and career growth opportunities. "
                    "Performance reviews are conducted bi-annually. Annual leave policy included. "
                    "Collaborative team culture with professional development support."
                ),
                "requirements": "5+ years TypeScript, Python, distributed systems.",
            },
        },
        {
            "label": "TEST CASE 3: BORDERLINE JOB",
            "job": {
                "title": "Marketing Executive",
                "company": "StartupXYZ",
                "salary": "Commission-based, uncapped earnings",
                "email": "jobs@startupxyz.com",
                "location": "Remote",
                "description": (
                    "Immediate start required. Urgent hiring. "
                    "Be your own boss. Financial freedom. Work from home. "
                    "Earn based on performance. No interview process required."
                ),
                "requirements": "No experience required. Enthusiasm is enough.",
            },
        },
    ]

    for item in jobs:
        print_report(item["job"], item["label"])

    print("✅ Full pipeline ran successfully with pure Python.\n")
    print("📌 HOD Note: Each model file can also be run independently:")
    print("   python python_models/textModel.py")
    print("   python python_models/anomalyModel.py")
    print("   python python_models/metadataModel.py")
    print("   python python_models/contentModel.py\n")
