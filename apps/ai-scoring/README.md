# Smart Bursary AI Scoring Service

FastAPI microservice for application scoring, document analysis, and scoring weight validation.

## Prerequisites

- Python 3.11+
- pip

## Create Virtual Environment

From repo root (Windows PowerShell):

```powershell
python -m venv .venv
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& ".\\.venv\\Scripts\\Activate.ps1")
```

From repo root (bash/zsh):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## Install Dependencies

From repo root:

```bash
python -m pip install -r apps/ai-scoring/requirements.txt
```

## Start AI Scoring Service (Development)

From repo root (PowerShell):

```powershell
& ".\\.venv\\Scripts\\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --app-dir "apps/ai-scoring"
```

From app folder (PowerShell):

```powershell
cd apps/ai-scoring
& "..\\..\\.venv\\Scripts\\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

From repo root (bash/zsh):

```bash
./.venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --app-dir apps/ai-scoring
```

Service default URL: `http://localhost:8000`.

Health check:

```bash
curl http://localhost:8000/health
```

## Run Tests

From app folder:

```bash
python -m pytest tests -q
```

If disk space is very low:

```bash
PYTHONDONTWRITEBYTECODE=1 python -m pytest tests -q -p no:cacheprovider
```