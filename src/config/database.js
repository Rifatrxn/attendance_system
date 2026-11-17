const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'attendance_db';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

async function initDatabase() {
  try {
    // 1. Pastikan database MySQL dibuat terlebih dahulu jika belum ada
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Autentikasi dan Sinkronisasi tabel Sequelize
    await sequelize.authenticate();
    console.log('🔗 Database authenticated');
    await sequelize.sync({ alter: false });
    console.log('✅ Database MySQL terhubung dan tabel disinkronkan.');
    return true;
  } catch (error) {
    console.warn('⚠️ Gagal terhubung ke MySQL:', error.message);
    console.warn('💡 Tip: Jika menggunakan Laragon/XAMPP, pastikan service MySQL sudah di-Start.');
    return false;
  }
}

module.exports = { sequelize, initDatabase };

