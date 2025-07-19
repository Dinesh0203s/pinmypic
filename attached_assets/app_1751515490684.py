"""
Flask web application for face recognition system.
"""
import os
import shutil
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import tempfile
from pathlib import Path

# Import our face recognition system
from main import FaceRecognitionSystem

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_PATH'] = None

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'events'), exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'results'), exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """Handle file uploads and process face recognition."""
    try:
        # Check if files were uploaded
        if 'eventPhotos' not in request.files or 'selfie' not in request.files:
            return jsonify({'error': 'Missing files'}), 400
        
        event_photos = request.files.getlist('eventPhotos')
        selfie = request.files['selfie']
        
        # Validate selfie
        if selfie.filename == '':
            return jsonify({'error': 'No selfie selected'}), 400
        
        if not allowed_file(selfie.filename):
            return jsonify({'error': 'Invalid selfie file type'}), 400
        
        # Create temporary directory for this session
        session_id = tempfile.mktemp().split('/')[-1]
        session_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'events', session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        # Save selfie
        selfie_filename = secure_filename(selfie.filename)
        selfie_path = os.path.join(app.config['UPLOAD_FOLDER'], f'selfie_{session_id}.jpg')
        selfie.save(selfie_path)
        
        # Save event photos
        saved_photos = []
        for photo in event_photos:
            if photo and allowed_file(photo.filename):
                filename = secure_filename(photo.filename)
                filepath = os.path.join(session_dir, filename)
                photo.save(filepath)
                saved_photos.append(filename)
        
        if not saved_photos:
            return jsonify({'error': 'No valid event photos uploaded'}), 400
        
        # Initialize face recognition system
        print("Initializing face recognition system...")
        system = FaceRecognitionSystem()
        
        # Process event photos
        print(f"Processing {len(saved_photos)} event photos...")
        faces_found = system.load_images_from_folder(session_dir)
        
        if faces_found == 0:
            # Clean up
            shutil.rmtree(session_dir)
            os.remove(selfie_path)
            return jsonify({
                'matches': [],
                'message': 'No faces detected in the event photos'
            })
        
        # Find matches
        print("Finding matches...")
        matches = system.find_matches(selfie_path, max_matches=100, threshold=0.4)
        
        # Prepare results
        results = []
        for match in matches:
            filename = os.path.basename(match['image_path'])
            results.append({
                'filename': filename,
                'similarity': round(match['similarity'], 3),
                'url': f'/image/{session_id}/{filename}'
            })
        
        # Clean up
        system.cleanup()
        os.remove(selfie_path)
        
        return jsonify({
            'matches': results,
            'totalPhotos': len(saved_photos),
            'facesFound': faces_found,
            'sessionId': session_id
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/image/<session_id>/<filename>')
def serve_image(session_id, filename):
    """Serve an uploaded image."""
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'events', session_id, filename)
    if os.path.exists(filepath):
        return send_file(filepath)
    return "Image not found", 404

@app.route('/cleanup/<session_id>', methods=['POST'])
def cleanup_session(session_id):
    """Clean up session files."""
    session_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'events', session_id)
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)
    return jsonify({'status': 'cleaned'})

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error."""
    return jsonify({'error': 'File too large. Maximum total upload size is 500MB.'}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)