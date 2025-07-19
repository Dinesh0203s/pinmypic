"""
Flask API for face recognition processing.
"""
import os
import json
import sys
from flask import Flask, request, jsonify
import numpy as np
import cv2
import base64
import requests
import io
from face_processor import FaceProcessor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
face_processor = None

def download_models_if_needed():
    """Download models before starting the face processor."""
    try:
        logger.info("Checking for face recognition models...")
        
        # Import and initialize to trigger model download
        import insightface
        from config import ARCFACE_MODEL_NAME
        
        # Create a temporary face analysis app to trigger model download
        logger.info(f"Downloading {ARCFACE_MODEL_NAME} model if not cached...")
        temp_app = insightface.app.FaceAnalysis(
            name=ARCFACE_MODEL_NAME,
            providers=['CPUExecutionProvider']  # Use CPU for model download
        )
        
        # This will download the model if not already cached
        temp_app.prepare(ctx_id=-1, det_size=(640, 640))
        
        logger.info(f"Model {ARCFACE_MODEL_NAME} is ready")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download models: {str(e)}")
        return False

def get_face_processor():
    """Get or create face processor instance."""
    global face_processor
    if face_processor is None:
        # Download models first if needed
        if not download_models_if_needed():
            logger.error("Failed to download required models")
            sys.exit(1)
        
        face_processor = FaceProcessor()
    return face_processor

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'face-recognition'})

@app.route('/process-photo', methods=['POST'])
def process_photo():
    """Process a photo and extract face embeddings."""
    try:
        data = request.json
        photo_path = data.get('photoPath')
        
        if not photo_path:
            return jsonify({'error': 'photoPath is required'}), 400
        
        # Get face processor
        processor = get_face_processor()
        
        # Check if photoPath is a GridFS ID (24 character hex string) or a file path
        if len(photo_path) == 24 and all(c in '0123456789abcdef' for c in photo_path.lower()):
            # This is a GridFS ID, download the image from the main server
            try:
                image_url = f"http://localhost:5000/api/images/{photo_path}"
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                
                # Convert the image data to numpy array
                image_data = np.frombuffer(response.content, np.uint8)
                image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
                if image is None:
                    return jsonify({'error': 'Could not decode image data'}), 400
                
                # Convert BGR to RGB for face processing
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
                # Process the image directly
                faces = processor.detect_faces(image)
                
            except requests.RequestException as e:
                logger.error(f"Error downloading image from GridFS: {str(e)}")
                return jsonify({'error': f'Could not download image: {str(e)}'}), 500
            except Exception as e:
                logger.error(f"Error processing GridFS image: {str(e)}")
                return jsonify({'error': f'Could not process image: {str(e)}'}), 500
        else:
            # This is a file path, process normally
            faces = processor.process_image_file(photo_path)
        
        return jsonify({
            'success': True,
            'faces': faces,
            'faceCount': len(faces)
        })
        
    except Exception as e:
        logger.error(f"Error processing photo: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/compare-faces', methods=['POST'])
def compare_faces():
    """Compare a selfie with stored face embeddings."""
    try:
        data = request.json
        selfie_data = data.get('selfieData')  # Base64 encoded image
        embeddings = data.get('embeddings')  # List of stored embeddings to compare against
        
        if not selfie_data or not embeddings:
            return jsonify({'error': 'selfieData and embeddings are required'}), 400
        
        # Decode base64 image
        image_data = base64.b64decode(selfie_data.split(',')[1] if ',' in selfie_data else selfie_data)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Get face processor
        processor = get_face_processor()
        
        # Detect faces in selfie
        faces = processor.detect_faces(image)
        if not faces:
            return jsonify({'error': 'No face detected in selfie'}), 400
        
        # Use the first face (largest)
        selfie_embedding = np.array(faces[0]['embedding'])
        
        # Calculate similarities
        matches = []
        for i, stored in enumerate(embeddings):
            stored_embedding = np.array(stored['embedding'])
            
            # Calculate cosine similarity
            similarity = np.dot(selfie_embedding, stored_embedding) / (
                np.linalg.norm(selfie_embedding) * np.linalg.norm(stored_embedding)
            )
            
            matches.append({
                'photoId': stored['photoId'],
                'similarity': float(similarity)
            })
        
        # Sort by similarity
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        
        return jsonify({
            'success': True,
            'matches': matches
        })
        
    except Exception as e:
        logger.error(f"Error comparing faces: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run on a different port to avoid conflict with main app
    app.run(host='0.0.0.0', port=5001, debug=True)