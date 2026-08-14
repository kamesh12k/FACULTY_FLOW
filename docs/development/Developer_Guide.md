# FAFLOW — Developer Guide

This guide assists software engineers in configuring local development environments, running tests, and developing features for FAFLOW.

---

## 1. Local Development Stack Setup

1. **Python Environment**:
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
```

2. **Frontend Toolchain**:
```bash
cd ../frontend
npm install
```

3. **Starting Development Servers**:
- Backend: `uvicorn app.main:app --reload --port 8000` (in `backend/`)
- Frontend: `npm run dev` (in `frontend/`, opens on port `5173`)
- Or run `StartDev.bat` on Windows.
