# ============================================================
# Flask API Backend — Job Fraud Detection
# Serves the 4 Python ML models via REST endpoints.
#
# Endpoints:
#   GET  /api/health    — health check
#   POST /api/analyze   — run all 4 models and return result
#
# Run: python flask_backend/app.py
# Or:  cd flask_backend && python app.py
# ============================================================

import sys
import os

# Ensure python_models can be imported regardless of cwd
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_models'))

from flask import Flask, request, jsonify
from flask_cors import CORS

from textModel     import run_text_model
from anomalyModel  import run_anomaly_model
from metadataModel import run_metadata_model
from contentModel  import run_content_model

app = Flask(__name__)

# Allow requests from Vite dev server (localhost:8080 or :5173)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080", "http://127.0.0.1:5173"]}})


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "models": ["text", "anomaly", "metadata", "content"],
        "version": "1.0.0"
    })


# ============================================================
# MAIN ANALYSIS ENDPOINT
# ============================================================

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    POST /api/analyze

    Request body (JSON):
    {
        "title":        "Job Title",
        "company":      "Company Name",
        "location":     "City, Country",
        "salary":       "$50,000/year",
        "description":  "Full job description text...",
        "requirements": "Skills and qualifications...",
        "email":        "recruiter@company.com"   (optional)
    }

    Response (JSON):
    {
        "isFake":        true/false,
        "confidence":    0-100,
        "riskLevel":     "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "factors":       ["list of fraud flags"],
        "textScore":     0-100,
        "anomalyScore":  0-100,
        "metadataScore": 0-100,
        "contentScore":  0-100,
        "finalScore":    0-100,
        "llmExplanation": "Human-readable explanation"
    }
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    job = request.get_json()

    # Validate required fields
    required = ["title", "company", "description"]
    missing = [f for f in required if not job.get(f, "").strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        # Run all 4 models
        text_result    = run_text_model(job)
        anomaly_result = run_anomaly_model(job)
        metadata_result= run_metadata_model(job)
        content_result = run_content_model(job)   # fuses text + anomaly (75%/25%)

        # Final score: 70% content + 30% metadata (mirrors TS mlEngine)
        final_score = round(0.7 * content_result.score + 0.3 * metadata_result.score)
        final_score = max(0, min(100, final_score))

        # Risk level
        if final_score < 25:
            risk_level = "LOW"
        elif final_score < 50:
            risk_level = "MEDIUM"
        elif final_score < 75:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        # Is flagged as fraud?
        is_fake = final_score >= 50

        # Combine all flags (deduplicated)
        all_flags = list(dict.fromkeys(content_result.flags + metadata_result.flags))

        # Human-readable explanation
        company = job.get("company", "this company")
        title   = job.get("title",   "this position")
        llm_explanation = _generate_explanation(
            title, company, risk_level, final_score,
            content_result.score, metadata_result.score, all_flags
        )

        return jsonify({
            "isFake":         is_fake,
            "confidence":     final_score,
            "riskLevel":      risk_level,
            "factors":        all_flags,
            "textScore":      text_result.score,
            "anomalyScore":   anomaly_result.score,
            "metadataScore":  metadata_result.score,
            "contentScore":   content_result.score,
            "finalScore":     final_score,
            "llmExplanation": llm_explanation,
            "modelDetails": {
                "text": {
                    "score": text_result.score,
                    "fraudKeywordsHit": text_result.fraud_keywords_hit,
                    "safeKeywordsHit":  text_result.safe_keywords_hit,
                },
                "anomaly": {
                    "score":         anomaly_result.score,
                    "anomaliesFound": anomaly_result.anomalies_found,
                },
                "metadata": {
                    "score":        metadata_result.score,
                    "salaryFlag":   metadata_result.salary_flag,
                    "emailFlag":    metadata_result.email_flag,
                    "locationFlag": metadata_result.location_flag,
                    "companyFlag":  metadata_result.company_flag,
                },
                "content": {
                    "score":           content_result.score,
                    "textSubScore":    content_result.text_sub_score,
                    "anomalySubScore": content_result.anomaly_sub_score,
                }
            }
        })

    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


# ============================================================
# EXPLANATION GENERATOR
# ============================================================

def _generate_explanation(title, company, risk, final, content, metadata, flags):
    if risk == "LOW":
        return (
            f'The job posting for "{title}" at {company} shows low fraud risk. '
            f'Content Model: {content}/100 · Metadata NN: {metadata}/100 · '
            f'Final Score: {final}/100 — SAFE. Verify company website before applying.'
        )
    if risk == "MEDIUM":
        top = flags[0] if flags else "some ambiguous signals"
        return (
            f'Moderate fraud risk for "{title}" at {company}. Primary concern: {top}. '
            f'Content: {content}/100 · Metadata NN: {metadata}/100 · Final: {final}/100. '
            f'Verify employer identity before sharing personal information.'
        )
    if risk == "HIGH":
        return (
            f'⚠️ HIGH FRAUD RISK for "{title}" at {company}. '
            f'Content: {content}/100 · Metadata NN: {metadata}/100 · Final: {final}/100. '
            f'Red flags: {"; ".join(flags[:3])}. Do NOT apply or send money.'
        )
    return (
        f'🚨 CRITICAL FRAUD ALERT for "{title}" at {company}. '
        f'Content: {content}/100 · Metadata: {metadata}/100 · Final: {final}/100. '
        f'Indicators: {"; ".join(flags[:4])}. Block and report the sender immediately.'
    )


# ============================================================
# START SERVER
# ============================================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("   Job Fraud Detection — Flask API Server")
    print("=" * 60)
    print("  Endpoints:")
    print("    GET  http://localhost:5000/api/health")
    print("    POST http://localhost:5000/api/analyze")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
