# Multi-Method Attendance System Backend

## Overview
Node.js + Express backend untuk sistem absensi multi-metode. Mendukung face recognition, fingerprint verification, dan RFID/card scanning.

## Struktur Direktori
```
attendance-system/
├── server.js              # Server utama
├── package.json           # Dependensi
├── .env                   # Variabel lingkungan
├── src/
│   ├── config/            # Konfigurasi
│   │   └── database.js    # Koneksi database
│   ├── models/            # Model data
│   │   ├── User.js
│   │   ├── Attendance.js
│   │   └── Device.js
│   ├── controllers/       # Controller
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   └── device.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   └── device.js
│   ├── middleware/        # Middleware
│   │   ├── auth.js
│   │   └── error.js
│   ├── services/           # Layanan integrasi perangkat keras
│   │   ├── faceRecognition.js
│   │   ├── fingerprint.js
│   │   └── rfid.js
│   └── utils/              # Utilitas
│       ├── response.js
│       └── logger.js
└── public/                # Static files (frontend)
    └── index.html
```

## package.json
```json
{
  "name": "multi-method-attendance",
  "version": "1.0.0",
  "description": "Sistem absensi multi-metode (wajah, sidik jari, kartu/RFID)",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
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
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

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

## src/models/User.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama diperlukan']
  },
  username: {
    type: String,
    required: [true, "Username diperlukan"],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, "Email diperlukan"],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, "Password diperlukan"],
    minlength: [6, "Password minimal 6 karakter"]
  },
  registeredMethods: [{
    type: String,
    enum: ['face', 'fingerprint', 'card']
  }],
  faceData: {
    faceId: String,
    encoding: String,
    registeredAt: Date
  },
  fingerprintData: {
    templateId: String,
    template: String,
    registeredAt: Date
  },
  cardData: {
    cardUid: String,
    registeredAt: Date
  },
  attendanceHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
```

## src/models/Attendance.js
```javascript
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    enum: ['face', 'fingerprint', 'card'],
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  notes: {
    type: String,
    trim: true
  },
  verificationData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
```

## src/models/Device.js
```javascript
const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Nama perangkat diperlukan"],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['face', 'fingerprint', 'card']
  },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', DeviceSchema);
```

## src/services/faceRecognition.js
```javascript
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

class FaceRecognitionService {
  constructor() {
    this.modelsDir = path.join(__dirname, '..', 'models', 'face');
    this.tempDir = path.join(__dirname, '..', 'temp');
  }

  async registerFace(userId, imageData) {
    try {
      // Validate image
      if (!imageData || !imageData.startsWith('data:image')) {
        throw new Error('Invalid image format');
      }

      // Convert base64 to file
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const filename = `face_${userId}_${Date.now()}.jpg`;
      const filepath = path.join(this.tempDir, filename);
      
      await fs.writeFile(filepath, imageBuffer);

      // Process with face recognition model
      const encoding = await this.extractFaceEncoding(filepath);
      
      // Save encoding to database
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
      // Load stored encoding
      const userData = await this.getUserFaceData(userId);
      if (!userData) {
        throw new Error('User face data not found');
      }

      // Process input image
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const tempFile = path.join(this.tempDir, `temp_${Date.now()}.jpg`);
      await fs.writeFile(tempFile, imageBuffer);

      const inputEncoding = await this.extractFaceEncoding(tempFile);

      // Compare encodings
      const similarity = this.compareEncodings(userData.encoding, inputEncoding);
      
      // Clean up
      await fs.unlink(tempFile);

      return {
        success: similarity > 0.85,
        confidence: similarity,
        match: similarity > 0.85
      };
    } catch (error) {
      throw new Error(`Face verification failed: {error.message}`);
    }
  }

  async extractFaceEncoding(imagePath) {
    // Placeholder for face encoding extraction
    // In production, this would use OpenCV, FaceNet, or similar
    return `encoding_${Date.now()}`;
  }

  compareEncodings(encoding1, encoding2) {
    // Placeholder for encoding comparison
    // In production, this would use a proper face recognition library
    return Math.random() * 0.5 + 0.5; // Random similarity 0.5-1.0
  }

  async getUserFaceData(userId) {
    // Placeholder for database retrieval
    // This would normally query the database for user face data
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
  }

  async registerFingerprint(userId, templateData) {
    try {
      // Validate template
      if (!templateData) {
        throw new Error('Invalid fingerprint template');
      }

      // Save template to database/file system
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
      // For production, this would query a fingerprint database
      // and compare the template against stored templates
      
      return {
        success: Math.random() > 0.2, // 80% success rate for demo
        match: Math.random() > 0.2,
        confidence: Math.random() * 0.3 + 0.7 // Confidence 0.7-1.0
      };
    } catch (error) {
      throw new Error(`Fingerprint verification failed: ${error.message}`);
    }
  }

  async getUserFingerprintTemplate(userId) {
    // Placeholder for database retrieval
    return null;
  }
}

module.exports = new FingerprintService();
```

## src/services/rfid.js
```javascript
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class RFIDService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
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

      // Check if card is registered in database
      // For demo, we'll accept any valid UID format
      return {
        success: /^[0-9A-F]{8,}$/i.test(cardUid),
        cardUid: cardUid
      };
    } catch (error) {
      throw new Error(`Card verification failed: ${error.message}`);
    }
  }

  async scanCard() {
    // Simulate card scanning
    // In production, this would interface with RFID reader hardware
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
const AuthService = require('../services/auth');
const User = require('../models/User');
const ResponseUtil = require('../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, username, email, password, registeredMethods } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }]
      });

      if (existingUser) {
        return ResponseUtil.error(res, 'Username atau email sudah digunakan', 400);
      }

      // Create user
      const user = await User.create({
        name,
        username,
        email,
        password,
        registeredMethods: registeredMethods || []
      });

      // Return user data (without password)
      const userResponse = {
        id: user._id,
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

      // Find user
      const user = await User.findOne({ username });
      if (!user || !user.isActive) {
        return ResponseUtil.error(res, 'Invalid credentials', 401);
      }

      // Verify password
      const isValidPassword = await user.matchPassword(password);
      if (!isValidPassword) {
        return ResponseUtil.error(res, 'Invalid credentials', 401);
      }

      // Verify registered method
      if (method && !user.registeredMethods.includes(method)) {
        return ResponseUtil.error(res, 'Method not registered for this user', 400);
      }

      // Generate token
      const token = AuthService.generateToken(user._id);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      const userResponse = {
        id: user._id,
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
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('attendanceHistory');

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

class AttendanceController {
  async recordAttendance(req, res, next) {
    try {
      const { userId, method, deviceId, verificationData, notes } = req.body;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }

      // Verify method
      if (!user.registeredMethods.includes(method)) {
        return ResponseUtil.error(res, 'Method not registered for this user', 400);
      }

      // Verify with specific method
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

      // Create attendance record
      const attendance = await Attendance.create({
        user: userId,
        method: method,
        deviceId: deviceId,
        verificationData: verificationResult,
        notes: notes,
        status: 'present'
      });

      // Add to user's attendance history
      user.attendanceHistory.push(attendance._id);
      await user.save();

      const attendanceResponse = {
        id: attendance._id,
        user: userId,
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

      // Build query
      const query = { user: userId };
      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      if (method) {
        query.method = method;
      }

      const attendances = await Attendance.find(query)
        .sort({ timestamp: -1 })
        .populate('user', 'name username');

      ResponseUtil.success(res, 'Attendance records retrieved', attendances);
    } catch (error) {
      next(error);
    }
  }

  async getDeviceAttendance(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { startDate, endDate } = req.query;

      // Build query
      const query = { deviceId };
      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const attendances = await Attendance.find(query)
        .sort({ timestamp: -1 })
        .populate('user', 'name username');

      ResponseUtil.success(res, 'Device attendance records retrieved', attendances);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      // Build query
      const query = {};
      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const stats = await Attendance.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              method: '$method'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': -1 } }
      ]);

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

      // Check if device exists
      const existingDevice = await Device.findOne({ deviceId });
      if (existingDevice) {
        return ResponseUtil.error(res, 'Device ID already registered', 400);
      }

      // Create device
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
      const devices = await Device.find().sort({ name: 1 });

      ResponseUtil.success(res, 'Devices retrieved', devices);
    } catch (error) {
      next(error);
    }
  }

  async getDevice(req, res, next) {
    try {
      const { deviceId } = req.params;

      const device = await Device.findOne({ deviceId });
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

      const device = await Device.findOneAndUpdate(
        { deviceId },
        updates,
        { new: true, runValidators: true }
      );

      if (!device) {
        return ResponseUtil.error(res, 'Device not found', 404);
      }

      ResponseUtil.success(res, 'Device updated successfully', device);
    } catch (error) {
      next(error);
    }
  }

  async deleteDevice(req, res, next) {
    try {
      const { deviceId } = req.params;

      const device = await Device.findOneAndDelete({ deviceId });
      if (!device) {
        return ResponseUtil.error(res, 'Device not found', 404);
      }

      ResponseUtil.success(res, 'Device deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;

      const device = await Device.findOne({ deviceId });
      if (!device) {
        return ResponseUtil.error(res, 'Device not found', 404);
      }

      // Update lastSeen
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

## src/routes/auth.js
```javascript
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;
```

## src/routes/attendance.js
```javascript
const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.post('/', AttendanceController.recordAttendance);
router.get('/user/:userId', AttendanceController.getUserAttendance);
router.get('/device/:deviceId', AttendanceController.getDeviceAttendance);
router.get('/stats', AttendanceController.getAttendanceStats);

module.exports = router;
```

## src/routes/device.js
```javascript
const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/device');
const { authenticateToken, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Admin routes
router.post('/', authorize('admin'), DeviceController.registerDevice);
router.get('/', DeviceController.getAllDevices);
router.get('/:deviceId', DeviceController.getDevice);
router.put('/:deviceId', authorize('admin'), DeviceController.updateDevice);
router.delete('/:deviceId', authorize('admin'), DeviceController.deleteDevice);
router.get('/:deviceId/status', DeviceController.getDeviceStatus);

module.exports = router;
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
    const user = await User.findById(decoded.id).select('-password');

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
      message: message,
      data: data
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
    this.errorLogDir = path.join(this.logDir, 'error');
    this.accessLogDir = path.join(this.logDir, 'access');
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
      // Write to appropriate log file based on level
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

## src/config/database.js
```javascript
const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });

    console.log(`MongoDB Connected: {conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
```

## .env
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
LOG_LEVEL=info
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

## README.md
```markdown
# Multi-Method Attendance System

Sistem absensi yang mendukung tiga metode autentikasi: face recognition, fingerprint, dan RFID/card.

## Fitur

- **Face Recognition**: Scan wajah untuk absensi
- **Fingerprint**: Verifikasi sidik jari
- **Card/RFID**: Scan kartu untuk absensi
- **Multi-Method Registration**: Daftarkan satu atau lebih metode untuk setiap pengguna
- **Real-time Attendance**: Catat dan monitor absensi secara real-time
- **Device Management**: Kelola perangkat yang terhubung
- **Attendance Reports**: Generate laporan kehadiran

## Prasyarat

- Node.js (v14+)
- MongoDB

## Instalasi

```bash
# Clone repository
git clone <repository-url>
cd attendance-system

# Install dependensi
npm install

# Buat file environment
 cp .env.example .env

# Jalankan database MongoDB
# ... (inisialisasi database)

# Jalankan aplikasi
npm run dev
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

## Struktur Direktori

```
attendance-system/
├── server.js              # Server utama
├── package.json           # Dependensi
├── .env                   # Variabel lingkungan
├── src/
│   ├── config/            # Konfigurasi
│   │   └── database.js    # Koneksi database
│   ├── models/            # Model data
│   │   ├── User.js
│   │   ├── Attendance.js
│   │   └── Device.js
│   ├── controllers/       # Controller
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   └── device.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   └── device.js
│   ├── middleware/        # Middleware
│   │   ├── auth.js
│   │   └── error.js
│   ├── services/           # Layanan integrasi perangkat keras
│   │   ├── faceRecognition.js
│   │   ├── fingerprint.js
│   │   └── rfid.js
│   └── utils/              # Utilitas
│       ├── response.js
│       └── logger.js
└── public/                # Static files (frontend)
    └── index.html
```

## Pengaturan Integrasi Perangkat Keras

### Face Recognition
1. Instal OpenCV dan library face recognition:
   ```bash
   pip install opencv-python face-recognition
   ```

2. Configure FaceRecognitionService dengan model face recognition yang trainiert.

3. Pastikan frontend mengirim gambar dalam format base64 yang tepat.

### Fingerprint
1. Instal library fingerprint scanner yang sesuai:
   ```bash
   pip install pyfingerprint fingerlib
   ```

2. Koneksikan fingerprint scanner ke sistem.

3. Configure FingerprintService dengan template yang tepat.

### RFID/Card
1. Instal library RFID yang sesuai:
   ```bash
   pip install RPI.GPIO mfrc522
   ```

2. Hubungkan RFID reader ke sistem.

3. Pastikan RFIDService dapat membaca UID kartu.

## Instalasi Perangkat Keras

### Face Recognition Setup
- Webcam/USB kamera
- Pencahayaan yang cukup
- Ruangan dengan pencahayaan yang konsisten

### Fingerprint Setup
- Fingerprint scanner (USB atau Serial)
- Driver perangkat yang kompatibel
- Bersihkan sensor sebelum penggunaan

### RFID Setup
- RFID reader (MFRC522, RC522, atau kompatibel)
- Kartu RFID/NFC yang kompatibel
- Jarak baca yang tepat

## Pengembangan

### Jalankan dalam mode pengembangan
```bash
npm run dev
```

### Jalankan dalam mode produksi
```bash
npm start
```

### Uji API
```bash
npm test
```

## Migrasi Database

### Migrasikan ke versi terbaru
```bash
# Install mongoose-migrate
npm install mongoose-migrate

# Jalankan migrasi
npx mongoose-migrate
```

## kontribusi
1. Fork repository
2. Buat branch untuk fitur baru
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## Lisensi
MIT
```