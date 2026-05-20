# Smart Attendance System
https://attedancesystem-ah1n.onrender.com/

A complete Smart Attendance web application utilizing **NodeJS**, **Express**, **PostgreSQL**, **AngularJS**, and **Python (OpenCV & face_recognition)**.

🌐 **Live Demo**: [Deployed on Render](https://smart-attendance.onrender.com) _(URL will update after deployment)_

---

## Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/smart-attendance.git
cd smart-attendance
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values (database URL, JWT secret, email credentials)
```

### 3. Database Setup
**Option A — Cloud (Neon, recommended):**
1. Create a free database at [neon.tech](https://neon.tech)
2. Run `database/schema.sql` in the Neon SQL Editor
3. Set `DATABASE_URL` in your `.env`

**Option B — Local PostgreSQL:**
```bash
createdb attendance_db
psql -d attendance_db -f database/schema.sql
# Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
```

### 4. Python Environment (for Face Recognition)
```bash
conda create -n attendance_env python=3.9
conda activate attendance_env
pip install face_recognition opencv-python numpy
```

### 5. Run
```bash
node server.js
# Visit http://localhost:3000
```

---

## Cloud Deployment (Render + Neon)

This app is deployed for free using:
- **[Render](https://render.com)** — Node.js backend hosting (free tier)
- **[Neon](https://neon.tech)** — Serverless PostgreSQL (free forever)

### Deploy Your Own
1. Fork this repo
2. Create a Neon database and run `database/schema.sql`
3. On Render, create a **Web Service** connected to your GitHub repo
4. Set environment variables in Render dashboard:
   - `DATABASE_URL` = Neon connection string
   - `JWT_SECRET` = any strong random string
   - `EMAIL_USER` = Gmail address
   - `EMAIL_PASS` = Gmail App Password
   - `NODE_ENV` = production
5. Build command: `npm install` | Start command: `npm start`

> **Note:** Face recognition requires a local webcam + Python. It works when running locally but is unavailable in cloud deployment. All other features (manual attendance, dashboards, email alerts) work perfectly.

---

## Features
- Fully error-handled API endpoints
- Safe and secure JWT authentication
- Multer automated photo uploads to directory
- Deep integration between Node backend and Python ML script
- Responsive, aesthetic UI with Glassmorphism + CDN AngularJS
- Automated email notification rules via Nodemailer
- Real-time attendance updates via Socket.IO

## Default Test Credentials
- **Teacher**: `teacher@test.com` / `password123`
- **Student**: Register a new student to test

## First Use
1. **Register a student with a photo** on the Student Portal (`/student/register.html`)
2. **Train faces** (locally):
   ```bash
   node -e "require('./controllers/attendanceController').trainFaces()"
   ```
3. **Start attendance** from the Teacher Dashboard (`/teacher/attendance.html`)

---

## Syllabus Topics Unified in Project

- **Unit 1**: CSS rules/selectors, Responsive design, JavaScript syntax, Error Handling, Event handling, DOM, AJAX.
- **Unit 2 & 3**: MVC Architecture, Data binding, Controllers, $scope object, Built-in Filters, Built-in services ($http, $window), Modules, and Directives (ng-repeat, ng-show, ng-hide, ng-click).
- **Unit 4**: Forms/Input elements, Validation, Single Page Application (SPA), AJAX with AngularJS.
- **Unit 5**: NodeJS Modules, Creating Web Servers, NPM, Serving Static Files, Express.js, Configuring Routes, REST API, File Upload (Multer), and Nodemailer.
- **Units 6 & 7**: Database operations (Insert, Query, Update, Delete) implemented via PostgreSQL.
