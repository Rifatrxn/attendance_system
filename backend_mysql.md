# Multi-Method Attendance System - MySQL Edition

## package.json
```json
{
  "name": "multi-method-attendance-mysql",
  "version": "1.0.0",
  "description": "Sistem absensi multi-metode (wajah, sidik jari, kartu/RFID) dengan MySQL",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "sequelize": "^6.33.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "nodemon": "^3.0.1",
    "jest": "^29.6.3",
    "supertest": "^6.3.0"
  }
}
```

## server.js
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/config/database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Sync database
sequelize.sync()
  .then(() => {
    console.log('Database MySQL terhubung dan disinkronisasi');
  })
  .catch(err => {
    console.error('Gagal terhubung ke MySQL:', err);
  });

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/attendance', require('./src/routes/attendance'));
app.use('/api/devices', require('./src/routes/device'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## src/config/database.js
```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'attendance_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

module.exports = { sequelize };
```

## src/models/User.js
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nama diperlukan' }
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Username sudah digunakan'
    },
    validate: {
      notEmpty: { msg: 'Username diperlukan' }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Email sudah digunakan'
    },
    validate: {
      isEmail: { msg: 'Email tidak valid' },
      notEmpty: { msg: 'Email diperlukan' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: { args: [6, 100], msg: 'Password minimal 6 karakter' },
      notEmpty: { msg: 'Password diperlukan' }
    }
  },
  registeredMethods: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidMethods(value) {
        const valid = ['face', 'fingerprint', 'card'];
        if (!value.every(method => valid.includes(method))) {
          throw new Error('Metode tidak valid');
        }
      }
    }
  },
  faceData: {
    type: DataTypes.JSON,
    defaultValue: null
  },
  fingerprintData: {
    type: DataTypes.JSON,
    defaultValue: null
  },
  cardData: {
    type: DataTypes.JSON,
    defaultValue: null
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Metode untuk verifikasi password
User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
```

## src/models/Attendance.js
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  method: {
    type: DataTypes.ENUM,
    values: ['face', 'fingerprint', 'card'],
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM,
    values: ['present', 'absent', 'late', 'excused'],
    defaultValue: 'present'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verificationData: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'attendances',
  timestamps: true
});

module.exports = Attendance;
```

## src/models/Device.js
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nama perangkat diperlukan' }
    }
  },
  type: {
    type: DataTypes.ENUM,
    values: ['face', 'fingerprint', 'card'],
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'ID perangkat sudah digunakan'
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM,
    values: ['active', 'inactive', 'maintenance', 'error'],
    defaultValue: 'active'
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'devices',
  timestamps: true
});

module.exports = Device;
```

## src/services/faceRecognition.js
```javascript
const fs = require('fs').promises;
const path = require('path');

class FaceRecognitionService {
  constructor() {
    this.modelsDir = path.join(__dirname, '..', 'models', 'face');
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async registerFace(userId, imageData) {
    try {
      if (!imageData || !imageData.startsWith('data:image')) {
        throw new Error('Invalid image format');
      }

      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const filename = `face_${userId}_${Date.now()}.jpg`;
      const filepath = path.join(this.tempDir, filename);
      
      await fs.writeFile(filepath, imageBuffer);

      const encoding = await this.extractFaceEncoding(filepath);
      
      return {
        faceId: userId,
        encoding: encoding,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Face registration failed: ${error.message}`);
    }
  }

  async verifyFace(userId, imageData) {
    try {
      const userData = await this.getUserFaceData(userId);
      if (!userData) {
        throw new Error('User face data not found');
      }

      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const tempFile = path.join(this.tempDir, `temp_${Date.now()}.jpg`);
      await fs.writeFile(tempFile, imageBuffer);

      const inputEncoding = await this.extractFaceEncoding(tempFile);
      const similarity = this.compareEncodings(userData.encoding, inputEncoding);
      
      await fs.unlink(tempFile);

      return {
        success: similarity > 0.85,
        confidence: similarity,
        match: similarity > 0.85
      };
    } catch (error) {
      throw new Error(`Face verification failed: ${error.message}`);
    }
  }

  async extractFaceEncoding(imagePath) {
    // Placeholder for face encoding extraction
    // In production, this would use OpenCV, FaceNet, or similar
    return `encoding_${Date.now()}`;
  }

  compareEncodings(encoding1, encoding2) {
    // Placeholder for encoding comparison
    return Math.random() * 0.5 + 0.5; // Random similarity 0.5-1.0
  }

  async getUserFaceData(userId) {
    // Placeholder for database retrieval
    return null;
  }

  async cleanup() {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = new FaceRecognitionService();
```

## src/services/fingerprint.js
```javascript
const fs = require('fs').promises;
const path = require('path');

class FingerprintService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async registerFingerprint(userId, templateData) {
    try {
      if (!templateData) {
        throw new Error('Invalid fingerprint template');
      }

      const templateId = `template_${userId}_${Date.now()}`;
      
      return {
        templateId: templateId,
        template: templateData,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Fingerprint registration failed: ${error.message}`);
    }
  }

  async verifyFingerprint(templateData) {
    try {
      return {
        success: Math.random() > 0.2,
        match: Math.random() > 0.2,
        confidence: Math.random() * 0.3 + 0.7
      };
    } catch (error) {
      throw new Error(`Fingerprint verification failed: ${error.message}`);
    }
  }

  async getUserFingerprintTemplate(userId) {
    return null;
  }
}

module.exports = new FingerprintService();
```

## src/services/rfid.js
```javascript
const fs = require('fs').promises;
const path = require('path');

class RFIDService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async registerCard(userId, cardUid) {
    try {
      if (!cardUid) {
        throw new Error('Invalid card UID');
      }

      return {
        cardUid: cardUid,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Card registration failed: ${error.message}`);
    }
  }

  async verifyCard(cardUid) {
    try {
      if (!cardUid) {
        throw new Error('Invalid card UID');
      }

      return {
        success: /^[0-9A-F]{8,}$/i.test(cardUid),
        cardUid: cardUid
      };
    } catch (error) {
      throw new Error(`Card verification failed: ${error.message}`);
    }
  }

  async scanCard() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`CARD_${Date.now().toString(16).toUpperCase()}`);
      }, 500);
    });
  }
}

module.exports = new RFIDService();
```

## src/controllers/auth.js
```javascript
const User = require('../models/User');
const ResponseUtil = require('../utils/response');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, username, email, password, registeredMethods } = req.body;

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }]
        }
      });

      if (existingUser) {
        return ResponseUtil.error(res, 'Username atau email sudah digunakan', 400);
      }

      const user = await User.create({
        name,
        username,
        email,
        password,
        registeredMethods: registeredMethods || []
      });

      const userResponse = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        registeredMethods: user.registeredMethods,
        createdAt: user.createdAt
      };

      ResponseUtil.success(res, 'User registered successfully', userResponse, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password, method } = req.body;

      const user = await User.findOne({ where: { username } });
      if (!user || !user.isActive) {
        return ResponseUtil.error(res, 'Invalid credentials', 401);
      }

      const isValidPassword = await user.matchPassword(password);
      if (!isValidPassword) {
        return ResponseUtil.error(res, 'Invalid credentials', 401);
      }

      if (method && !user.registeredMethods.includes(method)) {
        return ResponseUtil.error(res, 'Method not registered for this user', 400);
      }

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
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

      ResponseUtil.success(res, 'Login successful', userResponse);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      ResponseUtil.success(res, 'User data retrieved', user);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      ResponseUtil.success(res, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
```

## src/controllers/attendance.js
```javascript
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Device = require('../models/Device');
const FaceRecognitionService = require('../services/faceRecognition');
const FingerprintService = require('../services/fingerprint');
const RFIDService = require('../services/rfid');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class AttendanceController {
  async recordAttendance(req, res, next) {
    try {
      const { userId, method, deviceId, verificationData, notes } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }

      if (!user.registeredMethods.includes(method)) {
        return ResponseUtil.error(res, 'Method not registered for this user', 400);
      }

      let verificationResult;
      switch (method) {
        case 'face':
          verificationResult = await FaceRecognitionService.verifyFace(userId, verificationData);
          break;
        case 'fingerprint':
          verificationResult = await FingerprintService.verifyFingerprint(verificationData);
          break;
        case 'card':
          verificationResult = await RFIDService.verifyCard(verificationData);
          break;
        default:
          return ResponseUtil.error(res, 'Invalid method', 400);
      }

      if (!verificationResult.success) {
        return ResponseUtil.error(res, 'Verification failed', 400);
      }

      const attendance = await Attendance.create({
        userId: userId,
        method: method,
        deviceId: deviceId,
        verificationData: verificationResult,
        notes: notes,
        status: 'present'
      });

      const attendanceResponse = {
        id: attendance.id,
        userId: attendance.userId,
        method: attendance.method,
        deviceId: attendance.deviceId,
        timestamp: attendance.timestamp,
        status: attendance.status,
        verification: verificationResult
      };

      ResponseUtil.success(res, 'Attendance recorded successfully', attendanceResponse, 201);
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
        whereClause.timestamp = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }
      if (method) {
        whereClause.method = method;
      }

      const attendances = await Attendance.findAll({
        where: whereClause,
        order: [['timestamp', 'DESC']]
      });

      ResponseUtil.success(res, 'Attendance records retrieved', attendances);
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
        whereClause.timestamp = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }

      const attendances = await Attendance.findAll({
        where: whereClause,
        order: [['timestamp', 'DESC']]
      });

      ResponseUtil.success(res, 'Device attendance records retrieved', attendances);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.timestamp = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }

      const stats = await Attendance.findAll({
        attributes: [
          'method',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('DATE', sequelize.col('timestamp')), 'date']
        ],
        where: whereClause,
        group: ['method', 'date'],
        order: [['date', 'DESC']]
      });

      ResponseUtil.success(res, 'Attendance statistics retrieved', stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttendanceController();
```

## src/controllers/device.js
```javascript
const Device = require('../models/Device');
const ResponseUtil = require('../utils/response');

class DeviceController {
  async registerDevice(req, res, next) {
    try {
      const { name, type, deviceId, location, settings } = req.body;

      const existingDevice = await Device.findOne({ where: { deviceId } });
      if (existingDevice) {
        return ResponseUtil.error(res, 'Device ID already registered', 400);
      }

      const device = await Device.create({
        name,
        type,
        deviceId,
        location,
        settings: settings || {}
      });

      ResponseUtil.success(res, 'Device registered successfully', device, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAllDevices(req, res, next) {
    try {
      const devices = await Device.findAll({ order: [['name', 'ASC']] });
      ResponseUtil.success(res, 'Devices retrieved', devices);
    } catch (error) {
      next(error);
    }
  }

  async getDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Device not found', 404);
      }
      ResponseUtil.success(res, 'Device retrieved', device);
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
        return ResponseUtil.error(res, 'Device not found', 404);
      }

      await device.update(updates);
      ResponseUtil.success(res, 'Device updated successfully', device);
    } catch (error) {
      next(error);
    }
  }

  async deleteDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Device not found', 404);
      }
      await device.destroy();
      ResponseUtil.success(res, 'Device deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOne({ where: { deviceId } });
      if (!device) {
        return ResponseUtil.error(res, 'Device not found', 404);
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

      ResponseUtil.success(res, 'Device status retrieved', status);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeviceController();
```

## src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ResponseUtil = require('../utils/response');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return ResponseUtil.error(res, 'Access token required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return ResponseUtil.error(res, 'User not found', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.error(res, 'Invalid token', 401);
    }
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return ResponseUtil.error(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorize
};
```

## src/utils/response.js
```javascript
class ResponseUtil {
  static success(res, message, data = null, statusCode = 200) {
    const response = {
      success: true,
      message: message
    };

    if (data !== null) {
      response.data = data;
    }

    res.status(statusCode).json(response);
  }

  static error(res, message, statusCode = 500) {
    const response = {
      success: false,
      message: message
    };

    res.status(statusCode).json(response);
  }
}

module.exports = ResponseUtil;
```

## src/utils/logger.js
```javascript
const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
  }

  async info(message, meta = {}) {
    await this.writeLog('info', message, meta);
  }

  async error(message, meta = {}) {
    await this.writeLog('error', message, meta);
  }

  async writeLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta
    };

    try {
      const logFile = path.join(
        this.logDir,
        `${level}_${timestamp.split('T')[0]}.log`
      );

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }
}

module.exports = new Logger();
```

## .env.example
```env
PORT=3000
DB_NAME=attendance_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
LOG_LEVEL=info
FACE_RECOGNITION_MODEL_PATH=./models/face_recognition_model.yml
FINGERPRINT_DEVICE_PATH=/dev/ttyACM0
RFID_DEVICE_PATH=/dev/ttyACM1
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Attendance
- `POST /api/attendance` - Record attendance
- `GET /api/attendance/user/:userId` - Get user attendance
- `GET /api/attendance/device/:deviceId` - Get device attendance
- `GET /api/attendance/stats` - Get attendance statistics

### Devices
- `POST /api/devices` - Register new device (admin only)
- `GET /api/devices` - Get all devices
- `GET /api/devices/:deviceId` - Get device
- `PUT /api/devices/:deviceId` - Update device (admin only)
- `DELETE /api/devices/:deviceId` - Delete device (admin only)
- `GET /api/devices/:deviceId/status` - Get device status
```