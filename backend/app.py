"""
RecruitGuard — AI-Powered Job Fraud Detection API
"The Brain" - Production Entry Point
"""

from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys

# Ensure backend root is in path for modular imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.routes import api_bp
from api.feedback import feedback_bp
from api.middleware import setup_middleware
from utils.config import Config
from utils.logger import logger

def create_app():
    """Application Factory"""
    app = Flask(__name__)
    CORS(app)
    
    # Load Config
    app.config.from_object(Config)
    
    # Setup Middleware
    setup_middleware(app)
    
    # Register Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    
    @app.route('/')
    def index():
        return jsonify(Config.get_api_info())
        
    return app

app = create_app()

if __name__ == '__main__':
    logger.info(f"Starting {Config.APP_NAME} v{Config.VERSION}...")
    app.run(
        host='0.0.0.0', 
        port=Config.PORT, 
        debug=Config.DEBUG
    )
