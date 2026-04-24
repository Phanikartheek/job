import pytest
from core.logic.preprocessing import MetadataFeatureEngineer

def test_clean_text():
    engineer = MetadataFeatureEngineer()
    assert engineer.clean_text("  hello   world  ") == "hello world"
    assert engineer.clean_text(None) == ""

def test_extract_features():
    engineer = MetadataFeatureEngineer()
    job_data = {
        "salary": "unlimited cash guaranteed",
        "email": "scam@gmail.com",
        "description": "very short"
    }
    features = engineer.extract_features(job_data)
    
    assert features['salary_unlimited'] == 1.0
    assert features['email_personal_domain'] == 1.0
    assert features['text_length_suspicious'] == 1.0
