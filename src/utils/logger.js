const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', '..', 'logs');
    this.initialized = false;
  }

  async ensureDir() {
    if (!this.initialized) {
      try {
        await fs.mkdir(this.logDir, { recursive: true });
        this.initialized = true;
      } catch (err) {
        // ignore
      }
    }
  }

  async info(message, meta = {}) {
    await this.writeLog('info', message, meta);
  }

  async error(message, meta = {}) {
    await this.writeLog('error', message, meta);
  }

  async writeLog(level, message, meta = {}) {
    await this.ensureDir();
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
      console.error('Logging failed:', error.message);
    }
  }
}

module.exports = new Logger();

