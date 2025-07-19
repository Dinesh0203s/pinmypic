"""
Face processing module using InsightFace and ArcFace embeddings.
"""

import numpy as np
import cv2
from typing import List, Tuple, Optional, Dict
import logging
import os
from config import (
    ARCFACE_MODEL_NAME, FORCE_CPU, GPU_DEVICE_ID, 
    MIN_FACE_SIZE, BATCH_SIZE
)

logger = logging.getLogger(__name__)

class FaceProcessor:
    """Face detection and embedding extraction using InsightFace."""
    
    def __init__(self):
        """Initialize the face processor."""
        self.app = None
        self.model_loaded = False
        self.using_gpu = False
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the InsightFace model."""
        try:
            import insightface
            
            # Determine which context to use
            if FORCE_CPU:
                ctx_id = -1  # CPU
                device_info = "CPU (forced)"
                self.using_gpu = False
            else:
                ctx_id = GPU_DEVICE_ID  # Try GPU
                device_info = f"GPU {GPU_DEVICE_ID}"
                self.using_gpu = True
            
            logger.info(f"Initializing InsightFace model on {device_info}")
            
            # Initialize the face analysis app
            self.app = insightface.app.FaceAnalysis(
                name=ARCFACE_MODEL_NAME,
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider'] if self.using_gpu else ['CPUExecutionProvider']
            )
            
            # Prepare the model with context
            self.app.prepare(ctx_id=ctx_id, det_size=(640, 640))
            
            self.model_loaded = True
            logger.info(f"Successfully initialized {ARCFACE_MODEL_NAME} model on {device_info}")
            
        except Exception as e:
            logger.error(f"Failed to initialize face model: {str(e)}")
            raise RuntimeError(f"Model initialization failed: {str(e)}")
    
    def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """
        Detect faces in an image.
        
        Args:
            image: Input image in RGB format
            
        Returns:
            List of face detection results
        """
        if not self.model_loaded:
            raise RuntimeError("Face model not loaded")
        
        try:
            # Detect faces
            faces = self.app.get(image)
            
            # Filter faces by minimum size
            valid_faces = []
            for face in faces:
                bbox = face.bbox.astype(int)
                width = bbox[2] - bbox[0]
                height = bbox[3] - bbox[1]
                
                if width >= MIN_FACE_SIZE and height >= MIN_FACE_SIZE:
                    face_info = {
                        'bbox': (int(bbox[0]), int(bbox[1]), int(width), int(height)),
                        'confidence': float(face.det_score),
                        'embedding': face.embedding.tolist(),  # Convert to list for JSON serialization
                        'landmarks': face.kps.tolist() if hasattr(face, 'kps') else None
                    }
                    valid_faces.append(face_info)
                else:
                    logger.debug(f"Filtered out small face: {width}x{height}")
            
            return valid_faces
            
        except Exception as e:
            logger.error(f"Face detection failed: {str(e)}")
            return []
    
    def process_image_file(self, image_path: str) -> List[Dict]:
        """
        Process a single image file and extract face information.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            List of face information dictionaries
        """
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            logger.warning(f"Could not load image: {image_path}")
            return []
        
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize if needed
        height, width = image.shape[:2]
        max_dim = 1024
        if max(height, width) > max_dim:
            scale = max_dim / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = cv2.resize(image, (new_width, new_height))
        
        # Detect faces
        faces = self.detect_faces(image)
        
        logger.debug(f"Processed {image_path}: found {len(faces)} faces")
        return faces
    
    def get_model_info(self) -> Dict:
        """
        Get information about the loaded model.
        
        Returns:
            Dictionary with model information
        """
        return {
            'model_name': ARCFACE_MODEL_NAME,
            'model_loaded': self.model_loaded,
            'using_gpu': self.using_gpu,
            'gpu_device_id': GPU_DEVICE_ID if self.using_gpu else None,
            'embedding_dimension': 512  # buffalo_l produces 512-dim embeddings
        }