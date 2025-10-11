const fs = require('fs').promises;
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const logger = require('./logger');

class TemplateManager {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.templates = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure templates directory exists
      await this.ensureTemplatesDirectory();
      
      // Load existing templates
      await this.loadTemplates();
      
      this.initialized = true;
      logger.info('Template manager initialized');
    } catch (error) {
      logger.error('Failed to initialize template manager:', error);
      throw error;
    }
  }

  async ensureTemplatesDirectory() {
    try {
      await fs.access(this.templatesDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.templatesDir, { recursive: true });
        logger.info('Created templates directory');
        
        // Create default templates
        await this.createDefaultTemplates();
      } else {
        throw error;
      }
    }
  }

  async createDefaultTemplates() {
    const defaultTemplates = [
      {
        name: 'welcome_email',
        type: 'email',
        subject: 'Welcome to Holy City Clean Co!',
        description: 'Welcome email for new customers',
        content: `<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c5aa0;">Welcome {{firstName}}!</h2>
  <p>Thank you for choosing Holy City Clean Co. We're excited to serve you!</p>
  <p>Your clean is scheduled and we'll be in touch soon with more details.</p>
  <p>If you have any questions, please don't hesitate to contact us at:</p>
  <ul>
    <li>Phone: (843) 555-0123</li>
    <li>Email: info@holycityclean.co</li>
  </ul>
  <p>Best regards,<br>The Holy City Clean Co. Team</p>
</body>
</html>`
      },
      {
        name: 'follow_up_sms',
        type: 'sms',
        subject: '',
        description: 'Follow-up SMS after service',
        content: 'Hi {{firstName}}! Hope you\'re happy with your clean today. Rate us 5 stars if you loved it! Reply STOP to opt out.'
      },
      {
        name: 'service_reminder',
        type: 'email',
        subject: 'Your Clean is Scheduled - Holy City Clean Co',
        description: 'Service reminder email',
        content: `<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c5aa0;">Service Reminder</h2>
  <p>Hello {{firstName}},</p>
  <p>This is a friendly reminder that your cleaning service is scheduled.</p>
  <p>We'll be at your location at the scheduled time. If you need to make any changes, please call us at (843) 555-0123.</p>
  <p>Thank you for choosing Holy City Clean Co!</p>
  <p>Best regards,<br>The Holy City Clean Co. Team</p>
</body>
</html>`
      }
    ];

    for (const template of defaultTemplates) {
      await this.saveTemplate(template);
    }

    logger.info('Created default templates');
  }

  async loadTemplates() {
    try {
      const files = await fs.readdir(this.templatesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.templatesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = JSON.parse(content);
          this.templates.set(template.name, template);
        } catch (error) {
          logger.error(`Failed to load template ${file}:`, error);
        }
      }

      logger.info(`Loaded ${this.templates.size} templates`);
    } catch (error) {
      logger.error('Failed to load templates:', error);
      throw error;
    }
  }

  async listTemplates() {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    return Array.from(this.templates.values()).map(template => ({
      name: template.name,
      type: template.type,
      description: template.description,
      subject: template.subject,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }

  async getTemplate(name) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    return this.templates.get(name) || null;
  }

  async saveTemplate(templateData) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    const template = {
      name: templateData.name,
      type: templateData.type || 'email',
      subject: templateData.subject || '',
      description: templateData.description || '',
      content: templateData.content || '',
      createdAt: templateData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variables: this.extractVariables(templateData.content + ' ' + templateData.subject)
    };

    // Validate template
    this.validateTemplate(template);

    // Save to file
    const filePath = path.join(this.templatesDir, `${template.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(template, null, 2));

    // Update in memory
    this.templates.set(template.name, template);

    logger.info(`Saved template: ${template.name}`);
    return template;
  }

  async deleteTemplate(name) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    // Delete file
    const filePath = path.join(this.templatesDir, `${name}.json`);
    await fs.unlink(filePath);

    // Remove from memory
    this.templates.delete(name);

    logger.info(`Deleted template: ${name}`);
    return true;
  }

  async createTemplate() {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Template name (use underscores, no spaces):',
        validate: input => {
          if (!input || input.trim() === '') return 'Template name is required';
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Template name can only contain letters, numbers, underscores, and hyphens';
          if (this.templates.has(input)) return 'Template name already exists';
          return true;
        }
      },
      {
        type: 'list',
        name: 'type',
        message: 'Template type:',
        choices: ['email', 'sms']
      },
      {
        type: 'input',
        name: 'description',
        message: 'Template description:',
        validate: input => input.trim().length > 0 || 'Description is required'
      },
      {
        type: 'input',
        name: 'subject',
        message: 'Email subject (leave empty for SMS):',
        when: answers => answers.type === 'email'
      },
      {
        type: 'editor',
        name: 'content',
        message: 'Template content (opens editor):',
        validate: input => input.trim().length > 0 || 'Content is required'
      }
    ]);

    const template = await this.saveTemplate({
      name: answers.name,
      type: answers.type,
      subject: answers.subject || '',
      description: answers.description,
      content: answers.content
    });

    console.log(chalk.green(`✅ Template "${template.name}" created successfully`));
    return template;
  }

  extractVariables(content) {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  validateTemplate(template) {
    if (!template.name || template.name.trim() === '') {
      throw new Error('Template name is required');
    }

    if (!template.content || template.content.trim() === '') {
      throw new Error('Template content is required');
    }

    if (template.type === 'email' && (!template.subject || template.subject.trim() === '')) {
      throw new Error('Email templates require a subject');
    }

    // Check for valid variable syntax
    const variableRegex = /\{\{[^}]+\}\}/g;
    const variables = template.content.match(variableRegex);
    if (variables) {
      variables.forEach(variable => {
        const varName = variable.slice(2, -2).trim();
        if (!varName || varName.includes(' ') || varName.includes('\n')) {
          throw new Error(`Invalid variable syntax: ${variable}`);
        }
      });
    }
  }

  async previewTemplate(name, sampleContact = null) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    const defaultContact = {
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      company: 'Example Corp',
      address: '123 Main St',
      city: 'Charleston',
      state: 'SC',
      zip: '29401'
    };

    const contact = sampleContact || defaultContact;

    // Personalize content
    const personalizedSubject = this.personalizeContent(template.subject, contact);
    const personalizedContent = this.personalizeContent(template.content, contact);

    return {
      name: template.name,
      type: template.type,
      originalSubject: template.subject,
      personalizedSubject: personalizedSubject,
      originalContent: template.content,
      personalizedContent: personalizedContent,
      variables: template.variables,
      sampleContact: contact
    };
  }

  personalizeContent(content, contact) {
    if (!content || !contact) return content;

    let personalized = content;

    // Replace placeholders
    Object.keys(contact).forEach(key => {
      const placeholder = `{{${key}}}`;
      personalized = personalized.replace(new RegExp(placeholder, 'g'), contact[key] || '');
    });

    // Handle common variations
    personalized = personalized.replace(/\{\{firstName\}\}/g, this.getFirstName(contact.name) || contact.firstName || '');
    personalized = personalized.replace(/\{\{lastName\}\}/g, this.getLastName(contact.name) || contact.lastName || '');

    return personalized;
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

  async exportTemplates(exportPath) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    const templatesArray = Array.from(this.templates.values());
    const exportData = {
      exportedAt: new Date().toISOString(),
      templates: templatesArray
    };

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    logger.info(`Exported ${templatesArray.length} templates to ${exportPath}`);
    
    return {
      success: true,
      count: templatesArray.length,
      path: exportPath
    };
  }

  async importTemplates(importPath) {
    if (!this.initialized) {
      throw new Error('Template manager not initialized');
    }

    try {
      const content = await fs.readFile(importPath, 'utf8');
      const importData = JSON.parse(content);
      
      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error('Invalid template file format');
      }

      let imported = 0;
      let skipped = 0;

      for (const templateData of importData.templates) {
        try {
          if (this.templates.has(templateData.name)) {
            skipped++;
            continue;
          }

          await this.saveTemplate(templateData);
          imported++;
        } catch (error) {
          logger.error(`Failed to import template ${templateData.name}:`, error);
          skipped++;
        }
      }

      logger.info(`Imported ${imported} templates, skipped ${skipped} existing templates`);
      
      return {
        success: true,
        imported: imported,
        skipped: skipped
      };
    } catch (error) {
      logger.error('Failed to import templates:', error);
      throw error;
    }
  }
}

module.exports = TemplateManager;


