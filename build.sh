#!/bin/bash
# Build script for Render deployment

echo "Starting build process..."

# Install Python dependencies
echo "Installing Python dependencies..."
if [ -f "server/face-recognition/requirements.txt" ]; then
    pip install -r server/face-recognition/requirements.txt
    echo "Python dependencies installed successfully"
else
    echo "No requirements.txt found, skipping Python dependencies"
fi

# Download face recognition models
echo "Downloading face recognition models..."
if [ -f "server/face-recognition/download_models.py" ]; then
    cd server/face-recognition
    python download_models.py
    cd ../..
    echo "Models downloaded successfully"
else
    echo "No download_models.py found, skipping model download"
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Build the client
echo "Building client..."
npm run build

echo "Build process completed successfully!"