# Smart Attendance System

A complete Smart Attendance web application utilizing **NodeJS**, **Express**, **PostgreSQL**, **AngularJS**, and **Python (OpenCV & face_recognition)**.

## Project Setup Instructions

### 1. PostgreSQL Setup
Create your database and run the schema script:
\`\`\`bash
createdb attendance_db
psql -d attendance_db -f database/schema.sql
\`\`\`

### 2. Anaconda Setup
Set up the python environment with necessary libraries:
\`\`\`bash
conda create -n attendance_env python=3.9
conda activate attendance_env
pip install face_recognition opencv-python numpy
\`\`\`

### 3. NodeJS Setup
Install dependencies and configure:
\`\`\`bash
npm install
cp .env.example .env  # fill in your values
node server.js
\`\`\`

*(Ensure that the `.env` file corresponds closely to the provided configurations in the project root)*

### 4. First Use
1. **Register a student with a photo** on the Student Portal (`/student/register.html`).
2. **Train faces:** run the Node script manually or the server will auto-trigger it on upload.
   \`\`\`bash
   node -e "require('./controllers/attendanceController').trainFaces()"
   \`\`\`
3. **Start attendance** from the Teacher Dashboard (`/teacher/attendance.html`) and view automatic recognition output. Save to database after processing!

## Features included
- Fully error handled API endpoints
- Safe and secure JWT authentication.
- Multer automated photo uploads to directory.
- Deep integration between Node backend and Python ML script.
- Responsive, aesthetic UI with Glassmorphism implemented using purely CDN AngularJS and custom styles.
- Automated email notification rules via Nodemailer.

## Syllabus Topics Unified in Project

Here are the topics from the official syllabus that have been implemented in this project:

- **Unit 1**: CSS rules/selectors, Responsive design, JavaScript syntax, Error Handling, Event handling, DOM, AJAX.
- **Unit 2 & 3**: MVC Architecture, Data binding, Controllers, $scope object, Built-in Filters, Built-in services ($http, $window), Modules, and Directives (ng-repeat, ng-show, ng-hide, ng-click).
- **Unit 4**: Forms/Input elements, Validation, Single Page Application (SPA), AJAX with AngularJS.
- **Unit 5**: NodeJS Modules, Creating Web Servers, NPM, Serving Static Files, Express.js, Configuring Routes, REST API, File Upload (Multer), and Nodemailer.
- **Units 6 & 7**: Database operations (Insert, Query, Update, Delete) implemented via PostgreSQL.
