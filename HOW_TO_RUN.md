# BookNest – How to Run the Project

## Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed
- Firebase project with Firestore + Storage enabled
- `firebase_credentials.json` in the root folder
- `.env` file configured (see `.env` for all required variables)

---

## Step 1: Backend Setup (Django)

Open a terminal in the project root: `c:\Workspace\booknest\booknest\`

```bash
# Activate virtual environment
venv\Scripts\Activate.ps1          # PowerShell
# OR
venv\Scripts\activate              # CMD

# Install dependencies (first time only)
pip install -r requirements.txt

# Run database migrations (first time only, for JWT blacklist)
python manage.py migrate

# Seed sample data (first time only – adds categories, books, admin user)
python fixtures/seed_data.py

# Start the Django backend server
python manage.py runserver
```

Backend will be running at: **http://127.0.0.1:8000**

---

## Step 2: Frontend Setup (React)

Open a **second terminal** and navigate to the frontend folder:

```bash
cd booknest-frontend\booknest-frontend

# Install dependencies (first time only)
npm install

# Start the React dev server
npm start
```

Frontend will be running at: **http://localhost:3000**

---

## Step 3: Open in Browser

Go to **http://localhost:3000** — the app is ready!

---

## Quick Reference

| What | Command | Where |
|------|---------|-------|
| Start backend | `python manage.py runserver` | Root folder |
| Start frontend | `npm start` | `booknest-frontend\booknest-frontend\` |
| Seed data | `python fixtures/seed_data.py` | Root folder |
| Install backend deps | `pip install -r requirements.txt` | Root folder |
| Install frontend deps | `npm install` | `booknest-frontend\booknest-frontend\` |

---

## Ports

| Service | URL |
|---------|-----|
| Django API | http://127.0.0.1:8000 |
| React App | http://localhost:3000 |

The React dev server automatically proxies `/api/v1/*` requests to Django.

---

## Accounts

- **Regular user**: Register via the app at http://localhost:3000/register
- **Admin user**: Created by the seed script, or set `is_admin: true` in Firestore for any user

Admin users see an **Admin** link in the navbar to manage books and categories.

---

## Daily Workflow (after first-time setup)

1. Open terminal → activate venv → `python manage.py runserver`
2. Open second terminal → `cd booknest-frontend\booknest-frontend` → `npm start`
3. Open http://localhost:3000




cd c:\Workspace\booknest\booknest
venv\Scripts\Activate.ps1
python manage.py runserver



cd c:\Workspace\booknest\booknest\booknest-frontend\booknest-frontend
npm start