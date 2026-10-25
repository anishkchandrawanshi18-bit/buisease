# BuisEase — Streamlining Business Operations & Market Analytics

> **“BuisEase that makes business easy.”**

BuisEase is a full-stack SaaS platform that brings together workflow and task management with real-time market sentiment intelligence. It provides research task tracking alongside sentiment analysis of actual customer reviews from leading food delivery competitors (**Zomato** and **Swiggy**).

---

## 🌟 Key Features

1. **Market Intelligence & Competitor Sentiment**:
   - Automated insights extracted from real customer reviews across Zomato and Swiggy.
   - Categorized by **Good Features** (praised capabilities), **Bad Features** (frequent complaints), and **Unavailable Opportunities** (market gaps).
   - Dual-engine visualizations: interactive client-side **Chart.js** graphics and server-streamed **Matplotlib** figures.

2. **Secure Task Workspace**:
   - Complete task lifecycle: create, search, filter, update title/description, and one-click toggle between `Pending` and `Completed`.
   - Dedicated metrics: total count, pending count, completed count, and live completion percentages.
   - Bulk cleanup: clear completed tasks with one click without affecting pending research items.
   - Strict user isolation: token-based authorization ensures users only see and manage their own tasks.

3. **Enterprise Authentication & Security**:
   - Cryptographic password hashing using **Bcrypt** with unique salts.
   - **JWT Bearer Token** session management (`HS256`).
   - Secure account recovery: single-use, time-limited reset tokens with fallback simulation for local environments without SMTP.
   - In-app account settings: update username (with automatic task synchronization) and change password securely.

4. **Atomic Flat-File JSON Persistence**:
   - Atomic file writing (temp file + atomic replace) to prevent corruption during concurrent requests.
   - Automatic database verification and recovery on server startup.

---

## 🏗️ Architecture & Project Structure

```
D:\main_project\
├── main.py                    # FastAPI application entry point (23+ audited routes)
├── project.json               # JSON flat-file database (users, competitor insights, study tasks)
├── requirements.txt           # Python backend dependencies
├── .env.example               # Backend environment variables template
├── .env                       # Local development environment configuration
├── .gitignore                 # Version control ignore rules (excludes venvs, datasets, envs)
│
├── tests/
│   ├── test_backend.py        # Comprehensive backend pytest suite (auth, tasks, charts)
│   └── test_e2e_integration.py# Full user lifecycle and frontend flow tests
│
├── frontend/                  # React 19 + Vite + Tailwind CSS Single-Page Application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js      # Centralized Axios client with JWT interceptor & API methods
│   │   ├── context/
│   │   │   └── AuthContext.jsx# Auth provider & state management
│   │   ├── components/        # Layout, Navbar, Sidebar, StatCard, StatusBadge, Modal
│   │   ├── pages/             # 15 complete UI pages
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TasksPage.jsx
│   │   │   ├── FoodDeliveryAnalysisPage.jsx
│   │   │   ├── ZomatoAnalysisPage.jsx
│   │   │   ├── SwiggyAnalysisPage.jsx
│   │   │   ├── CompetitorComparisonPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── AccountSettingsPage.jsx
│   │   │   ├── ChangePasswordPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── App.jsx            # React Router tree with ProtectedRoute wrappers
│   │   └── main.jsx
│   ├── .env.example           # Frontend environment template
│   ├── .env                   # Frontend local API base URL (http://127.0.0.1:8000)
│   ├── package.json
│   └── vite.config.js
│
└── _backups/                  # Backup copies of original project files
```

---

## 🚀 Windows PowerShell Quick Start Guide

Follow these exact steps in Windows PowerShell to start both the backend and frontend.

### 1. Backend Setup & Startup

Open a PowerShell terminal in `D:\main_project`:

```powershell
# Navigate to the project root
cd D:\main_project

# Activate the existing virtual environment
.\myenv\Scripts\Activate.ps1

# (Optional) Verify or install backend dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
uvicorn main:api --reload --host 127.0.0.1 --port 8000
```

> **Backend URLs**:
> - API Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
> - Interactive Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
> - OpenAPI JSON: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

---

### 2. Frontend Setup & Startup

Open a **second** PowerShell terminal in `D:\main_project`:

```powershell
# Navigate to the frontend directory
cd D:\main_project\frontend

# Install dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev
```

> **Frontend URL**:
> - Web Application: [http://localhost:5173](http://localhost:5173)

Alternatively, from the project root you can simply run:
```powershell
npm run dev
```

---

### 3. Running Automated Tests

To execute the automated test suites covering all backend endpoints, authentication, task isolation, and end-to-end integration:

```powershell
cd D:\main_project
.\myenv\Scripts\pytest.exe tests\ -v
```

All 9 test suites will run and report status.

---

## ⚙️ Environment Variables

### Backend (`.env`)
| Variable | Description | Default |
|:---|:---|:---|
| `JWT_SECRET_KEY` | Secret key used for signing JWT access and reset tokens | `buisease-dev-secret-key-...` |
| `JWT_ALGORITHM` | Algorithm for token signatures | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token validity duration | `1440` (24 hours) |
| `CORS_ORIGINS` | Permitted origins for frontend browser communication | `http://localhost:5173,http://127.0.0.1:5173` |
| `MAIL_USERNAME` | SMTP email address (optional) | `your_email@gmail.com` |
| `MAIL_PASSWORD` | SMTP app password (optional) | `your_app_password` |
| `MAIL_SERVER` | SMTP host | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |

*Note: If real SMTP credentials are not configured in `.env`, the `/users/recover-credentials` endpoint safely operates in development mode by generating and returning the valid single-use reset token directly.*

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|:---|:---|:---|
| `VITE_API_BASE_URL` | Base URL of the running FastAPI backend | `http://127.0.0.1:8000` |

---

## 🛠️ Common Troubleshooting

1. **PowerShell Script Execution Policy Error**:
   If `.\myenv\Scripts\Activate.ps1` produces a script execution restriction error:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\myenv\Scripts\Activate.ps1
   ```

2. **Port 8000 or 5173 Already in Use**:
   - Check active ports: `Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue`
   - Start Uvicorn on an alternate port: `uvicorn main:api --reload --port 8080` (and update `frontend/.env` accordingly).

3. **CORS Network Errors in Browser**:
   - Ensure the FastAPI server is running on `http://127.0.0.1:8000`.
   - Confirm `CORS_ORIGINS` in `.env` includes `http://localhost:5173`.
