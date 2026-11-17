class RFIDService {
  async registerCard(userId, cardUid) {
    try {
      if (!cardUid) {
        throw new Error('UID kartu tidak boleh kosong');
      }

      return {
        cardUid: cardUid.trim(),
        registeredAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Card registration failed: ${error.message}`);
    }
  }

  async verifyCard(cardUid) {
    try {
      if (!cardUid) {
        throw new Error('UID kartu diperlukan');
      }

      const uid = cardUid.trim();
      return {
        success: uid.length >= 4,
        cardUid: uid,
        confidence: 1.0
      };
    } catch (error) {
      throw new Error(`Card verification failed: ${error.message}`);
    }
  }

  async scanCard() {
    return `CARD_${Date.now().toString(16).toUpperCase()}`;
  }
}

module.exports = new RFIDService();

