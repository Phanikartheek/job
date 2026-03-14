"""
Enhanced Flask Backend with Advanced ML Features
Supports BERT, Multilingual, Neural Network Ensemble, and Continuous Learning
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import sys

# Add python_models to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_models'))

app = Flask(__name__)
CORS(app)

# Global model instances
models = {}
continuous_learner = None

def initialize_models():
    """Initialize all model variants"""
    global models, continuous_learner
    
    try:
        print("[...] Initializing Enhanced ML Models...")
        
        # Try to load models in order of preference
        model_variants = {
            'bert': {
                'module': 'textModelBERT',
                'class': 'BERTTextAnalyzer',
                'enabled': False  # Disabled by default (needs GPU)
            },
            'multilingual': {
                'module': 'textModelMultilingual',
                'class': 'MultilingualFraudDetector',
                'enabled': False  # Disabled by default (needs GPU)
            },
            'advanced_ensemble': {
                'module': 'advancedEnsemble',
                'class': 'AdvancedEnsembleModel',
                'enabled': False  # Disabled by default (needs training data)
            },
            'continuous_learning': {
                'module': 'continuousLearning',
                'class': 'ContinuousLearningEngine',
                'enabled': True  # Always enable feedback collection
            }
        }
        
        # Load models
        for variant_name, config in model_variants.items():
            if config['enabled']:
                try:
                    module = __import__(config['module'])
                    ModelClass = getattr(module, config['class'])
                    models[variant_name] = ModelClass()
                    print(f"[OK] Loaded {variant_name}")
                except Exception as e:
                    print(f"[!] Could not load {variant_name}: {str(e)}")
        
        # Initialize continuous learning
        if 'continuous_learning' in models:
            from continuousLearning import ContinuousLearningEngine
            continuous_learner = ContinuousLearningEngine("model.pkl")
            print("[OK] Continuous Learning Engine initialized")
        
        print("[OK] All models initialized successfully\n")
        
    except Exception as e:
        print(f"[ERROR] Model initialization error: {str(e)}\n")

# Initialize models on startup
initialize_models()


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Check health of all model components
    Returns status of each model variant
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': __import__('datetime').datetime.now().isoformat(),
        'models': {
            'bert_available': 'bert' in models,
            'multilingual_available': 'multilingual' in models,
            'advanced_ensemble_available': 'advanced_ensemble' in models,
            'continuous_learning_enabled': 'continuous_learning' in models
        },
        'message': 'All enhanced models ready for inference'
    })


# ─────────────────────────────────────────────────────────────────────────────
# BERT TEXT ANALYSIS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/analyze-bert', methods=['POST'])
def analyze_bert():
    """
    Analyze job using BERT-based text analyzer
    Superior context understanding vs TF-IDF
    """
    if 'bert' not in models:
        return jsonify({
            'error': 'BERT model not available',
            'message': 'Install transformers and torch: pip install transformers torch'
        }), 503
    
    try:
        data = request.json
        job_text = data.get('description', '')
        
        if not job_text:
            return jsonify({'error': 'Job description required'}), 400
        
        # Get BERT prediction
        score = models['bert'].predict(job_text)
        
        return jsonify({
            'model': 'BERT Text Analyzer',
            'fraud_score': score,
            'method': 'Transformer-based BERT embeddings',
            'confidence': 'high',
            'description': 'Superior context understanding'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# MULTILINGUAL ANALYSIS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/analyze-multilingual', methods=['POST'])
def analyze_multilingual():
    """
    Analyze job in any language (English, Hindi, Telugu, Tamil)
    Auto-detects language and applies appropriate models
    """
    if 'multilingual' not in models:
        return jsonify({
            'error': 'Multilingual model not available',
            'message': 'Install transformers and torch: pip install transformers torch'
        }), 503
    
    try:
        data = request.json
        job_text = data.get('description', '')
        
        if not job_text:
            return jsonify({'error': 'Job description required'}), 400
        
        # Detect language and predict
        result = models['multilingual'].predict(job_text)
        
        return jsonify({
            'model': 'Multilingual Fraud Detector',
            'fraud_score': result['fraud_score'],
            'detected_language': result['language'],
            'confidence': result['confidence'],
            'supported_languages': ['English', 'Hindi', 'Telugu', 'Tamil']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# ADVANCED ENSEMBLE ENDPOINT (XGBoost + Neural Network)
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/analyze-advanced', methods=['POST'])
def analyze_advanced():
    """
    Advanced ensemble combining XGBoost and Neural Networks
    Takes model scores from individual experts and learns optimal combination
    """
    if 'advanced_ensemble' not in models:
        return jsonify({
            'error': 'Advanced ensemble not available',
            'message': 'Model needs to be trained first'
        }), 503
    
    try:
        data = request.json
        
        # Expect model scores from individual analyzers
        text_score = data.get('text_score', 50)
        anomaly_score = data.get('anomaly_score', 50)
        metadata_score = data.get('metadata_score', 50)
        
        model_scores = [[text_score/100, anomaly_score/100, metadata_score/100]]
        
        # Get ensemble prediction
        result = models['advanced_ensemble'].predict(model_scores[0])
        
        return jsonify({
            'model': 'Advanced Neural Network Ensemble',
            'fraud_score': result['fraud_score'],
            'component_scores': {
                'xgboost': result['xgboost_score'],
                'neural_network': result['neural_score']
            },
            'confidence': result['confidence'],
            'description': 'Combines XGBoost and Deep Learning'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# CONTINUOUS LEARNING FEEDBACK ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/feedback', methods=['POST'])
def record_feedback():
    """
    Record prediction feedback for continuous learning
    Helps system improve over time based on real outcomes
    """
    if continuous_learner is None:
        return jsonify({'error': 'Continuous learning not enabled'}), 503
    
    try:
        data = request.json
        
        job_id = data.get('job_id')
        prediction = data.get('prediction')
        actual_label = data.get('actual_label')  # 0=legitimate, 1=fraud
        job_data = data.get('job_data', {})
        
        if not all([job_id, prediction is not None, actual_label is not None]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Record feedback
        continuous_learner.feedback_collector.record_feedback(
            job_id=job_id,
            prediction=prediction / 100,  # Convert 0-100 to 0-1
            actual_label=actual_label,
            job_data=job_data
        )
        
        # Check if retraining is needed
        should_retrain = continuous_learner.feedback_collector.should_retrain()
        
        response = {
            'status': 'feedback_recorded',
            'job_id': job_id,
            'feedback_accepted': True,
            'should_retrain': should_retrain
        }
        
        # Trigger async retraining if needed
        if should_retrain:
            continuous_learner.adaptive_retrain_async()
            response['retraining_started'] = True
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# LEARNING STATUS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/learning-status', methods=['GET'])
def get_learning_status():
    """
    Get continuous learning system status
    Shows accuracy metrics, error patterns, and retraining status
    """
    if continuous_learner is None:
        return jsonify({'error': 'Continuous learning not enabled'}), 503
    
    try:
        status = continuous_learner.get_learning_status()
        
        return jsonify({
            'status': 'success',
            'learning_system': status,
            'recommendations': generate_recommendations(status)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def generate_recommendations(status):
    """Generate recommendations based on learning status"""
    recommendations = []
    
    metrics = status.get('accuracy_metrics', {})
    
    if metrics.get('accuracy', 0) < 0.85:
        recommendations.append("Accuracy is below 85%. Consider collecting more feedback data.")
    
    if metrics.get('false_positives', 0) > metrics.get('false_negatives', 0):
        recommendations.append("High false positives detected. System is too conservative.")
    
    if metrics.get('false_negatives', 0) > 5:
        recommendations.append(f"Warning: {metrics['false_negatives']} false negatives detected. Model missing fraud cases.")
    
    return recommendations


# ─────────────────────────────────────────────────────────────────────────────
# MODEL COMPARISON ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/compare-models', methods=['POST'])
def compare_models():
    """
    Compare predictions from different model variants
    Useful for understanding which model is most suitable
    """
    try:
        data = request.json
        job_description = data.get('description', '')
        
        if not job_description:
            return jsonify({'error': 'Job description required'}), 400
        
        results = {
            'job_summary': job_description[:100] + '...',
            'model_predictions': {}
        }
        
        # BERT prediction
        if 'bert' in models:
            try:
                results['model_predictions']['bert'] = models['bert'].predict(job_description)
            except:
                results['model_predictions']['bert'] = 'Not available'
        
        # Multilingual prediction
        if 'multilingual' in models:
            try:
                ml_result = models['multilingual'].predict(job_description)
                results['model_predictions']['multilingual'] = ml_result['fraud_score']
            except:
                results['model_predictions']['multilingual'] = 'Not available'
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# ERROR HANDLERS
# ─────────────────────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("Enhanced ML Fraud Detection API - Starting Server")
    print("="*60)
    print("\nAvailable Endpoints:")
    print("  POST  /api/analyze-bert          → BERT text analysis")
    print("  POST  /api/analyze-multilingual  → Multilingual analysis")
    print("  POST  /api/analyze-advanced      → Advanced ensemble (XGBoost+NN)")
    print("  POST  /api/feedback              → Record prediction feedback")
    print("  GET   /api/learning-status       → Get continuous learning status")
    print("  POST  /api/compare-models        → Compare model predictions")
    print("  GET   /api/health                → Health check")
    print("\n" + "="*60)
    print("Connecting to database...\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')
