const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const logger = require('../logger');

class EmailService {
  constructor() {
    this.gmail = null;
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Try Gmail API first
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
        await this.initializeGmailAPI();
        logger.info('Email service initialized with Gmail API');
      }
      // Fallback to SMTP
      else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.initializeSMTP();
        logger.info('Email service initialized with SMTP');
      }
      else {
        throw new Error('No email configuration found. Please set up Gmail API or SMTP credentials.');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  async initializeGmailAPI() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async initializeSMTP() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    await this.transporter.verify();
  }

  async sendEmail(options) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    const {
      to,
      toName,
      from,
      fromName,
      subject,
      message,
      contact
    } = options;

    try {
      if (this.gmail) {
        return await this.sendViaGmailAPI(options);
      } else if (this.transporter) {
        return await this.sendViaSMTP(options);
      } else {
        throw new Error('No email service available');
      }
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendViaGmailAPI(options) {
    const {
      to,
      toName,
      from,
      fromName,
      subject,
      message
    } = options;

    // Create email message
    const emailMessage = [
      `To: ${toName ? `"${toName}" <${to}>` : to}`,
      `From: ${fromName ? `"${fromName}" <${from}>` : from}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      message
    ].join('\n');

    // Encode message
    const encodedMessage = Buffer.from(emailMessage).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    logger.info(`Email sent via Gmail API to ${to}`, { messageId: result.data.id });
    return result.data;
  }

  async sendViaSMTP(options) {
    const {
      to,
      toName,
      from,
      fromName,
      subject,
      message
    } = options;

    const mailOptions = {
      from: fromName ? `"${fromName}" <${from}>` : from,
      to: toName ? `"${toName}" <${to}>` : to,
      subject: subject,
      html: message
    };

    const result = await this.transporter.sendMail(mailOptions);
    
    logger.info(`Email sent via SMTP to ${to}`, { messageId: result.messageId });
    return result;
  }

  async testConnection() {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      if (this.gmail) {
        // Test Gmail API connection
        const profile = await this.gmail.users.getProfile({ userId: 'me' });
        return {
          success: true,
          method: 'Gmail API',
          email: profile.data.emailAddress
        };
      } else if (this.transporter) {
        // Test SMTP connection
        await this.transporter.verify();
        return {
          success: true,
          method: 'SMTP',
          host: process.env.SMTP_HOST
        };
      }
    } catch (error) {
      logger.error('Email service connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getQuota() {
    if (!this.gmail) {
      return null;
    }

    try {
      const quota = await this.gmail.users.getProfile({ userId: 'me' });
      return quota.data;
    } catch (error) {
      logger.error('Failed to get Gmail quota:', error);
      return null;
    }
  }
}

module.exports = EmailService;


