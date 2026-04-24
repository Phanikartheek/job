import pytest
from core.logic.scoring_logic import ScoringLogic

def test_calculate_final_score():
    scoring = ScoringLogic(content_weight=0.7, metadata_weight=0.3)
    
    # Test case 1: High fraud content (90), low fraud metadata (10)
    # Expected: (90 * 0.7) + (10 * 0.3) = 63 + 3 = 66
    assert scoring.calculate_final_score(90, 10) == 66
    
    # Test case 2: Low fraud
    assert scoring.calculate_final_score(10, 5) == 9
    
    # Test case 3: Max boundaries
    assert scoring.calculate_final_score(100, 100) == 100
    assert scoring.calculate_final_score(0, 0) == 0

def test_determine_risk_level():
    scoring = ScoringLogic()
    assert scoring.determine_risk_level(10) == 'LOW'
    assert scoring.determine_risk_level(30) == 'MEDIUM'
    assert scoring.determine_risk_level(60) == 'HIGH'
    assert scoring.determine_risk_level(85) == 'CRITICAL'
