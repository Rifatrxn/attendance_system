const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/device');
const { optionalAuth, authorize } = require('../middleware/auth');

router.get('/', (req, res, next) => DeviceController.getAllDevices(req, res, next));
router.get('/:deviceId', (req, res, next) => DeviceController.getDevice(req, res, next));
router.get('/:deviceId/status', (req, res, next) => DeviceController.getDeviceStatus(req, res, next));

router.post('/', optionalAuth, (req, res, next) => DeviceController.registerDevice(req, res, next));
router.put('/:deviceId', optionalAuth, (req, res, next) => DeviceController.updateDevice(req, res, next));
router.delete('/:deviceId', optionalAuth, (req, res, next) => DeviceController.deleteDevice(req, res, next));

module.exports = router;

