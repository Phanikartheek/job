# ============================================================
# Flask API Backend — Job Fraud Detection
# Serves the 5 ML models via REST endpoints (Text + Anomaly + Metadata + XGBoost + Fusion).
#
# Endpoints:
#   GET  /api/health    — health check
#   POST /api/analyze   — run all models and return result
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

from textModel      import run_text_model
from anomalyModel   import run_anomaly_model
from metadataModel  import run_metadata_model
from contentModel   import run_content_model
from xgboostModel   import run_xgboost_model

app = Flask(__name__)

# Allow requests from Vite dev server (localhost:8080 or :5173)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080", "http://127.0.0.1:5173"]}})


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route('/api/health', methods=['GET'])
def health():
    """
    GET /api/health
    Tests all 4 models with a dummy job and reports per-model status.
    """
    dummy_job = {
        "title":       "Software Engineer",
        "company":     "Test Corp",
        "location":    "New York, USA",
        "salary":      "$80,000/year",
        "description": "We are looking for a skilled software engineer.",
        "requirements": "Python, JavaScript, 3 years experience.",
        "email":       "hr@testcorp.com"
    }

    model_status = {}
    all_ok = True

    for name, fn, extra in [
        ("text",     lambda j: run_text_model(j),     None),
        ("anomaly",  lambda j: run_anomaly_model(j),  None),
        ("metadata", lambda j: run_metadata_model(j), None),
        ("content",  lambda j: run_content_model(j),  None),
        ("xgboost",  None,                            None),
    ]:
        try:
            if name == "xgboost":
                # XGBoost needs scores from the other models
                t  = run_text_model(dummy_job)
                a  = run_anomaly_model(dummy_job)
                m  = run_metadata_model(dummy_job)
                result = run_xgboost_model(t.score, a.score, m.score)
            else:
                result = fn(dummy_job)
            model_status[name] = {
                "status": "ok",
                "score":  result.score
            }
        except Exception as e:
            model_status[name] = {
                "status": "error",
                "error":  str(e)
            }
            all_ok = False

    return jsonify({
        "status":  "ok" if all_ok else "degraded",
        "version": "1.0.0",
        "models":  model_status
    }), (200 if all_ok else 500)


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
        # Run all models
        text_result     = run_text_model(job)
        anomaly_result  = run_anomaly_model(job)
        metadata_result = run_metadata_model(job)
        content_result  = run_content_model(job)   # fuses text + anomaly (75%/25%)
        xgboost_result  = run_xgboost_model(
            text_result.score, anomaly_result.score, metadata_result.score
        )

        # Final score: 40% content + 30% metadata + 30% xgboost
        final_score = round(
            0.40 * content_result.score +
            0.30 * metadata_result.score +
            0.30 * xgboost_result.score
        )
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

        all_flags = list(dict.fromkeys(
            content_result.flags + metadata_result.flags + xgboost_result.flags
        ))

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
            "xgboostScore":   xgboost_result.score,
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
                },
                "xgboost": {
                    "score":            xgboost_result.score,
                    "fraudProbability": xgboost_result.fraud_probability,
                }
            }
        })

    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


# ============================================================
# BULK ANALYSIS ENDPOINT — for large datasets (up to 20,000 rows)
# ============================================================

@app.route('/api/analyze-bulk', methods=['POST'])
def analyze_bulk():
    """
    POST /api/analyze-bulk

    Request body (JSON):
    {
        "jobs": [
            { "title": "...", "company": "...", "description": "...", ... },
            ...
        ]
    }

    Response (JSON):
    {
        "results": [
            {
                "id": 1,
                "title": "...",
                "company": "...",
                "finalScore": 0-100,
                "riskLevel": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
                "textScore": 0-100,
                "anomalyScore": 0-100,
                "metadataScore": 0-100,
                "factors": [...],
                "llmExplanation": "..."
            },
            ...
        ],
        "total": N,
        "fraudCount": N,
        "safeCount": N
    }
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    data = request.get_json()
    jobs = data.get("jobs", [])

    if not jobs or not isinstance(jobs, list):
        return jsonify({"error": "Request must have a 'jobs' array"}), 400

    MAX_BULK = 20000
    if len(jobs) > MAX_BULK:
        return jsonify({"error": f"Too many rows. Max is {MAX_BULK}, got {len(jobs)}."}), 400

    results = []
    fraud_count = 0

    for i, job in enumerate(jobs):
        try:
            content_result  = run_content_model(job)
            metadata_result = run_metadata_model(job)
            text_result     = run_text_model(job)
            anomaly_result  = run_anomaly_model(job)
            xgboost_result  = run_xgboost_model(
                text_result.score, anomaly_result.score, metadata_result.score
            )

            final_score = max(0, min(100, round(
                0.40 * content_result.score +
                0.30 * metadata_result.score +
                0.30 * xgboost_result.score
            )))

            if final_score < 25:   risk_level = "LOW"
            elif final_score < 50: risk_level = "MEDIUM"
            elif final_score < 75: risk_level = "HIGH"
            else:                  risk_level = "CRITICAL"

            is_fraud = final_score >= 50
            if is_fraud:
                fraud_count += 1

            all_flags = list(dict.fromkeys(content_result.flags + metadata_result.flags))
            llm_explanation = _generate_explanation(
                job.get("title", "this position"),
                job.get("company", "this company"),
                risk_level, final_score,
                content_result.score, metadata_result.score, all_flags
            )

            results.append({
                "id":             i + 1,
                "title":          job.get("title", f"Row {i+1}"),
                "company":        job.get("company", "Unknown"),
                "location":       job.get("location", ""),
                "salary":         job.get("salary", ""),
                "textScore":      text_result.score,
                "anomalyScore":   anomaly_result.score,
                "metadataScore":  metadata_result.score,
                "finalScore":     final_score,
                "riskLevel":      risk_level,
                "factors":        all_flags,
                "llmExplanation": llm_explanation,
            })

        except Exception as e:
            results.append({
                "id":       i + 1,
                "title":    job.get("title", f"Row {i+1}"),
                "company":  job.get("company", "Unknown"),
                "error":    str(e),
                "finalScore": 0,
                "riskLevel":  "LOW",
            })

    return jsonify({
        "results":     results,
        "total":       len(results),
        "fraudCount":  fraud_count,
        "safeCount":   len(results) - fraud_count,
    })


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
    import os
    port = int(os.environ.get('PORT', 5000))
    print("\n" + "=" * 60)
    print("   Job Fraud Detection — Flask API Server")
    print("=" * 60)
    print(f"  Running on port: {port}")
    print("  Endpoints:")
    print(f"    GET  http://0.0.0.0:{port}/api/health")
    print(f"    POST http://0.0.0.0:{port}/api/analyze")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=port, debug=False)
