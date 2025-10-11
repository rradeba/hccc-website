const twilio = require('twilio');
const logger = require('../logger');

class SMSService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not found. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      }

      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // Test connection
      await this.testConnection();
      
      this.initialized = true;
      logger.info('SMS service initialized with Twilio');
    } catch (error) {
      logger.error('Failed to initialize SMS service:', error);
      throw error;
    }
  }

  async sendSMS(options) {
    if (!this.initialized) {
      throw new Error('SMS service not initialized');
    }

    const {
      to,
      from,
      message,
      contact
    } = options;

    try {
      // Format phone number
      const formattedTo = this.formatPhoneNumber(to);
      const formattedFrom = from || process.env.TWILIO_PHONE_NUMBER;

      if (!formattedFrom) {
        throw new Error('No sender phone number configured');
      }

      const result = await this.client.messages.create({
        body: message,
        from: formattedFrom,
        to: formattedTo
      });

      logger.info(`SMS sent to ${formattedTo}`, { 
        messageId: result.sid,
        status: result.status 
      });

      return {
        messageId: result.sid,
        status: result.status,
        to: formattedTo,
        from: formattedFrom
      };
    } catch (error) {
      logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // If it's 10 digits, add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    // If it's 11 digits and starts with 1, add +
    else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    // If it already has country code, just add +
    else if (cleaned.length > 11) {
      return `+${cleaned}`;
    }

    return phone; // Return original if can't format
  }

  async testConnection() {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      // Get account info to test connection
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      
      return {
        success: true,
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status
      };
    } catch (error) {
      logger.error('SMS service connection test failed:', error);
      throw error;
    }
  }

  async getAccountInfo() {
    if (!this.client) {
      return null;
    }

    try {
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      return {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        balance: account.balance
      };
    } catch (error) {
      logger.error('Failed to get Twilio account info:', error);
      return null;
    }
  }

  async getUsage() {
    if (!this.client) {
      return null;
    }

    try {
      // Get usage for current month
      const usage = await this.client.usage.records.list({
        category: 'sms',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date()
      });

      return usage.map(record => ({
        category: record.category,
        count: record.count,
        countUnit: record.countUnit,
        price: record.price,
        priceUnit: record.priceUnit,
        period: record.period
      }));
    } catch (error) {
      logger.error('Failed to get SMS usage:', error);
      return null;
    }
  }

  async validatePhoneNumber(phone) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const lookup = await this.client.lookups.v1.phoneNumbers(formattedPhone).fetch();
      
      return {
        valid: true,
        formatted: lookup.phoneNumber,
        countryCode: lookup.countryCode,
        nationalFormat: lookup.nationalFormat
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async getMessageStatus(messageId) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        sid: message.sid,
        status: message.status,
        direction: message.direction,
        from: message.from,
        to: message.to,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      logger.error(`Failed to get message status for ${messageId}:`, error);
      throw error;
    }
  }
}

module.exports = SMSService;


