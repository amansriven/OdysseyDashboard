# Odyssey Dashboard - Cloud Shell Setup

## Quick Start (Cloud Shell)

### 1. Clone or Pull Latest Code
```bash
cd ~
# If first time:
git clone https://github.com/amansriven/OdysseyDashboard.git
# If already cloned:
cd ~/OdysseyDashboard && git pull
```

### 2. Set Environment Variables
```bash
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
export GOOGLE_CLOUD_PROJECT=qwiklabs-gcp-03-73322a4eafa0
export GOOGLE_CLOUD_LOCATION=us-central1
export ODYSSEY_DATA=~/data
```

**Optional:** Add to `~/.bashrc` to persist across sessions:
```bash
echo 'export GOOGLE_GENAI_USE_VERTEXAI=TRUE' >> ~/.bashrc
echo 'export GOOGLE_CLOUD_PROJECT=qwiklabs-gcp-03-73322a4eafa0' >> ~/.bashrc
echo 'export GOOGLE_CLOUD_LOCATION=us-central1' >> ~/.bashrc
echo 'export ODYSSEY_DATA=~/data' >> ~/.bashrc
```

### 3. Install Python Dependencies
```bash
cd ~/OdysseyDashboard
pip install --user -r requirements.txt
```

### 4. Install UI Dependencies (First Time Only)
```bash
cd ~/OdysseyDashboard/ui
npm install
```

---

## Running the Full System (UI + API)

You need **two Cloud Shell sessions** running simultaneously:

### Terminal 1: Backend API Server
```bash
cd ~/OdysseyDashboard
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
export GOOGLE_CLOUD_PROJECT=qwiklabs-gcp-03-73322a4eafa0
export GOOGLE_CLOUD_LOCATION=us-central1
export ODYSSEY_DATA=~/data

python3 -m odyssey.api_server
```

This starts the Flask server on port 5000 and connects to ADK agents.

### Terminal 2: Frontend UI
```bash
cd ~/OdysseyDashboard/ui
npm run dev -- --port 8080
```

Then click **Web Preview → Preview on port 8080**

---

## Architecture

```
┌─────────────┐
│   Browser   │
│  (UI/Chat)  │
└─────┬───────┘
      │
      │ HTTP /api/chat
      ▼
┌─────────────┐
│    Vite     │ Port 8080 (proxies /api to port 5000)
│ Dev Server  │
└─────┬───────┘
      │
      │ Proxy
      ▼
┌─────────────┐
│   Flask     │ Port 5000
│ API Server  │
└─────┬───────┘
      │
      │ ADK Runner
      ▼
┌─────────────────────────┐
│  Google ADK Agents      │
│  - claim_spine          │
│  - benefits_navigator   │
│  - compliance_sentinel  │
└─────┬───────────────────┘
      │
      │ Vertex AI / Gemini
      ▼
┌─────────────┐
│  Gemini API │
└─────────────┘
```

---

## Testing the Chatbot

1. Open the UI in Web Preview
2. Click the chat button (bottom right)
3. Select an agent type:
   - **Claim**: Process claim IDs (e.g., "Process claim CLM000377")
   - **Benefits**: Ask coverage questions (e.g., "Does CPT 29881 need prior auth on DSNP?")
   - **Compliance**: Ask about risk flags (e.g., "What ROI gaps need attention?")

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000 (API server)
lsof -ti:5000 | xargs kill -9

# Kill process on port 8080 (UI)
lsof -ti:8080 | xargs kill -9
```

### API Not Responding
Check that environment variables are set:
```bash
echo $GOOGLE_GENAI_USE_VERTEXAI
echo $GOOGLE_CLOUD_PROJECT
echo $ODYSSEY_DATA
```

### Gemini 429 Errors
The quota is ~4 concurrent requests. The API server uses sequential agents to stay under this limit. If you still hit 429s, wait 30 seconds and retry.

---

## File Structure

```
OdysseyDashboard/
├── odyssey/                  # Python ADK agents
│   ├── agents.py            # 3 agent definitions
│   ├── api_server.py        # Flask API (NEW)
│   ├── tools.py             # Data access tools
│   └── schemas.py           # Pydantic schemas
├── ui/                      # React frontend
│   ├── src/
│   │   └── app/
│   │       ├── App.tsx
│   │       └── components/
│   │           └── ChatBot.tsx  # Chat UI (NEW)
│   └── vite.config.ts       # Proxy config updated
├── data/                    # CSV data (symlink or copy from ~/data)
├── requirements.txt         # Python deps
└── CLOUDSHELL_SETUP.md     # This file
```
