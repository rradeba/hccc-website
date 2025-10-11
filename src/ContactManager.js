const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class ContactManager {
  constructor() {
    this.defaultFields = [
      'name',
      'email',
      'phone',
      'company',
      'address',
      'city',
      'state',
      'zip',
      'notes'
    ];
  }

  async loadContacts(filePath) {
    if (!filePath) {
      throw new Error('File path is required');
    }

    try {
      // Check if file exists
      await fs.access(filePath);
      
      const contacts = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            // Clean and validate contact data
            const contact = this.cleanContactData(row);
            if (contact.email || contact.phone) {
              contacts.push(contact);
            }
          })
          .on('end', () => {
            logger.info(`Loaded ${contacts.length} contacts from ${filePath}`);
            resolve(contacts);
          })
          .on('error', (error) => {
            logger.error(`Error reading CSV file ${filePath}:`, error);
            reject(error);
          });
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  async saveContacts(contacts, filePath, options = {}) {
    if (!contacts || contacts.length === 0) {
      throw new Error('No contacts to save');
    }

    try {
      const { includeHeaders = true, append = false } = options;
      
      // Get all unique field names from contacts
      const allFields = new Set();
      contacts.forEach(contact => {
        Object.keys(contact).forEach(key => allFields.add(key));
      });
      
      const fields = Array.from(allFields);
      
      const csvWriter = createCsvWriter({
        path: filePath,
        header: fields.map(field => ({ id: field, title: field })),
        append: append
      });

      await csvWriter.writeRecords(contacts);
      logger.info(`Saved ${contacts.length} contacts to ${filePath}`);
      
      return {
        success: true,
        count: contacts.length,
        filePath: filePath
      };
    } catch (error) {
      logger.error(`Error saving contacts to ${filePath}:`, error);
      throw error;
    }
  }

  cleanContactData(rawData) {
    const contact = {};
    
    // Clean and standardize field names
    Object.keys(rawData).forEach(key => {
      const cleanKey = key.toLowerCase().trim().replace(/\s+/g, '_');
      let value = rawData[key];
      
      if (typeof value === 'string') {
        value = value.trim();
      }
      
      // Skip empty values
      if (value && value !== '') {
        contact[cleanKey] = value;
      }
    });

    // Ensure required fields exist
    this.defaultFields.forEach(field => {
      if (!contact[field]) {
        contact[field] = '';
      }
    });

    return contact;
  }

  validateContact(contact) {
    const errors = [];
    
    if (!contact.name || contact.name.trim() === '') {
      errors.push('Name is required');
    }
    
    if (!contact.email && !contact.phone) {
      errors.push('Either email or phone is required');
    }
    
    if (contact.email && !this.isValidEmail(contact.email)) {
      errors.push('Invalid email format');
    }
    
    if (contact.phone && !this.isValidPhone(contact.phone)) {
      errors.push('Invalid phone format');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10;
  }

  async createSampleCSV(filePath) {
    const sampleContacts = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        company: 'Example Corp',
        address: '123 Main St',
        city: 'Charleston',
        state: 'SC',
        zip: '29401',
        notes: 'Sample contact'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1987654321',
        company: 'Test Company',
        address: '456 Oak Ave',
        city: 'Charleston',
        state: 'SC',
        zip: '29407',
        notes: 'Another sample contact'
      }
    ];

    await this.saveContacts(sampleContacts, filePath);
    logger.info(`Created sample CSV file: ${filePath}`);
    
    return filePath;
  }

  async mergeContacts(contacts1, contacts2, mergeStrategy = 'email') {
    const merged = new Map();
    
    // Add contacts from first list
    contacts1.forEach(contact => {
      const key = this.getContactKey(contact, mergeStrategy);
      if (key) {
        merged.set(key, contact);
      }
    });
    
    // Merge contacts from second list
    contacts2.forEach(contact => {
      const key = this.getContactKey(contact, mergeStrategy);
      if (key) {
        const existing = merged.get(key);
        if (existing) {
          // Merge non-empty fields from new contact
          Object.keys(contact).forEach(field => {
            if (contact[field] && (!existing[field] || existing[field] === '')) {
              existing[field] = contact[field];
            }
          });
        } else {
          merged.set(key, contact);
        }
      }
    });
    
    return Array.from(merged.values());
  }

  getContactKey(contact, strategy) {
    switch (strategy) {
      case 'email':
        return contact.email ? contact.email.toLowerCase() : null;
      case 'phone':
        return contact.phone ? contact.phone.replace(/\D/g, '') : null;
      case 'name':
        return contact.name ? contact.name.toLowerCase().trim() : null;
      default:
        return contact.email ? contact.email.toLowerCase() : null;
    }
  }

  async filterContacts(contacts, filters) {
    return contacts.filter(contact => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        const contactValue = contact[key];
        
        if (typeof filterValue === 'string') {
          return contactValue && contactValue.toLowerCase().includes(filterValue.toLowerCase());
        } else if (typeof filterValue === 'function') {
          return filterValue(contactValue);
        }
        
        return contactValue === filterValue;
      });
    });
  }

  async deduplicateContacts(contacts, strategy = 'email') {
    const seen = new Set();
    const deduplicated = [];
    
    contacts.forEach(contact => {
      const key = this.getContactKey(contact, strategy);
      if (key && !seen.has(key)) {
        seen.add(key);
        deduplicated.push(contact);
      }
    });
    
    logger.info(`Deduplicated ${contacts.length} contacts to ${deduplicated.length} unique contacts`);
    return deduplicated;
  }

  async getContactStats(contacts) {
    const stats = {
      total: contacts.length,
      withEmail: 0,
      withPhone: 0,
      withBoth: 0,
      invalidEmail: 0,
      invalidPhone: 0
    };
    
    contacts.forEach(contact => {
      if (contact.email) {
        stats.withEmail++;
        if (!this.isValidEmail(contact.email)) {
          stats.invalidEmail++;
        }
      }
      
      if (contact.phone) {
        stats.withPhone++;
        if (!this.isValidPhone(contact.phone)) {
          stats.invalidPhone++;
        }
      }
      
      if (contact.email && contact.phone) {
        stats.withBoth++;
      }
    });
    
    return stats;
  }
}

module.exports = ContactManager;


