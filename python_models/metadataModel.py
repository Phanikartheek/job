# ============================================================
# MODEL 3: Metadata Neural Network (Python Version)
# Analyzes structured metadata: salary, email, location, company.
# Run standalone:  python python_models/metadataModel.py
# ============================================================

import re
from dataclasses import dataclass
from typing import List


SUSPICIOUS_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]


@dataclass
class MetadataModelResult:
    score: int
    flags: List[str]
    model_name: str = "Metadata Neural Network"
    salary_flag: bool = False
    email_flag: bool = False
    location_flag: bool = False
    company_flag: bool = False


def run_metadata_model(job: dict) -> MetadataModelResult:
    """
    Metadata Neural Network — Model 3
    Analyzes non-text structured fields:
    - Salary range plausibility
    - Email domain legitimacy
    - Location specificity
    - Company name validity

    Args:
        job: dict with keys: salary, email, location, company, description

    Returns:
        MetadataModelResult with score and individual field flags
    """
    score = 0
    flags = []
    salary_flag = email_flag = location_flag = company_flag = False

    # ---- Salary Analysis ----
    salary_str = job.get("salary", "").lower()
    if not salary_str:
        score += 15
        salary_flag = True
        flags.append("No salary information provided")
    else:
        raw_matches = re.findall(r'\$?[\d,]+', salary_str)
        amounts = [float(m.replace(",", "").replace("$", ""))
                   for m in raw_matches if m.replace(",", "").replace("$", "")]
        if amounts:
            max_amt = max(amounts)
            if max_amt > 10000 and "week" in salary_str:
                score += 35
                salary_flag = True
                flags.append("Unrealistically high weekly salary claim")
            elif max_amt > 50000 and "month" in salary_str:
                score += 25
                salary_flag = True
                flags.append("Unrealistically high monthly salary claim")
        if "unlimited" in salary_str or "uncapped" in salary_str:
            score += 20
            salary_flag = True
            flags.append("Vague 'unlimited earnings' salary claim")

    # ---- Email Domain Analysis ----
    email = job.get("email", "")
    if email:
        domain = email.split("@")[-1].lower() if "@" in email else ""
        if any(d in domain for d in SUSPICIOUS_DOMAINS):
            score += 20
            email_flag = True
            flags.append(f"Contact email uses personal domain: {domain}")
    elif re.search(r'@(gmail|yahoo|hotmail|outlook)\.', job.get("description", ""), re.IGNORECASE):
        score += 15
        email_flag = True
        flags.append("Personal email domain found in job description")

    # ---- Location Analysis ----
    location = job.get("location", "").lower().strip()
    if not location or location in ("anywhere", "any location"):
        score += 10
        location_flag = True
        flags.append("No specific location or vague location provided")

    # ---- Company Name Analysis ----
    company = job.get("company", "").lower().strip()
    if not company or len(company) < 3:
        score += 15
        company_flag = True
        flags.append("Company name is missing or suspiciously short")

    score = max(0, min(100, score))

    return MetadataModelResult(
        score=score,
        flags=flags,
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
    print("   Metadata Neural Network — Python Standalone Runner")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_metadata_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model         : {result.model_name}")
        print(f"  Score         : {result.score}/100")
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

    print("✅ metadataModel.py ran successfully.\n")
