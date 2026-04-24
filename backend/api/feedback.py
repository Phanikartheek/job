from flask import Blueprint, request, jsonify
from datetime import datetime
import os

# This would ideally connect to your Supabase client
# from integrations.supabase import supabase_client

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/report', methods=['POST'])
def report_feedback():
    """
    Endpoint to receive user feedback (Self-Learning Loop)
    """
    try:
        data = request.json or {}
        
        # Required fields
        job_id = data.get("jobId")
        actual_label = data.get("actualLabel") # 'fraud' or 'legit'
        user_comments = data.get("comments", "")
        
        if not actual_label:
            return jsonify({'error': 'Feedback label is required'}), 400

        # Log for now (In production, this goes to Supabase)
        feedback_entry = {
            "jobId": job_id,
            "actualLabel": actual_label,
            "comments": user_comments,
            "timestamp": datetime.now().isoformat(),
            "status": "pending_retrain"
        }
        
        # Print to console for visibility during dev
        print(f" [FEEDBACK RECEIVED] {feedback_entry}")
        
        # Save to a local JSON file as a fallback/cache for retraining
        feedback_file = "data/user_feedback.json"
        os.makedirs("data", exist_ok=True)
        
        # Simple append logic for the prototype
        import json
        existing_data = []
        if os.path.exists(feedback_file):
            try:
                with open(feedback_file, 'r') as f:
                    existing_data = json.load(f)
            except:
                existing_data = []
        
        existing_data.append(feedback_entry)
        with open(feedback_file, 'w') as f:
            json.dump(existing_data, f, indent=4)

        return jsonify({
            'message': 'Thank you! Your feedback helps the AI learn.',
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': f'Feedback failed: {str(e)}'}), 500
