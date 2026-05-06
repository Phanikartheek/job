"""
RecruitGuard — Demo Examples API
Pre-loaded example job postings for instant testing.
"""

from flask import Blueprint, jsonify

demo_bp = Blueprint('demo', __name__)

DEMO_EXAMPLES = [
    {
        "id": "demo-scam-obvious",
        "label": "🔴 Obvious Scam",
        "category": "FRAUDULENT",
        "job": {
            "title": "Data Entry Agent — Earn $5000/Week",
            "company": "FastCash Group",
            "description": "No experience required. Work from home and earn $5000 per week guaranteed. Same day pay. WhatsApp only for contact. Send $50 registration fee to begin. No interview needed. Unlimited income potential.",
            "requirements": "No skills needed. Training provided free.",
            "salary": "$5000/week",
            "location": "Anywhere",
            "email": "hiring@gmail.com",
        },
    },
    {
        "id": "demo-scam-subtle",
        "label": "🟠 Subtle Scam",
        "category": "SUSPICIOUS",
        "job": {
            "title": "Marketing Coordinator",
            "company": "Global Solutions",
            "description": "Exciting opportunity for a marketing coordinator. We are a fast-growing startup looking for motivated individuals. Work remotely from anywhere. Flexible hours. Earn between $3000-$8000 monthly depending on performance. Small processing fee required for background check. Contact us via Telegram for more details.",
            "requirements": "No specific qualifications needed.",
            "salary": "$3000-$8000/month",
            "location": "Remote",
            "email": "hr.globalsolutions@yahoo.com",
        },
    },
    {
        "id": "demo-legit-tech",
        "label": "🟢 Legitimate Tech Job",
        "category": "LEGITIMATE",
        "job": {
            "title": "Senior Software Engineer",
            "company": "Google LLC",
            "description": "We are looking for an experienced software engineer to join our Cloud Platform team in Bangalore. You will work on designing and building scalable distributed systems using Go and Python. Our team values collaboration, code quality, and continuous learning. We offer competitive salary, health insurance, 401k matching, equity (RSUs), paid time off, and career growth opportunities. Interview process includes phone screen, technical assessment, and on-site rounds.",
            "requirements": "5+ years of experience in Python or Go. Bachelor's degree in Computer Science or related field. Experience with distributed systems and cloud infrastructure. Strong problem-solving and communication skills.",
            "salary": "$150,000/year",
            "location": "Bangalore, India",
            "email": "careers@google.com",
        },
    },
    {
        "id": "demo-legit-govt",
        "label": "🟢 Legitimate Government Job",
        "category": "LEGITIMATE",
        "job": {
            "title": "Administrative Officer — Grade II",
            "company": "Ministry of Electronics and IT, Government of India",
            "description": "Applications are invited for the post of Administrative Officer Grade II in the Ministry of Electronics and Information Technology. The selected candidate will be responsible for managing departmental correspondence, budget coordination, and policy implementation support. This is a permanent position with all central government benefits including pension, medical coverage, housing allowance, and annual increments as per 7th Pay Commission.",
            "requirements": "Bachelor's degree from recognized university. Minimum 3 years of administrative experience. Knowledge of government procedures and office management. Proficiency in Hindi and English. Age limit: 25-35 years.",
            "salary": "₹56,100 - ₹1,77,500 per month (Level 10)",
            "location": "New Delhi, India",
            "email": "recruitment@meity.gov.in",
        },
    },
    {
        "id": "demo-borderline",
        "label": "🟡 Borderline Case",
        "category": "UNCERTAIN",
        "job": {
            "title": "Sales Executive",
            "company": "FastGrow Inc",
            "description": "Immediate start required. We are a rapidly growing company seeking sales executives. Commission-based compensation with uncapped earnings potential. Be your own boss. Work from home option available. Top performers earn over $10,000 monthly. No cold calling — we provide qualified leads.",
            "requirements": "No experience required. Must have own laptop and internet connection.",
            "salary": "Commission based",
            "location": "Remote",
            "email": "sales@fastgrow.io",
        },
    },
]


@demo_bp.route('/examples', methods=['GET'])
def get_demo_examples():
    """Return pre-loaded demo job postings for instant testing."""
    return jsonify({
        "status": "success",
        "count": len(DEMO_EXAMPLES),
        "examples": DEMO_EXAMPLES,
    })


@demo_bp.route('/examples/<example_id>', methods=['GET'])
def get_demo_example(example_id):
    """Return a specific demo example by ID."""
    for ex in DEMO_EXAMPLES:
        if ex["id"] == example_id:
            return jsonify({"status": "success", "example": ex})
    return jsonify({"error": f"Example '{example_id}' not found"}), 404
