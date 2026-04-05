const express = require('express');
const { getStudents, getSubjects, sendEmail, getDailyAttendance, getDashboardStats, getAttendanceReport, updateStudent, getMonthlyStats } = require('../controllers/teacherController');
const attendanceRoutes = require('./attendanceRoutes');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(restrictTo('teacher'));

router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.get('/monthly-stats', getMonthlyStats);
router.get('/subjects', getSubjects);
router.get('/stats', getDashboardStats);
router.get('/attendance-report', getAttendanceReport);
router.post('/email/send', sendEmail);
router.get('/daily-attendance', getDailyAttendance);

// Mount attendance routes under /api/teacher/attendance
router.use('/attendance', attendanceRoutes);

module.exports = router;
