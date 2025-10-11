const { google } = require('googleapis');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const EmailService = require('./services/EmailService');
const SMSService = require('./services/SMSService');
const TemplateManager = require('./TemplateManager');
const AIMessageProcessor = require('./AIMessageProcessor');

class MassMessagingBot {
  constructor() {
    this.emailService = null;
    this.smsService = null;
    this.templateManager = null;
    this.aiMessageProcessor = null;
    this.initialized = false;
    this.config = {
      emailRateLimit: parseInt(process.env.EMAIL_RATE_LIMIT) || 50,
      smsRateLimit: parseInt(process.env.SMS_RATE_LIMIT) || 10,
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
      defaultFromName: process.env.DEFAULT_FROM_NAME || 'Holy City Clean Co.',
      defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'info@holycityclean.co',
      defaultPhoneNumber: process.env.DEFAULT_PHONE_NUMBER || '+1234567890'
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Mass Messaging Bot...');
      
      // Initialize email service
      this.emailService = new EmailService();
      await this.emailService.initialize();
      
      // Initialize SMS service
      this.smsService = new SMSService();
      await this.smsService.initialize();
      
      // Initialize template manager
      this.templateManager = new TemplateManager();
      await this.templateManager.initialize();
      
      // Initialize AI message processor
      this.aiMessageProcessor = new AIMessageProcessor();
      await this.aiMessageProcessor.initialize();
      
      this.initialized = true;
      logger.info('Mass Messaging Bot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Mass Messaging Bot:', error);
      throw error;
    }
  }

  async sendMassEmails(contacts, options = {}) {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    const {
      subject,
      template,
      message,
      delay = 1000,
      fromName = this.config.defaultFromName,
      fromEmail = this.config.defaultFromEmail
    } = options;

    logger.info(`Starting mass email campaign to ${contacts.length} contacts`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Validate contact
        if (!contact.email || !this.isValidEmail(contact.email)) {
          throw new Error(`Invalid email address: ${contact.email}`);
        }

        // Get message content
        let emailMessage = message;
        let emailSubject = subject;

        if (template) {
          const templateData = await this.templateManager.getTemplate(template);
          if (templateData) {
            emailMessage = this.personalizeMessage(templateData.content, contact);
            emailSubject = this.personalizeMessage(templateData.subject, contact);
          }
        }

        // Send email
        await this.emailService.sendEmail({
          to: contact.email,
          toName: contact.name,
          from: fromEmail,
          fromName: fromName,
          subject: emailSubject,
          message: emailMessage,
          contact: contact
        });

        results.successful++;
        logger.info(`Email sent successfully to ${contact.name} (${contact.email})`);

        // Rate limiting
        if (delay > 0 && i < contacts.length - 1) {
          await this.delay(delay);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          contact: contact,
          error: error.message
        });
        logger.error(`Failed to send email to ${contact.name} (${contact.email}):`, error.message);
      }
    }

    logger.info(`Mass email campaign completed. Successful: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }

  async sendMassSMS(contacts, options = {}) {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    const {
      template,
      message,
      delay = 2000,
      fromNumber = this.config.defaultPhoneNumber
    } = options;

    logger.info(`Starting mass SMS campaign to ${contacts.length} contacts`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Validate contact
        if (!contact.phone || !this.isValidPhone(contact.phone)) {
          throw new Error(`Invalid phone number: ${contact.phone}`);
        }

        // Get message content
        let smsMessage = message;

        if (template) {
          const templateData = await this.templateManager.getTemplate(template);
          if (templateData) {
            smsMessage = this.personalizeMessage(templateData.content, contact);
          }
        }

        // Send SMS
        await this.smsService.sendSMS({
          to: contact.phone,
          from: fromNumber,
          message: smsMessage,
          contact: contact
        });

        results.successful++;
        logger.info(`SMS sent successfully to ${contact.name} (${contact.phone})`);

        // Rate limiting
        if (delay > 0 && i < contacts.length - 1) {
          await this.delay(delay);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          contact: contact,
          error: error.message
        });
        logger.error(`Failed to send SMS to ${contact.name} (${contact.phone}):`, error.message);
      }
    }

    logger.info(`Mass SMS campaign completed. Successful: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }

  personalizeMessage(message, contact) {
    if (!message || !contact) return message;

    let personalizedMessage = message;

    // Replace placeholders with contact data
    personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/g, contact.name || '');
    personalizedMessage = personalizedMessage.replace(/\{\{firstName\}\}/g, this.getFirstName(contact.name) || '');
    personalizedMessage = personalizedMessage.replace(/\{\{lastName\}\}/g, this.getLastName(contact.name) || '');
    personalizedMessage = personalizedMessage.replace(/\{\{email\}\}/g, contact.email || '');
    personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/g, contact.phone || '');
    personalizedMessage = personalizedMessage.replace(/\{\{company\}\}/g, contact.company || '');
    
    // Custom fields
    Object.keys(contact).forEach(key => {
      const placeholder = `{{${key}}}`;
      personalizedMessage = personalizedMessage.replace(new RegExp(placeholder, 'g'), contact[key] || '');
    });

    return personalizedMessage;
  }

  getFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  getLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's 10 or 11 digits
    return cleanPhone.length === 10 || cleanPhone.length === 11;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Template management methods
  async listTemplates() {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    const templates = await this.templateManager.listTemplates();
    console.log('\nAvailable Templates:');
    templates.forEach(template => {
      console.log(`- ${template.name}: ${template.description}`);
    });
    return templates;
  }

  async getTemplates() {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    return await this.templateManager.listTemplates();
  }

  async createTemplate() {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    return await this.templateManager.createTemplate();
  }

  async deleteTemplate(name) {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    return await this.templateManager.deleteTemplate(name);
  }

  async getTemplate(name) {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    return await this.templateManager.getTemplate(name);
  }

  // Utility methods
  async getStats() {
    // Implementation for getting delivery statistics
    return {
      totalEmails: 0,
      totalSMS: 0,
      successRate: 0,
      lastActivity: new Date()
    };
  }

  // AI Message Processing Methods
  async processAndSendAIMessage(aiMessage, contacts, options = {}) {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    const {
      messageType = 'email',
      subject = null,
      customizationLevel = 'full',
      aiContext = {},
      sendImmediately = true,
      delay = 1000
    } = options;

    logger.info(`Processing AI message for ${contacts.length} contacts`);

    // Process the AI message with customization
    const processedMessages = await this.aiMessageProcessor.processAIMessage(
      aiMessage,
      contacts,
      {
        messageType,
        subject,
        customizationLevel,
        aiContext
      }
    );

    if (!processedMessages.success) {
      throw new Error(`Failed to process AI message: ${processedMessages.error}`);
    }

    let sendResult = null;
    if (sendImmediately) {
      // Send the customized messages
      if (messageType === 'email') {
        sendResult = await this.sendProcessedEmails(processedMessages.processedMessages, { delay });
      } else if (messageType === 'sms') {
        sendResult = await this.sendProcessedSMS(processedMessages.processedMessages, { delay });
      }
    }

    return {
      processed: processedMessages,
      sent: sendResult,
      totalContacts: contacts.length
    };
  }

  async sendProcessedEmails(processedMessages, options = {}) {
    const { delay = 1000 } = options;
    
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < processedMessages.length; i++) {
      const processedMessage = processedMessages[i];
      const { contact, message, subject } = processedMessage;

      try {
        await this.emailService.sendEmail({
          to: contact.email,
          toName: contact.name,
          from: this.config.defaultFromEmail,
          fromName: this.config.defaultFromName,
          subject: subject || 'Message from Holy City Clean Co.',
          message: message,
          contact: contact
        });

        results.successful++;
        logger.info(`AI-customized email sent to ${contact.name} (${contact.email})`);

        // Rate limiting
        if (delay > 0 && i < processedMessages.length - 1) {
          await this.delay(delay);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          contact: contact,
          error: error.message
        });
        logger.error(`Failed to send AI-customized email to ${contact.name}:`, error.message);
      }
    }

    return results;
  }

  async sendProcessedSMS(processedMessages, options = {}) {
    const { delay = 2000 } = options;
    
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < processedMessages.length; i++) {
      const processedMessage = processedMessages[i];
      const { contact, message } = processedMessage;

      try {
        await this.smsService.sendSMS({
          to: contact.phone,
          from: this.config.defaultPhoneNumber,
          message: message,
          contact: contact
        });

        results.successful++;
        logger.info(`AI-customized SMS sent to ${contact.name} (${contact.phone})`);

        // Rate limiting
        if (delay > 0 && i < processedMessages.length - 1) {
          await this.delay(delay);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          contact: contact,
          error: error.message
        });
        logger.error(`Failed to send AI-customized SMS to ${contact.name}:`, error.message);
      }
    }

    return results;
  }

  async testAICustomization(aiMessage, sampleContact, options = {}) {
    if (!this.initialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    const {
      customizationLevel = 'full',
      aiContext = {}
    } = options;

    const customizedMessage = await this.aiMessageProcessor.customizeMessage(
      aiMessage,
      sampleContact,
      { customizationLevel, aiContext }
    );

    return {
      original: aiMessage,
      customized: customizedMessage,
      appliedCustomizations: this.aiMessageProcessor.getAppliedCustomizations(aiMessage, sampleContact),
      sampleContact: sampleContact
    };
  }

  async cleanup() {
    logger.info('Cleaning up Mass Messaging Bot...');
    this.initialized = false;
  }
}

module.exports = MassMessagingBot;
