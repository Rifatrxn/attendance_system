const { User } = require('../models');
const ResponseUtil = require('../utils/response');
const FaceRecognitionService = require('../services/faceRecognition');
const FingerprintService = require('../services/fingerprint');
const RFIDService = require('../services/rfid');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, username, email, password, registeredMethods, faceDescriptor, cardUid, fingerprintData } = req.body;

      if (!name || !username) {
        return ResponseUtil.error(res, 'Nama dan username wajib diisi', 400);
      }

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username: username },
            ...(email ? [{ email: email }] : [])
          ]
        }
      });

      if (existingUser) {
        return ResponseUtil.error(res, 'Username atau email sudah digunakan', 400);
      }

      let parsedMethods = registeredMethods || ['face'];
      if (typeof parsedMethods === 'string') {
        try {
          parsedMethods = JSON.parse(parsedMethods);
        } catch (_) {
          parsedMethods = [parsedMethods];
        }
      }

      // Process biometric data
      let faceDataObj = null;
      if (faceDescriptor && parsedMethods.includes('face')) {
        faceDataObj = await FaceRecognitionService.registerFace(username, faceDescriptor);
      }

      let cardDataObj = null;
      if (cardUid && parsedMethods.includes('card')) {
        cardDataObj = await RFIDService.registerCard(username, cardUid);
      }

      let fpDataObj = null;
      if (fingerprintData && parsedMethods.includes('fingerprint')) {
        fpDataObj = await FingerprintService.registerFingerprint(username, fingerprintData);
      }

      const user = await User.create({
        name,
        username,
        email: email || `${username}@attendance.local`,
        password: password || '123456',
        registeredMethods: parsedMethods,
        faceData: faceDataObj,
        cardData: cardDataObj,
        fingerprintData: fpDataObj
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'super_secret_jwt_key_attendance_system_2026',
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        registeredMethods: user.registeredMethods,
        token: token,
        createdAt: user.createdAt
      };

      return ResponseUtil.success(res, 'Pengguna berhasil didaftarkan', userResponse, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password, method } = req.body;

      if (!username) {
        return ResponseUtil.error(res, 'Username wajib diisi', 400);
      }

      const user = await User.findOne({ where: { username } });
      if (!user || !user.isActive) {
        return ResponseUtil.error(res, 'Pengguna tidak ditemukan atau tidak aktif', 404);
      }

      // Jika password disertakan, verifikasi password
      if (password) {
        const isValidPassword = await user.matchPassword(password);
        if (!isValidPassword) {
          return ResponseUtil.error(res, 'Password salah', 401);
        }
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'super_secret_jwt_key_attendance_system_2026',
        { expiresIn: '24h' }
      );

      user.lastLogin = new Date();
      await user.save();

      const userResponse = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        registeredMethods: user.registeredMethods,
        token: token
      };

      return ResponseUtil.success(res, 'Login berhasil', userResponse);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });
      return ResponseUtil.success(res, 'Data pengguna berhasil diambil', user);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'name', 'username', 'email', 'registeredMethods', 'createdAt', 'lastLogin'],
        order: [['createdAt', 'DESC']]
      });
      return ResponseUtil.success(res, 'Daftar pengguna berhasil diambil', users);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      return ResponseUtil.success(res, 'Logout berhasil');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

