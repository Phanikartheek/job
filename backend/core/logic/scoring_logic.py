from typing import Dict, List

class ScoringLogic:
    """
    Ensemble Scoring Engine (RecruitGuard)
    Implements the 70/30 weighted formula for final fraud detection.
    """
    
    def __init__(self, content_weight: float = 0.7, metadata_weight: float = 0.3):
        self.content_weight = content_weight
        self.metadata_weight = metadata_weight

    def calculate_final_score(self, content_score: float, metadata_score: float) -> int:
        """
        Calculate weighted ensemble score.
        Formula: (Content * 0.7) + (Metadata * 0.3)
        """
        final = (content_score * self.content_weight) + (metadata_score * self.metadata_weight)
        return int(round(max(0, min(100, final))))

    def get_detection_insights(self, flags: List[str]) -> List[Dict[str, str]]:
        """
        Convert raw technical flags into human-readable insights.
        """
        insight_map = {
            "urgent_language": {"type": "content", "msg": "Detected high-pressure or urgent language typical of scams."},
            "salary_outlier": {"type": "anomaly", "msg": "Salary offered is significantly higher than industry standards."},
            "suspicious_email": {"type": "metadata", "msg": "Uses a public domain (@gmail, @yahoo) instead of a corporate one."},
            "missing_details": {"type": "content", "msg": "Job description is missing key professional details."},
            "generic_title": {"type": "content", "msg": "Uses a generic or overly-broad job title."},
            "unprofessional_formatting": {"type": "content", "msg": "Excessive capitalization or poor grammar detected."},
            "domain_mismatch": {"type": "metadata", "msg": "Company name does not match the provided contact email domain."},
        }
        
        insights = []
        for flag in flags:
            if flag in insight_map:
                insights.append(insight_map[flag])
        
        # Add a default insight if no specific flags but score is high
        if not insights and len(flags) > 0:
            insights.append({"type": "general", "msg": "Statistical patterns match known fraud signatures."})
            
        return insights

    def determine_risk_level(self, score: int) -> str:
        """Convert score to human-readable risk level"""
        if score >= 75:
            return 'CRITICAL'
        elif score >= 50:
            return 'HIGH'
        elif score >= 25:
            return 'MEDIUM'
        else:
            return 'LOW'

    def get_risk_color(self, risk_level: str) -> str:
        """Associated colors for UI/Reports"""
        colors = {
            'CRITICAL': '#ef4444', # Red
            'HIGH': '#f97316',     # Orange
            'MEDIUM': '#eab308',   # Yellow
            'LOW': '#22c55e'       # Green
        }
        return colors.get(risk_level, '#64748b')
