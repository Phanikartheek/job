import logging
import sys
import os

def setup_logger(name: str = "RecruitGuard"):
    """Professional logging setup for the backend"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Create formatters
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    if not logger.handlers:
        logger.addHandler(console_handler)
        
    return logger

# Global logger instance
logger = setup_logger()
