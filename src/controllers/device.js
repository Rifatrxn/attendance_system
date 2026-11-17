const { Device } = require('../models');
const ResponseUtil = require('../utils/response');

class DeviceController {
  async registerDevice(req, res, next) {
    try {
      const { name, type, deviceId, location, settings } = req.body;

      if (!name || !type || !deviceId) {
        return ResponseUtil.error(res, 'Name, type, and deviceId are required', 400);
      }

      const existingDevice = await Device.findOne({ where: { deviceId } });
      if (existingDevice) {
        return ResponseUtil.error(res, 'ID perangkat sudah terdaftar', 400);
      }

      const device = await Device.create({
        name,
        type,
        deviceId,
        location,
        settings: settings || {}
      });

      return ResponseUtil.success(res, 'Perangkat berhasil didaftarkan', device, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAllDevices(req, res, next) {
    try {
      const devices = await Device.findAll({ order: [['name', 'ASC']] });
      return ResponseUtil.success(res, 'Daftar perangkat berhasil diambil', devices);
    } catch (error) {
      next(error);
    }
  }

  async getDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Perangkat tidak ditemukan', 404);
      }
      return ResponseUtil.success(res, 'Perangkat ditemukan', device);
    } catch (error) {
      next(error);
    }
  }

  async updateDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const updates = req.body;

      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Perangkat tidak ditemukan', 404);
      }

      await device.update(updates);
      return ResponseUtil.success(res, 'Perangkat berhasil diperbarui', device);
    } catch (error) {
      next(error);
    }
  }

  async deleteDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Perangkat tidak ditemukan', 404);
      }
      await device.destroy();
      return ResponseUtil.success(res, 'Perangkat berhasil dihapus');
    } catch (error) {
      next(error);
    }
  }

  async getDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Perangkat tidak ditemukan', 404);
      }

      device.lastSeen = new Date();
      await device.save();

      const status = {
        deviceId: device.deviceId,
        name: device.name,
        type: device.type,
        status: device.status,
        lastSeen: device.lastSeen,
        location: device.location
      };

      return ResponseUtil.success(res, 'Status perangkat berhasil diambil', status);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeviceController();

