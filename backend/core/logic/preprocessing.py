import re
from typing import Dict, List

class MetadataFeatureEngineer:
    """
    Layer 2: Feature Engineering (RecruitGuard)
    Extract structured metadata features from job postings
    """
    
    # Suspicious keywords for fraud detection
    FRAUD_KEYWORDS = {
        'guaranteed', 'unlimited', 'easy money', 'no experience',
        'work from home', 'earn from home', 'whatsapp', 'telegram', 'no interview',
        'part time full time salary', 'upfront payment', 'exclusive',
        'limited time', 'quick cash', 'passive income', 'instant approval',
        'worldwide', 'any time', 'anywhere', 'flexible hours', 'wire transfer',
        'registration fee', 'processing fee', 'make money fast'
    }
    
    PERSONAL_EMAIL_DOMAINS = {
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'protonmail.com', 'mail.com', 'yandex.com'
    }
    
    def __init__(self):
        self.feature_names = [
            'salary_missing', 'salary_too_high', 'salary_unlimited',
            'email_personal_domain', 'location_missing', 'company_name_short',
            'suspicious_keywords_count', 'text_length_suspicious',
            'caps_ratio', 'digit_ratio'
        ]
    
    def clean_text(self, text: str) -> str:
        """Standardize and clean text input"""
        if not text:
            return ""
        # Remove multiple spaces, normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_features(self, job_data: Dict) -> Dict[str, float]:
        """
        Extract all metadata features from job posting
        """
        features = {}
        
        # Salary features
        salary = str(job_data.get('salary', '')).lower()
        features['salary_missing'] = 1.0 if not salary or salary == 'not specified' else 0.0
        features['salary_too_high'] = 1.0 if any(x in salary for x in ['99999', '1000000', '$5000 per week']) else 0.0
        features['salary_unlimited'] = 1.0 if 'unlimited' in salary else 0.0
        
        # Email features
        email = str(job_data.get('email', '')).lower()
        domain = email.split('@')[1] if '@' in email else ''
        features['email_personal_domain'] = 1.0 if domain in self.PERSONAL_EMAIL_DOMAINS else 0.0
        
        # Location features
        location = str(job_data.get('location', '')).lower()
        features['location_missing'] = 1.0 if not location or location == 'anywhere' else 0.0
        
        # Company features
        company_name = str(job_data.get('company', '') or job_data.get('company_name', ''))
        features['company_name_short'] = 1.0 if len(company_name) < 3 else 0.0
        
        # Text analysis
        description = self.clean_text(str(job_data.get('description', '')).lower())
        features['suspicious_keywords_count'] = self._count_suspicious_keywords(description)
        features['text_length_suspicious'] = 1.0 if len(description) < 100 else 0.0
        features['caps_ratio'] = self._calculate_caps_ratio(job_data.get('description', ''))
        features['digit_ratio'] = self._calculate_digit_ratio(description)
        
        return features
    
    def _count_suspicious_keywords(self, text: str) -> float:
        """Count occurrences of suspicious keywords (normalized 0-1)"""
        count = sum(1 for keyword in self.FRAUD_KEYWORDS if keyword in text)
        return min(count / 5.0, 1.0)
    
    def _calculate_caps_ratio(self, text: str) -> float:
        """Calculate ratio of capital letters"""
        if not text:
            return 0.0
        caps = sum(1 for c in text if c.isupper())
        return caps / len(text)
    
    def _calculate_digit_ratio(self, text: str) -> float:
        """Calculate ratio of digits"""
        if not text:
            return 0.0
        digits = sum(1 for c in text if c.isdigit())
        return digits / len(text)
