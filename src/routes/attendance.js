const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// Auto-identify & record (no username needed)
router.post('/identify', (req, res, next) => AttendanceController.identifyAndRecord(req, res, next));

// Public / Kiosk friendly endpoints
router.post('/', optionalAuth, (req, res, next) => AttendanceController.recordAttendance(req, res, next));
router.get('/recent', (req, res, next) => AttendanceController.getRecentLogs(req, res, next));
router.get('/stats', (req, res, next) => AttendanceController.getAttendanceStats(req, res, next));

// User specific attendance
router.get('/user/:userId', optionalAuth, (req, res, next) => AttendanceController.getUserAttendance(req, res, next));
router.get('/device/:deviceId', (req, res, next) => AttendanceController.getDeviceAttendance(req, res, next));

module.exports = router;

