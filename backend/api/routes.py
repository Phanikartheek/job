from flask import Blueprint, request, jsonify
from datetime import datetime

# Import core engines and logic
from core.engines.textModel import run_text_model
from core.engines.anomalyModel import run_anomaly_model
from core.engines.metadataModel import run_metadata_model, _extract_metadata_features
from core.engines.contentModel import run_content_model
from core.engines.xgboostModel import run_xgboost_model
from core.logic.scoring_logic import ScoringLogic
from core.engines.explainability import explain_text_model, explain_metadata_model

api_bp = Blueprint('api', __name__)

# Initialize Scoring Engine
scoring = ScoringLogic(content_weight=0.7, metadata_weight=0.3)

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'system': 'RecruitGuard - Modular Engine'
    })

@api_bp.route('/analyze', methods=['POST'])
def analyze_job():
    """Main analysis endpoint using the 70/30 weighted formula"""
    try:
        data = request.json or {}
        
        job = {
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "requirements": data.get("requirements", ""),
            "company": data.get("company", ""),
            "salary": data.get("salary", ""),
            "email": data.get("email", ""),
            "location": data.get("location", "")
        }
        
        if not job.get("description"):
            return jsonify({'error': 'Job description is required'}), 400
        
        # Run ML Components
        text_result = run_text_model(job)
        anomaly_result = run_anomaly_model(job)
        metadata_result = run_metadata_model(job)
        content_result = run_content_model(job)
        
        # Apply Scoring Logic (70/30 formula)
        final_score = scoring.calculate_final_score(
            content_score=content_result.score,
            metadata_score=metadata_result.score
        )
        risk_level = scoring.determine_risk_level(final_score)

        # ML models make the prediction — no hardcoded overrides
        
        # Collect and humanize flags (The Reasoning Engine)
        all_flags = []
        all_flags.extend(text_result.flags or [])
        all_flags.extend(anomaly_result.flags or [])
        all_flags.extend(metadata_result.flags or [])
        
        insights = scoring.get_detection_insights(all_flags)
        
        # Weakness 3: English Language limitation check
        try:
            from langdetect import detect
            lang = detect(job["description"])
            if lang != "en":
                insights.append({
                    "type": "warning", 
                    "msg": f"Non-English text detected ({lang.upper()}). The analysis model is optimized for English; accuracy may be reduced."
                })
        except Exception:
            pass
        
        # XGBoost results
        xgboost_result = run_xgboost_model(
            text_score=text_result.score,
            anomaly_score=anomaly_result.score,
            metadata_score=metadata_result.score
        )

        # Compute SHAP explanations
        combined_text = " ".join(filter(None, [
            job.get("title", ""),
            job.get("description", ""),
            job.get("requirements", ""),
            job.get("company", ""),
        ]))
        text_shap = explain_text_model(combined_text)
        
        features_array, _ = _extract_metadata_features(job)
        metadata_shap = explain_metadata_model(features_array)
        
        return jsonify({
            'isFake':          final_score >= 50,
            'confidence':      final_score,
            'textScore':       text_result.score,
            'anomalyScore':    anomaly_result.score,
            'metadataScore':   metadata_result.score,
            'contentScore':    content_result.score,
            'xgboostScore':    xgboost_result.score,
            'finalScore':      final_score,
            'riskLevel':       risk_level,
            'insights':        insights,
            'llmExplanation':  f"The ensemble ML pipeline has analyzed the text content and structural anomalies. The final fraud score is {final_score}% ({risk_level} risk), with a text sub-score of {text_result.score}% and anomaly sub-score of {anomaly_result.score}%.",
            'shapExplanation': {
                'text': text_shap,
                'metadata': metadata_shap
            },
            'status':          'success'
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@api_bp.route('/info', methods=['GET'])
def get_info():
    return jsonify({
        'name': 'RecruitGuard API',
        'version': '2.0.0',
        'architecture': 'Modular Blueprint'
    })

@api_bp.route('/analyze-bulk', methods=['POST'])
def analyze_bulk_jobs():
    """Bulk analysis endpoint"""
    try:
        data = request.json or {}
        jobs = data.get("jobs", [])
        results = []
        for i, j in enumerate(jobs):
            # Run the ML models
            text_result = run_text_model(j)
            anomaly_result = run_anomaly_model(j)
            metadata_result = run_metadata_model(j)
            content_result = run_content_model(j)
            
            final_score = scoring.calculate_final_score(
                content_score=content_result.score,
                metadata_score=metadata_result.score
            )
            risk_level = scoring.determine_risk_level(final_score)

            # Purely model-driven final_score and risk_level - no hardcoded overrides

            results.append({
                "id": i + 1,
                "title": j.get("title", f"Job {i + 1}"),
                "company": j.get("company", "Unknown"),
                "location": j.get("location", ""),
                "salary": j.get("salary", ""),
                "textScore": text_result.score,
                "anomalyScore": anomaly_result.score,
                "metadataScore": metadata_result.score,
                "contentScore": content_result.score,
                "finalScore": final_score,
                "riskLevel": risk_level,
                "factors": text_result.flags + anomaly_result.flags,
                "llmExplanation": "Bulk analysis complete."
            })
            
        return jsonify({"results": results, "status": "success"})
    except Exception as e:
        return jsonify({'error': f'Bulk analysis failed: {str(e)}'}), 500
