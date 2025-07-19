#!/bin/bash
# Install Python dependencies for face recognition service

echo "Installing Python dependencies for face recognition..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Please install Python3 first."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "pip3 not found. Please install pip3 first."
    exit 1
fi

# Install dependencies from requirements.txt
if [ -f "server/face-recognition/requirements.txt" ]; then
    echo "Installing Python packages from requirements.txt..."
    pip3 install -r server/face-recognition/requirements.txt
    echo "Python dependencies installed successfully!"
else
    echo "Error: server/face-recognition/requirements.txt not found"
    exit 1
fi

# Download face recognition models
echo "Downloading face recognition models..."
cd server/face-recognition
python3 download_models.py
cd ../..

echo "Installation completed successfully!"