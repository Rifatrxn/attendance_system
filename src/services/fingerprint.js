class FingerprintService {
  async registerFingerprint(userId, templateData) {
    try {
      const template = templateData || `FP_${userId}_${Date.now()}`;
      return {
        templateId: `fp_tpl_${userId}_${Date.now()}`,
        template: template,
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Fingerprint registration failed: ${error.message}`);
    }
  }

  async verifyFingerprint(templateData) {
    try {
      const confidence = Number((Math.random() * 0.15 + 0.85).toFixed(2));
      return {
        success: true,
        match: true,
        confidence: confidence,
        template: templateData || 'SIMULATED_SCAN'
      };
    } catch (error) {
      throw new Error(`Fingerprint verification failed: ${error.message}`);
    }
  }
}

module.exports = new FingerprintService();

