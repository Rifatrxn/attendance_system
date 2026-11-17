const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ResponseUtil = require('../utils/response');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return ResponseUtil.error(res, 'Akses token diperlukan', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_attendance_system_2026');
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return ResponseUtil.error(res, 'Pengguna tidak ditemukan', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.error(res, 'Token tidak valid', 401);
    }
    next(error);
  }
};

// Middleware opsional untuk endpoint yang bisa diakses publik atau dengan token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_attendance_system_2026');
      const user = await User.findByPk(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (_) {
    // Ignore invalid token in optional auth
  }
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return ResponseUtil.error(res, 'Hak akses tidak mencukupi', 403);
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authorize
};

