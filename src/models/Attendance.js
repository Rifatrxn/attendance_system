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
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('face', 'fingerprint', 'card'),
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING,
    defaultValue: 'WEB_TERMINAL_01'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
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

