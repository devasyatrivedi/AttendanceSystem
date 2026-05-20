const express = require('express');
const { triggerFaceRecognition, stopFaceRecognition, saveManualAttendance, getAttendanceByDate } = require('../controllers/attendanceController');

const router = express.Router();

router.post('/face', triggerFaceRecognition);
router.post('/stop', stopFaceRecognition);
router.post('/manual', saveManualAttendance);
router.get('/fetch', getAttendanceByDate);

module.exports = router;
