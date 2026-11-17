const User = require('./User');
const Attendance = require('./Attendance');
const Device = require('./Device');

User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Attendance,
  Device
};

