const fs = require('fs').promises;
const path = require('path');

class FaceRecognitionService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', '..', 'temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error.message);
    }
  }

  async registerFace(userId, descriptorData) {
    try {
      if (!descriptorData) {
        throw new Error('Face descriptor tidak diberikan');
      }

      if (Array.isArray(descriptorData)) {
        return {
          faceId: userId,
          descriptor: descriptorData,
          registeredAt: new Date().toISOString()
        };
      }

      throw new Error('Format descriptor tidak valid');
    } catch (error) {
      throw new Error(`Face registration failed: ${error.message}`);
    }
  }

  async verifyFace(userId, inputDescriptor, savedDescriptor) {
    try {
      if (!inputDescriptor || !savedDescriptor) {
        throw new Error('Descriptor tidak lengkap untuk verifikasi');
      }

      const inputDesc = Array.isArray(inputDescriptor) ? inputDescriptor : Object.values(inputDescriptor);
      const savedDesc = Array.isArray(savedDescriptor) ? savedDescriptor : Object.values(savedDescriptor);

      if (inputDesc.length !== savedDesc.length) {
        throw new Error('Dimensi descriptor tidak cocok');
      }

      const distance = this.euclideanDistance(inputDesc, savedDesc);
      const THRESHOLD = 0.6; // face-api standard threshold
      const isSamePerson = distance < THRESHOLD;
      const similarity = ((1 - Math.min(distance, 1.0)) * 100).toFixed(1);

      return {
        success: isSamePerson,
        confidence: Number(similarity),
        distance: Number(distance.toFixed(4)),
        match: isSamePerson
      };
    } catch (error) {
      throw new Error(`Face verification failed: ${error.message}`);
    }
  }

  euclideanDistance(desc1, desc2) {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  async extractFaceEncoding(imagePath) {
    // Placeholder untuk integrasi FaceNet / OpenCV
    return `face_encoding_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  compareEncodings(encoding1, encoding2) {
    // Simulasi confidence score antara 0.75 - 0.98
    return Math.random() * 0.23 + 0.75;
  }

  async cleanup() {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Cleanup failed:', error.message);
    }
  }
}

module.exports = new FaceRecognitionService();

