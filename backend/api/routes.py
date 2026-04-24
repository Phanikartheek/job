from flask import Blueprint, request, jsonify
from datetime import datetime

# Import core engines and logic
from core.engines.textModel import run_text_model
from core.engines.anomalyModel import run_anomaly_model
from core.engines.metadataModel import run_metadata_model
from core.engines.contentModel import run_content_model
from core.engines.xgboostModel import run_xgboost_model
from core.logic.scoring_logic import ScoringLogic

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
        
        # Collect and humanize flags (The Reasoning Engine)
        all_flags = []
        all_flags.extend(text_result.flags or [])
        all_flags.extend(anomaly_result.flags or [])
        all_flags.extend(metadata_result.flags or [])
        
        insights = scoring.get_detection_insights(all_flags)
        
        # XGBoost results
        xgboost_result = run_xgboost_model(
            text_score=text_result.score,
            anomaly_score=anomaly_result.score,
            metadata_score=metadata_result.score
        )
        
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
            'status':          'success'
        })
        
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@api_bp.route('/info', methods=['GET'])
def get_info():
    return jsonify({
        'name': 'RecruitGuard API',
        'version': '2.0.0',
        'architecture': 'Modular Blueprint'
    })
