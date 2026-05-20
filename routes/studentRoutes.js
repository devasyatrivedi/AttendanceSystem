const express = require('express');
const { getDashboard, getAttendance, getRequired, getAttendanceCalendar } = require('../controllers/studentController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(restrictTo('student'));

router.get('/dashboard', getDashboard);
router.get('/attendance', getAttendance);
router.get('/calendar', getAttendanceCalendar);
router.get('/required', getRequired);

module.exports = router;
