from flask import request
from utils.logger import logger
import time

def setup_middleware(app):
    """Register middleware for logging and diagnostics"""
    
    @app.before_request
    def start_timer():
        request.start_time = time.time()
        
    @app.after_request
    def log_request(response):
        if request.path == '/api/health':
            return response
            
        duration = round(time.time() - request.start_time, 4)
        logger.info(
            f"Method: {request.method} | Path: {request.path} | "
            f"Status: {response.status_code} | Duration: {duration}s"
        )
        return response
