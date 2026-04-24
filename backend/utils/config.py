import os

class Config:
    """Environment and system configuration for RecruitGuard"""
    
    APP_NAME = "RecruitGuard API"
    VERSION = "2.0.0"
    DEBUG = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    PORT = int(os.environ.get("PORT", 5000))
    ENV = os.environ.get("FLASK_ENV", "development")
    
    # Model configuration
    CONTENT_WEIGHT = 0.7
    METADATA_WEIGHT = 0.3
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    
    @classmethod
    def get_api_info(cls):
        return {
            "app": cls.APP_NAME,
            "version": cls.VERSION,
            "env": cls.ENV,
            "formula": "70/30 Hybrid"
        }
