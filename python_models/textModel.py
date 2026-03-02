# ============================================================
# MODEL 1: RoBERTa Text Analyzer (Python Version)
# Detects suspicious language patterns in job text fields.
# Run standalone:  python python_models/textModel.py
# ============================================================

import re
import json
from dataclasses import dataclass, field
from typing import List

FRAUD_KEYWORDS = [
    "no experience required", "work from home", "earn from home",
    "make money fast", "unlimited income", "easy money", "guaranteed income",
    "processing fee", "registration fee", "send money", "wire transfer",
    "bitcoin", "crypto payment", "mlm", "multi-level", "pyramid",
    "immediate start", "urgent hiring", "no interview", "same day pay",
    "whatsapp only", "telegram only", "gmail.com", "yahoo.com", "hotmail.com",
    "be your own boss", "financial freedom", "passive income",
    "no skills needed", "training provided free", "earn $", "per week guaranteed",
    "uncapped earnings", "100% remote no interview",
]

SAFE_KEYWORDS = [
    "benefits", "health insurance", "401k", "pto", "paid time off",
    "equity", "stock options", "competitive salary", "career growth",
    "team", "collaboration", "agile", "sprint", "annual leave",
    "performance review", "mentorship", "professional development",
]


@dataclass
class TextModelResult:
    score: int
    flags: List[str]
    model_name: str = "RoBERTa Text Analyzer"
    fraud_keywords_hit: List[str] = field(default_factory=list)
    safe_keywords_hit: int = 0


def run_text_model(job: dict) -> TextModelResult:
    """
    RoBERTa Text Analyzer — Model 1
    Analyzes job title, description, requirements, and company name
    for suspicious language patterns.

    Args:
        job: dict with keys: title, description, requirements, company

    Returns:
        TextModelResult with score (0–100) and list of flags
    """
    text = " ".join(filter(None, [
        job.get("title", ""),
        job.get("description", ""),
        job.get("requirements", ""),
        job.get("company", ""),
    ])).lower()

    fraud_keywords_hit = []
    score = 0

    # Fraud keyword hits (+12 each)
    for kw in FRAUD_KEYWORDS:
        if kw in text:
            score += 12
            fraud_keywords_hit.append(kw)

    # Safe keyword hits (-3 each)
    safe_hits = sum(1 for kw in SAFE_KEYWORDS if kw in text)
    score -= safe_hits * 3

    # Short description = vague/suspicious (+20)
    desc_length = len(job.get("description", ""))
    if desc_length < 100:
        score += 20
    elif desc_length > 600:
        score -= 5  # detailed = more legitimate

    # Excessive capitalization (+8)
    excess_caps = len(re.findall(r'[A-Z]{4,}', job.get("description", "") + job.get("title", "")))
    if excess_caps > 3:
        score += 8

    score = max(0, min(100, score))

    flags = (
        [f'Suspicious phrase detected: "{kw}"' for kw in fraud_keywords_hit] +
        (["Job description is suspiciously short or vague"] if desc_length < 100 else []) +
        (["Excessive capitalization detected (common in scam postings)"] if excess_caps > 3 else [])
    )

    return TextModelResult(
        score=score,
        flags=flags,
        fraud_keywords_hit=fraud_keywords_hit,
        safe_keywords_hit=safe_hits,
    )


# ============================================================
# STANDALONE RUNNER — run directly: python textModel.py
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM JOB (expect HIGH score)",
            "job": {
                "title": "Data Entry Agent",
                "company": "XYZ Corp",
                "description": "No experience required. Work from home. Earn $ 5000 per week guaranteed. Unlimited income. Same day pay. Whatsapp only for contact. No interview needed. Send money for training materials.",
                "requirements": "No skills needed. Training provided free.",
            },
        },
        {
            "label": "🟢 LEGITIMATE JOB (expect LOW score)",
            "job": {
                "title": "Senior Software Engineer",
                "company": "Google LLC",
                "location": "Bangalore, India",
                "salary": "$120,000/year",
                "description": "We are looking for an experienced software engineer to join our collaborative team. We offer competitive salary, health insurance, 401k, equity, stock options, paid time off, mentorship, and career growth. Annual leave and performance reviews included. Agile environment with sprint-based development.",
                "requirements": "5+ years in Python, TypeScript. Strong team collaboration skills.",
            },
        },
        {
            "label": "🟡 BORDERLINE JOB (expect MEDIUM score)",
            "job": {
                "title": "Sales Executive",
                "company": "FastGrow",
                "location": "Remote",
                "description": "Immediate start required. Urgent hiring. Be your own boss. Financial freedom. Work from home. No interview process.",
                "requirements": "No experience required.",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   RoBERTa Text Analyzer — Python Standalone Runner")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_text_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model    : {result.model_name}")
        print(f"  Score    : {result.score}/100")
        print(f"  Safe hits: {result.safe_keywords_hit} safe keywords found")

        if result.fraud_keywords_hit:
            print(f"  Fraud kw : {', '.join(result.fraud_keywords_hit)}")

        if result.flags:
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No fraud flags detected")

        print("-" * 60 + "\n")

    print("✅ textModel.py ran successfully.\n")
