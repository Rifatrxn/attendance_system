const { Attendance, User, Device } = require('../models');
const { sequelize } = require('../config/database');
const FaceRecognitionService = require('../services/faceRecognition');
const FingerprintService = require('../services/fingerprint');
const RFIDService = require('../services/rfid');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class AttendanceController {
  async identifyAndRecord(req, res, next) {
    try {
      let { method, verificationData, deviceId } = req.body;

      if (!method || !verificationData) {
        return ResponseUtil.error(res, 'Method dan verificationData diperlukan', 400);
      }

      let user = null;
      let verificationResult = null;

      // 1. Search user by method
      if (method === 'face') {
        // Cari semua user dengan face data
        const allUsers = await User.findAll({
          where: { isActive: true },
          attributes: ['id', 'name', 'username', 'faceData', 'registeredMethods']
        });

        // Compare verificationData dengan setiap user
        for (const u of allUsers) {
          if (!u.faceData || !u.faceData.descriptor) continue;
          
          const result = await FaceRecognitionService.verifyFace(
            u.id,
            verificationData,
            u.faceData.descriptor
          );

          if (result.success) {
            user = u;
            verificationResult = result;
            break;
          }
        }
      } else if (method === 'card') {
        // Cari user by card UID
        user = await User.findOne({
          where: { isActive: true },
          attributes: ['id', 'name', 'username', 'cardData', 'registeredMethods']
        });
        
        if (user && user.cardData && user.cardData.cardUid === verificationData) {
          verificationResult = { success: true, confidence: 100 };
        }
      } else if (method === 'fingerprint') {
        // Placeholder: cari by fingerprint
        user = await User.findOne({ where: { isActive: true } });
        if (user) {
          verificationResult = { success: true, confidence: 85 };
        }
      }

      if (!user || !verificationResult || !verificationResult.success) {
        return ResponseUtil.error(res, 'User tidak dikenali. Silakan registrasi terlebih dahulu.', 401);
      }

      // 2. Record attendance
      const attendance = await Attendance.create({
        userId: user.id,
        method: method,
        deviceId: deviceId || 'WEB_SCANNER_AUTO',
        verificationData: verificationResult,
        status: 'present'
      });

      const responseData = {
        id: attendance.id,
        userId: user.id,
        userName: user.name,
        username: user.username,
        method: attendance.method,
        timestamp: attendance.createdAt,
        status: attendance.status,
        verification: verificationResult
      };

      return ResponseUtil.success(res, 'Absensi berhasil dicatat otomatis!', responseData, 201);
    } catch (error) {
      next(error);
    }
  }

  async recordAttendance(req, res, next) {
    try {
      let { userId, username, method, deviceId, verificationData, notes } = req.body;

      // 1. Cari user berdasarkan userId atau username
      let user;
      if (userId) {
        user = await User.findByPk(userId);
      } else if (username) {
        user = await User.findOne({ where: { username } });
      } else if (req.user) {
        user = req.user;
      }

      if (!user) {
        return ResponseUtil.error(res, 'Pengguna tidak ditemukan. Silakan registrasi terlebih dahulu.', 404);
      }

      const activeMethod = method || 'face';

      // 2. Verifikasi biometric / kartu
      let verificationResult;
      switch (activeMethod) {
        case 'face':
          if (!user.faceData || !user.faceData.descriptor) {
            return ResponseUtil.error(res, 'User belum mendaftarkan wajah. Silakan registrasi terlebih dahulu.', 400);
          }
          verificationResult = await FaceRecognitionService.verifyFace(user.id, verificationData, user.faceData.descriptor);
          break;
        case 'fingerprint':
          verificationResult = await FingerprintService.verifyFingerprint(verificationData);
          break;
        case 'card':
          verificationResult = await RFIDService.verifyCard(verificationData || user.cardData?.cardUid || 'CARD_DEFAULT');
          break;
        default:
          return ResponseUtil.error(res, `Metode ${activeMethod} tidak valid`, 400);
      }

      if (!verificationResult.success) {
        return ResponseUtil.error(res, 'Verifikasi gagal. Wajah atau identitas tidak cocok.', 401);
      }

      // 3. Simpan record absensi
      const attendance = await Attendance.create({
        userId: user.id,
        method: activeMethod,
        deviceId: deviceId || 'WEB_SCANNER_01',
        verificationData: verificationResult,
        notes: notes || null,
        status: 'present'
      });

      const responseData = {
        id: attendance.id,
        userId: user.id,
        userName: user.name,
        username: user.username,
        method: attendance.method,
        deviceId: attendance.deviceId,
        timestamp: attendance.timestamp || attendance.createdAt,
        status: attendance.status,
        verification: verificationResult
      };

      return ResponseUtil.success(res, 'Absensi berhasil dicatat!', responseData, 201);
    } catch (error) {
      next(error);
    }
  }

  async getRecentLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '15', 10);
      const logs = await Attendance.findAll({
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }],
        order: [['createdAt', 'DESC']],
        limit: limit
      });

      return ResponseUtil.success(res, 'Riwayat absensi terbaru berhasil diambil', logs);
    } catch (error) {
      next(error);
    }
  }

  async getUserAttendance(req, res, next) {
    try {
      const { userId } = req.params;
      const { startDate, endDate, method } = req.query;

      const whereClause = { userId };
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }
      if (method) {
        whereClause.method = method;
      }

      const attendances = await Attendance.findAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }],
        order: [['createdAt', 'DESC']]
      });

      return ResponseUtil.success(res, 'Data absensi pengguna berhasil diambil', attendances);
    } catch (error) {
      next(error);
    }
  }

  async getDeviceAttendance(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { startDate, endDate } = req.query;

      const whereClause = { deviceId };
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }

      const attendances = await Attendance.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      return ResponseUtil.success(res, 'Data absensi perangkat berhasil diambil', attendances);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }

      const stats = await Attendance.findAll({
        attributes: [
          'method',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: whereClause,
        group: ['method']
      });

      const totalCount = await Attendance.count({ where: whereClause });

      return ResponseUtil.success(res, 'Statistik absensi berhasil diambil', {
        byMethod: stats,
        total: totalCount
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttendanceController();

