"""
Model download script for face recognition models.
Downloads InsightFace models before server starts.
"""

import os
import sys
import logging
from config import ARCFACE_MODEL_NAME

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_models():
    """Download and cache face recognition models."""
    try:
        import insightface
        
        logger.info(f"Downloading {ARCFACE_MODEL_NAME} model...")
        
        # Create a temporary face analysis app to trigger model download
        app = insightface.app.FaceAnalysis(
            name=ARCFACE_MODEL_NAME,
            providers=['CPUExecutionProvider']  # Use CPU for model download
        )
        
        # This will download the model if not already cached
        app.prepare(ctx_id=-1, det_size=(640, 640))
        
        logger.info(f"Successfully downloaded {ARCFACE_MODEL_NAME} model")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download models: {str(e)}")
        return False

def main():
    """Main function to download models."""
    logger.info("Starting model download process...")
    
    if download_models():
        logger.info("Model download completed successfully")
        sys.exit(0)
    else:
        logger.error("Model download failed")
        sys.exit(1)

if __name__ == "__main__":
    main()