"""
RecruitGuard — Synthetic Dataset Generator
Generates realistic training data that mimics EMSCAD patterns.
95% legitimate, 5% fraudulent — realistic class imbalance.
"""

import os
import json
import random
import csv

random.seed(42)

# ── Fraud Templates ──────────────────────────────────────────
FRAUD_TITLES = [
    "Data Entry Agent", "Online Survey Worker", "Home Based Job",
    "Easy Money Opportunity", "Part Time Worker", "Simple Typing Job",
    "Copy Paste Work", "Ad Posting Job", "Social Media Worker",
    "Virtual Assistant Needed Urgently", "Work From Home Agent",
    "Earn Daily", "Immediate Hiring", "Job Vacancy",
    "SMS Sending Job", "Email Processing Agent", "Form Filling Job",
]

FRAUD_DESCRIPTIONS = [
    "No experience required. Work from home and earn $5000 per week guaranteed. Same day pay. Whatsapp only for contact.",
    "Earn unlimited income from home. No interview needed. Just send your details via Telegram. Registration fee of $50 required.",
    "URGENT HIRING! Make money fast with our simple online tasks. Guaranteed income. Processing fee applies. Contact via WhatsApp.",
    "Easy data entry work. No skills needed. Training provided free. Passive income opportunity. Wire transfer payment weekly.",
    "Be your own boss. Financial freedom guaranteed. Earn from home. Uncapped earnings potential. No experience required at all.",
    "IMMEDIATE START. Earn $3000 weekly. Work from your phone. Send money for materials. No interview process.",
    "Simple copy paste work from home. Earn daily. Contact us on WhatsApp only. Pay a small deposit to begin your training.",
    "Hiring urgently! No qualifications needed. Guaranteed salary of $8000/month. Send your bank details to start.",
    "Online job opportunity. Registration fee required. Unlimited earning potential. Work anytime from anywhere.",
    "Part time job. Earn $500 daily. No experience. Telegram only contact. Withdraw your offer if not interested.",
    "MAKE MONEY ONLINE! Guaranteed income. No investment required except small processing fee. Start earning today.",
    "Data entry from home. Same day payment. WhatsApp only communication. Send $25 registration fee to begin.",
    "URGENT: Hiring now! No skills required. Earn $10000/month. Contact via personal email. No company website.",
    "Simple tasks online. Guaranteed weekly pay of $2000. No interview. Send documents via WhatsApp for verification.",
    "Work from home opportunity. Externship program. Unlimited income. Apply now via Telegram. Fee required.",
]

LEGIT_TITLES = [
    "Senior Software Engineer", "Data Scientist", "Product Manager",
    "Full Stack Developer", "Machine Learning Engineer", "DevOps Engineer",
    "Backend Developer", "Frontend Engineer", "Cloud Architect",
    "QA Engineer", "Technical Lead", "Systems Administrator",
    "Database Administrator", "Security Analyst", "UX Designer",
    "Project Manager", "Business Analyst", "Solutions Architect",
    "Site Reliability Engineer", "Mobile Developer",
]

LEGIT_COMPANIES = [
    "Google LLC", "Microsoft Corporation", "Amazon Web Services",
    "Meta Platforms", "Apple Inc", "Netflix Inc", "Spotify Technology",
    "Salesforce Inc", "Adobe Systems", "Oracle Corporation",
    "IBM Corporation", "Cisco Systems", "Intel Corporation",
    "Accenture", "Infosys Limited", "TCS", "Wipro Limited",
    "HCL Technologies", "Cognizant", "Tech Mahindra",
]

LEGIT_DESCRIPTIONS = [
    "We are looking for an experienced {title} to join our {team} team. You will work on {project} using {tech}. We offer competitive salary, health insurance, 401k matching, paid time off, and career growth opportunities. Our agile environment emphasizes collaboration and mentorship.",
    "Join our growing engineering team as a {title}. You'll be responsible for {responsibility} and work closely with cross-functional teams. Benefits include health insurance, equity, flexible work arrangements, and professional development budget.",
    "We're hiring a {title} to help us build {project}. This role involves {responsibility}. We value diversity and inclusion. Comprehensive benefits package including health coverage, retirement plans, and generous PTO.",
    "{company} is seeking a talented {title} for our {location} office. The ideal candidate will have experience in {tech}. We offer mentorship programs, sprint-based development, and competitive compensation with equity.",
    "Exciting opportunity for a {title} at {company}. Work on cutting-edge {project} with a world-class team. Benefits: health insurance, stock options, remote flexibility, learning stipend, and career growth.",
]

LEGIT_REQUIREMENTS = [
    "5+ years of experience in {tech}. Bachelor's degree in Computer Science or related field. Strong problem-solving skills and team collaboration.",
    "3+ years professional experience. Proficiency in {tech}. Excellent communication skills. Experience with agile methodologies.",
    "Bachelor's or Master's degree required. 4+ years in {tech}. Strong analytical and problem-solving abilities. Team player.",
    "7+ years of industry experience. Expert knowledge of {tech}. Leadership experience preferred. Strong written and verbal communication.",
    "2+ years relevant experience. Knowledge of {tech}. Self-motivated and detail-oriented. Ability to work in a fast-paced environment.",
]

LEGIT_LOCATIONS = [
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
    "Bangalore, India", "Hyderabad, India", "Mumbai, India", "Pune, India",
    "London, UK", "Berlin, Germany", "Toronto, Canada", "Singapore",
    "Remote", "Hybrid - San Jose, CA", "Chicago, IL",
]

TECH_STACKS = [
    "Python, Django, PostgreSQL", "Java, Spring Boot, AWS",
    "React, TypeScript, Node.js", "Python, TensorFlow, Kubernetes",
    "Go, Docker, Kubernetes", "Ruby on Rails, Redis, PostgreSQL",
    "C++, Linux, Embedded Systems", "Swift, iOS, Core Data",
    "Kotlin, Android, Firebase", "Scala, Apache Spark, Hadoop",
]

TEAMS = ["engineering", "platform", "infrastructure", "product", "data", "cloud", "security"]
PROJECTS = ["scalable microservices", "ML pipelines", "cloud infrastructure", "data platform", "mobile applications"]
RESPONSIBILITIES = ["designing and implementing scalable systems", "building ML models for production", "optimizing system performance", "leading technical architecture decisions"]


def generate_fraud_sample():
    """Generate a single fraudulent job posting."""
    title = random.choice(FRAUD_TITLES)
    desc = random.choice(FRAUD_DESCRIPTIONS)
    has_company = random.random() < 0.2  # 80% chance no company
    has_salary = random.random() < 0.3
    has_reqs = random.random() < 0.15

    return {
        "title": title,
        "company": "XYZ Corp" if has_company else "",
        "description": desc,
        "requirements": "No experience needed." if has_reqs else "",
        "salary": "$5000/week" if has_salary else "",
        "location": "Anywhere" if random.random() < 0.5 else "",
        "email": random.choice(["jobs@gmail.com", "hiring@yahoo.com", "work@hotmail.com", ""]),
        "has_company_logo": 0,
        "has_questions": 0,
        "telecommuting": 1 if "home" in desc.lower() else 0,
        "fraudulent": 1,
    }


def generate_legit_sample():
    """Generate a single legitimate job posting."""
    title = random.choice(LEGIT_TITLES)
    company = random.choice(LEGIT_COMPANIES)
    tech = random.choice(TECH_STACKS)
    location = random.choice(LEGIT_LOCATIONS)
    team = random.choice(TEAMS)
    project = random.choice(PROJECTS)
    responsibility = random.choice(RESPONSIBILITIES)

    desc_template = random.choice(LEGIT_DESCRIPTIONS)
    desc = desc_template.format(
        title=title, company=company, tech=tech, location=location,
        team=team, project=project, responsibility=responsibility
    )

    req_template = random.choice(LEGIT_REQUIREMENTS)
    reqs = req_template.format(tech=tech)

    salary_base = random.randint(60, 200)
    salary = f"${salary_base},000/year"

    domain = company.lower().split()[0].replace(",", "")
    email = f"careers@{domain}.com"

    return {
        "title": title,
        "company": company,
        "description": desc,
        "requirements": reqs,
        "salary": salary,
        "location": location,
        "email": email,
        "has_company_logo": 1,
        "has_questions": 1 if random.random() < 0.7 else 0,
        "telecommuting": 1 if "Remote" in location else 0,
        "fraudulent": 0,
    }


def generate_dataset(n_samples=2000, fraud_ratio=0.05):
    """Generate full dataset with realistic class imbalance."""
    n_fraud = int(n_samples * fraud_ratio)
    n_legit = n_samples - n_fraud

    data = []
    for _ in range(n_legit):
        data.append(generate_legit_sample())
    for _ in range(n_fraud):
        data.append(generate_fraud_sample())

    random.shuffle(data)

    print(f"Generated {len(data)} samples: {n_legit} legit ({100-fraud_ratio*100:.0f}%), {n_fraud} fraud ({fraud_ratio*100:.0f}%)")
    return data


def save_dataset(data, output_dir=None):
    """Save dataset as CSV and JSON."""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(output_dir, exist_ok=True)

    # Save CSV
    csv_path = os.path.join(output_dir, "training_dataset.csv")
    fields = list(data[0].keys())
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(data)

    # Save JSON
    json_path = os.path.join(output_dir, "training_dataset.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Saved to: {csv_path}")
    print(f"Saved to: {json_path}")
    return csv_path


if __name__ == "__main__":
    print("=" * 60)
    print("  RecruitGuard — Training Dataset Generator")
    print("=" * 60)
    data = generate_dataset(n_samples=2000, fraud_ratio=0.05)
    save_dataset(data)
    print("\n[SUCCESS] Dataset generation complete.")
