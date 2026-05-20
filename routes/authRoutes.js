const express = require('express');
const { registerStudent, loginStudent, loginTeacher, uploadMulter } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/student/register -> register + photo upload
router.post('/student/register', uploadMulter.single('photo'), registerStudent);

// POST /api/auth/student/login -> login, return JWT
router.post('/student/login', loginStudent);

// POST /api/auth/teacher/login -> login, return JWT
router.post('/teacher/login', loginTeacher);

module.exports = router;
