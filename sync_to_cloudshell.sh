#!/bin/bash
# Run this IN CLOUD SHELL to get the latest chatbot code
# Usage: bash sync_to_cloudshell.sh

set -e

echo "=== Syncing Odyssey chatbot code to Cloud Shell ==="

cd ~/OdysseyDashboard || {
    echo "OdysseyDashboard not found. Cloning..."
    cd ~
    git clone https://github.com/amansriven/OdysseyDashboard.git
    cd OdysseyDashboard
}

echo "Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "=== Installing Python dependencies ==="
pip install --user flask flask-cors

echo ""
echo "=== Installing UI dependencies (if needed) ==="
cd ~/OdysseyDashboard/ui
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "node_modules exists, skipping npm install"
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To run the chatbot:"
echo ""
echo "Terminal 1 (API Server):"
echo "  cd ~/OdysseyDashboard"
echo "  source ~/odyssey/QUICKSTART.sh"
echo "  python3 -m odyssey.api_server"
echo ""
echo "Terminal 2 (UI):"
echo "  cd ~/OdysseyDashboard/ui"
echo "  npm run dev -- --port 8080"
echo ""
echo "Then: Web Preview → Port 8080"
