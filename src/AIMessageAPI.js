const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const MassMessagingBot = require('./MassMessagingBot');
const AIMessageProcessor = require('./AIMessageProcessor');
const ContactManager = require('./ContactManager');
const logger = require('./logger');

class AIMessageAPI {
  constructor() {
    this.app = express();
    this.port = process.env.API_PORT || 3001;
    this.bot = null;
    this.messageProcessor = null;
    this.contactManager = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize services
      this.bot = new MassMessagingBot();
      await this.bot.initialize();

      this.messageProcessor = new AIMessageProcessor();
      await this.messageProcessor.initialize();

      this.contactManager = new ContactManager();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      this.initialized = true;
      logger.info('AI Message API initialized');
    } catch (error) {
      logger.error('Failed to initialize AI Message API:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Enable CORS for cross-origin requests
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
      credentials: true
    }));

    // Parse JSON bodies
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      next();
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      logger.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          bot: !!this.bot,
          messageProcessor: !!this.messageProcessor,
          contactManager: !!this.contactManager
        }
      });
    });

    // Process AI-generated message
    this.app.post('/api/process-ai-message', async (req, res) => {
      try {
        const {
          message,
          subject = null,
          messageType = 'email', // 'email' or 'sms'
          contacts,
          contactFile = null,
          aiContext = {},
          customizationLevel = 'full',
          sendImmediately = false,
          schedule = null
        } = req.body;

        // Validate required fields
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Message content is required'
          });
        }

        // Load contacts
        let contactList = contacts;
        if (contactFile && !contacts) {
          contactList = await this.contactManager.loadContacts(contactFile);
        }

        if (!contactList || contactList.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Contacts are required'
          });
        }

        // Process AI message
        const result = await this.messageProcessor.receiveAIMessage({
          message,
          subject,
          messageType,
          contacts: contactList,
          aiContext,
          customizationLevel
        });

        if (!result.success) {
          return res.status(500).json(result);
        }

        // Send messages if requested
        if (sendImmediately) {
          const sendResult = await this.sendProcessedMessages(
            result.processedMessages,
            messageType
          );

          return res.json({
            success: true,
            processed: result,
            sent: sendResult
          });
        }

        // Schedule messages if requested
        if (schedule) {
          const scheduleResult = await this.scheduleProcessedMessages(
            result.processedMessages,
            schedule,
            messageType
          );

          return res.json({
            success: true,
            processed: result,
            scheduled: scheduleResult
          });
        }

        // Return processed messages for review
        res.json({
          success: true,
          processed: result,
          preview: result.processedMessages.slice(0, 3) // Show first 3 as preview
        });

      } catch (error) {
        logger.error('Error processing AI message:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process AI message',
          message: error.message
        });
      }
    });

    // Send processed messages
    this.app.post('/api/send-messages', async (req, res) => {
      try {
        const {
          processedMessages,
          messageType = 'email',
          delay = 1000
        } = req.body;

        if (!processedMessages || !Array.isArray(processedMessages)) {
          return res.status(400).json({
            success: false,
            error: 'Processed messages are required'
          });
        }

        const sendResult = await this.sendProcessedMessages(
          processedMessages,
          messageType,
          { delay }
        );

        res.json({
          success: true,
          sent: sendResult
        });

      } catch (error) {
        logger.error('Error sending messages:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to send messages',
          message: error.message
        });
      }
    });

    // Get customization patterns
    this.app.get('/api/customization-patterns', (req, res) => {
      try {
        const patterns = this.messageProcessor.getAvailablePatterns();
        res.json({
          success: true,
          patterns: patterns
        });
      } catch (error) {
        logger.error('Error getting patterns:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get customization patterns',
          message: error.message
        });
      }
    });

    // Add custom customization rule
    this.app.post('/api/customization-rules', (req, res) => {
      try {
        const { rule } = req.body;

        if (!rule || !rule.id || !rule.pattern || !rule.replacement) {
          return res.status(400).json({
            success: false,
            error: 'Rule must have id, pattern, and replacement'
          });
        }

        this.messageProcessor.addCustomizationRule(rule);

        res.json({
          success: true,
          message: 'Customization rule added successfully'
        });

      } catch (error) {
        logger.error('Error adding customization rule:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to add customization rule',
          message: error.message
        });
      }
    });

    // Test message customization
    this.app.post('/api/test-customization', async (req, res) => {
      try {
        const {
          message,
          contact,
          customizationLevel = 'full',
          aiContext = {}
        } = req.body;

        if (!message || !contact) {
          return res.status(400).json({
            success: false,
            error: 'Message and contact are required'
          });
        }

        const customizedMessage = await this.messageProcessor.customizeMessage(
          message,
          contact,
          { customizationLevel, aiContext }
        );

        res.json({
          success: true,
          original: message,
          customized: customizedMessage,
          appliedCustomizations: this.messageProcessor.getAppliedCustomizations(message, contact)
        });

      } catch (error) {
        logger.error('Error testing customization:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to test customization',
          message: error.message
        });
      }
    });

    // Get contact list
    this.app.get('/api/contacts/:file', async (req, res) => {
      try {
        const { file } = req.params;
        const contacts = await this.contactManager.loadContacts(file);
        const stats = await this.contactManager.getContactStats(contacts);

        res.json({
          success: true,
          contacts: contacts,
          stats: stats
        });

      } catch (error) {
        logger.error('Error loading contacts:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to load contacts',
          message: error.message
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  async sendProcessedMessages(processedMessages, messageType, options = {}) {
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
        if (messageType === 'email') {
          await this.bot.emailService.sendEmail({
            to: contact.email,
            toName: contact.name,
            from: process.env.DEFAULT_FROM_EMAIL || 'info@holycityclean.co',
            fromName: process.env.DEFAULT_FROM_NAME || 'Holy City Clean Co.',
            subject: subject || 'Message from Holy City Clean Co.',
            message: message,
            contact: contact
          });
        } else if (messageType === 'sms') {
          await this.bot.smsService.sendSMS({
            to: contact.phone,
            from: process.env.DEFAULT_PHONE_NUMBER || '+1234567890',
            message: message,
            contact: contact
          });
        }

        results.successful++;
        logger.info(`Message sent successfully to ${contact.name} (${contact.email || contact.phone})`);

        // Rate limiting
        if (delay > 0 && i < processedMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          contact: contact,
          error: error.message
        });
        logger.error(`Failed to send message to ${contact.name}:`, error.message);
      }
    }

    return results;
  }

  async scheduleProcessedMessages(processedMessages, schedule, messageType) {
    // This would integrate with the Scheduler class
    // For now, return a placeholder
    return {
      success: true,
      message: 'Scheduling functionality will be implemented with the Scheduler integration',
      schedule: schedule,
      messageCount: processedMessages.length
    };
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    this.server = this.app.listen(this.port, () => {
      logger.info(`AI Message API server running on port ${this.port}`);
      console.log(`🚀 AI Message API server running on http://localhost:${this.port}`);
      console.log(`📋 Health check: http://localhost:${this.port}/health`);
      console.log(`📨 Process AI messages: POST http://localhost:${this.port}/api/process-ai-message`);
    });

    return this.server;
  }

  async stop() {
    if (this.server) {
      this.server.close();
      logger.info('AI Message API server stopped');
    }
  }
}

module.exports = AIMessageAPI;


