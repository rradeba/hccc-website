const logger = require('./logger');
const ContactManager = require('./ContactManager');

class AIMessageProcessor {
  constructor() {
    this.contactManager = new ContactManager();
    this.customizationRules = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load customization rules
      await this.loadCustomizationRules();
      
      this.initialized = true;
      logger.info('AI Message Processor initialized');
    } catch (error) {
      logger.error('Failed to initialize AI Message Processor:', error);
      throw error;
    }
  }

  async loadCustomizationRules() {
    // Default customization rules
    const defaultRules = [
      {
        id: 'greeting',
        pattern: /\[GREETING\]/g,
        replacement: (contact) => {
          const firstName = this.getFirstName(contact.name);
          const timeOfDay = this.getTimeOfDay();
          return `${timeOfDay}, ${firstName}!`;
        }
      },
      {
        id: 'formal_greeting',
        pattern: /\[FORMAL_GREETING\]/g,
        replacement: (contact) => {
          const fullName = contact.name || 'Valued Customer';
          return `Dear ${fullName},`;
        }
      },
      {
        id: 'company_context',
        pattern: /\[COMPANY_CONTEXT\]/g,
        replacement: (contact) => {
          const company = contact.company || 'your business';
          return company;
        }
      },
      {
        id: 'location_context',
        pattern: /\[LOCATION_CONTEXT\]/g,
        replacement: (contact) => {
          const city = contact.city || 'your area';
          const state = contact.state || '';
          return state ? `${city}, ${state}` : city;
        }
      },
      {
        id: 'service_history',
        pattern: /\[SERVICE_HISTORY\]/g,
        replacement: (contact) => {
          // This would integrate with your service history database
          return contact.previousService ? 'returning customer' : 'new customer';
        }
      },
      {
        id: 'personalized_offer',
        pattern: /\[PERSONALIZED_OFFER\]/g,
        replacement: (contact) => {
          // Generate personalized offers based on contact data
          return this.generatePersonalizedOffer(contact);
        }
      },
      {
        id: 'urgency_context',
        pattern: /\[URGENCY_CONTEXT\]/g,
        replacement: (contact) => {
          // Add urgency based on contact behavior or timing
          return this.getUrgencyContext(contact);
        }
      }
    ];

    defaultRules.forEach(rule => {
      this.customizationRules.set(rule.id, rule);
    });

    logger.info(`Loaded ${this.customizationRules.size} customization rules`);
  }

  async processAIMessage(aiMessage, contacts, options = {}) {
    if (!this.initialized) {
      throw new Error('AI Message Processor not initialized');
    }

    const {
      messageType = 'email', // 'email' or 'sms'
      subject = null,
      customizationLevel = 'full', // 'basic', 'full', 'advanced'
      aiContext = {} // Additional context from AI chatbot
    } = options;

    logger.info(`Processing AI message for ${contacts.length} contacts`);

    const processedMessages = [];

    for (const contact of contacts) {
      try {
        const customizedMessage = await this.customizeMessage(
          aiMessage,
          contact,
          {
            messageType,
            customizationLevel,
            aiContext
          }
        );

        const customizedSubject = subject ? 
          this.customizeMessage(subject, contact, { customizationLevel, aiContext }) :
          null;

        processedMessages.push({
          contact: contact,
          message: customizedMessage,
          subject: customizedSubject,
          customizationApplied: this.getAppliedCustomizations(aiMessage, contact)
        });

      } catch (error) {
        logger.error(`Failed to customize message for ${contact.name}:`, error);
        // Fallback to basic personalization
        processedMessages.push({
          contact: contact,
          message: this.basicCustomization(aiMessage, contact),
          subject: subject,
          customizationApplied: ['basic'],
          error: error.message
        });
      }
    }

    logger.info(`Successfully processed ${processedMessages.length} customized messages`);
    return processedMessages;
  }

  async customizeMessage(message, contact, options = {}) {
    const { customizationLevel = 'full', aiContext = {} } = options;
    
    let customizedMessage = message;

    // Apply different levels of customization
    switch (customizationLevel) {
      case 'basic':
        customizedMessage = this.basicCustomization(message, contact);
        break;
      
      case 'full':
        customizedMessage = await this.fullCustomization(message, contact, aiContext);
        break;
      
      case 'advanced':
        customizedMessage = await this.advancedCustomization(message, contact, aiContext);
        break;
    }

    return customizedMessage;
  }

  basicCustomization(message, contact) {
    let customized = message;

    // Replace basic placeholders
    customized = customized.replace(/\{\{name\}\}/g, contact.name || 'Valued Customer');
    customized = customized.replace(/\{\{firstName\}\}/g, this.getFirstName(contact.name) || 'there');
    customized = customized.replace(/\{\{lastName\}\}/g, this.getLastName(contact.name) || '');
    customized = customized.replace(/\{\{email\}\}/g, contact.email || '');
    customized = customized.replace(/\{\{phone\}\}/g, contact.phone || '');
    customized = customized.replace(/\{\{company\}\}/g, contact.company || 'your business');
    customized = customized.replace(/\{\{city\}\}/g, contact.city || 'your area');
    customized = customized.replace(/\{\{state\}\}/g, contact.state || '');

    return customized;
  }

  async fullCustomization(message, contact, aiContext = {}) {
    let customized = this.basicCustomization(message, contact);

    // Apply advanced customization rules
    for (const rule of this.customizationRules.values()) {
      customized = customized.replace(rule.pattern, rule.replacement(contact, aiContext));
    }

    // Add AI context-based customization
    customized = await this.applyAIContext(customized, contact, aiContext);

    return customized;
  }

  async advancedCustomization(message, contact, aiContext = {}) {
    let customized = await this.fullCustomization(message, contact, aiContext);

    // Advanced personalization features
    customized = await this.addBehavioralContext(customized, contact, aiContext);
    customized = await this.addTemporalContext(customized, contact, aiContext);
    customized = await this.addRelationshipContext(customized, contact, aiContext);

    return customized;
  }

  async applyAIContext(message, contact, aiContext) {
    let customized = message;

    // Apply AI-generated context
    if (aiContext.sentiment) {
      customized = customized.replace(/\[SENTIMENT_CONTEXT\]/g, aiContext.sentiment);
    }

    if (aiContext.tone) {
      customized = customized.replace(/\[TONE_CONTEXT\]/g, aiContext.tone);
    }

    if (aiContext.keyPoints) {
      customized = customized.replace(/\[KEY_POINTS\]/g, aiContext.keyPoints.join(', '));
    }

    if (aiContext.callToAction) {
      customized = customized.replace(/\[CALL_TO_ACTION\]/g, aiContext.callToAction);
    }

    return customized;
  }

  async addBehavioralContext(message, contact, aiContext) {
    // Add context based on contact behavior
    let customized = message;

    // Example: Add urgency based on last interaction
    const lastInteraction = contact.lastInteraction || new Date();
    const daysSinceInteraction = Math.floor((new Date() - new Date(lastInteraction)) / (1000 * 60 * 60 * 24));

    if (daysSinceInteraction > 30) {
      customized = customized.replace(/\[REENGAGEMENT_CONTEXT\]/g, 'We miss you!');
    }

    return customized;
  }

  async addTemporalContext(message, contact, aiContext) {
    // Add time-based context
    let customized = message;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Weekend vs weekday context
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      customized = customized.replace(/\[WEEKEND_CONTEXT\]/g, 'enjoying your weekend');
    } else {
      customized = customized.replace(/\[WEEKEND_CONTEXT\]/g, 'having a great week');
    }

    // Time of day context
    if (hour < 12) {
      customized = customized.replace(/\[TIME_CONTEXT\]/g, 'morning');
    } else if (hour < 17) {
      customized = customized.replace(/\[TIME_CONTEXT\]/g, 'afternoon');
    } else {
      customized = customized.replace(/\[TIME_CONTEXT\]/g, 'evening');
    }

    return customized;
  }

  async addRelationshipContext(message, contact, aiContext) {
    // Add relationship-based context
    let customized = message;

    // Customer tier or relationship level
    const customerTier = contact.customerTier || 'standard';
    switch (customerTier) {
      case 'premium':
        customized = customized.replace(/\[TIER_CONTEXT\]/g, 'valued premium customer');
        break;
      case 'vip':
        customized = customized.replace(/\[TIER_CONTEXT\]/g, 'VIP customer');
        break;
      default:
        customized = customized.replace(/\[TIER_CONTEXT\]/g, 'valued customer');
    }

    return customized;
  }

  // Utility methods
  getFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  getLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  generatePersonalizedOffer(contact) {
    // Generate offers based on contact data
    const offers = [
      '10% off your next service',
      'Free consultation for new customers',
      'Priority booking for returning customers'
    ];

    // Simple logic - in real implementation, this would be more sophisticated
    const offerIndex = contact.name ? contact.name.length % offers.length : 0;
    return offers[offerIndex];
  }

  getUrgencyContext(contact) {
    // Add urgency based on various factors
    if (contact.lastServiceDate) {
      const daysSinceService = Math.floor((new Date() - new Date(contact.lastServiceDate)) / (1000 * 60 * 60 * 24));
      if (daysSinceService > 90) {
        return 'Limited time offer';
      }
    }
    return 'Special offer';
  }

  getAppliedCustomizations(message, contact) {
    const applied = ['basic'];
    
    // Check which advanced customizations were applied
    for (const rule of this.customizationRules.values()) {
      if (rule.pattern.test(message)) {
        applied.push(rule.id);
      }
    }

    return applied;
  }

  // API endpoint methods for receiving AI messages
  async receiveAIMessage(aiMessageData) {
    const {
      message,
      subject = null,
      messageType = 'email',
      contacts,
      aiContext = {},
      customizationLevel = 'full'
    } = aiMessageData;

    try {
      // Process the AI message for all contacts
      const processedMessages = await this.processAIMessage(
        message,
        contacts,
        {
          messageType,
          subject,
          customizationLevel,
          aiContext
        }
      );

      return {
        success: true,
        processedMessages: processedMessages,
        totalContacts: contacts.length,
        customizationLevel: customizationLevel
      };

    } catch (error) {
      logger.error('Failed to process AI message:', error);
      return {
        success: false,
        error: error.message,
        processedMessages: []
      };
    }
  }

  // Method to add custom customization rules
  addCustomizationRule(rule) {
    this.customizationRules.set(rule.id, rule);
    logger.info(`Added customization rule: ${rule.id}`);
  }

  // Method to get available customization patterns
  getAvailablePatterns() {
    const patterns = [];
    for (const rule of this.customizationRules.values()) {
      patterns.push({
        id: rule.id,
        pattern: rule.pattern.toString(),
        description: this.getPatternDescription(rule.id)
      });
    }
    return patterns;
  }

  getPatternDescription(patternId) {
    const descriptions = {
      'greeting': 'Dynamic greeting based on time of day and contact name',
      'formal_greeting': 'Formal greeting with full name',
      'company_context': 'Company name or business reference',
      'location_context': 'City and state information',
      'service_history': 'Previous service history context',
      'personalized_offer': 'AI-generated personalized offers',
      'urgency_context': 'Time-sensitive urgency messaging'
    };
    return descriptions[patternId] || 'Custom pattern';
  }
}

module.exports = AIMessageProcessor;


