# Mass Messaging Bot with AI Integration

A powerful Node.js bot for sending mass emails and SMS messages to contact lists with advanced AI integration. Perfect for marketing campaigns, notifications, and customer communications. **Now includes AI chatbot integration for generating and customizing messages automatically.**

## Features

### Core Messaging
- 📧 **Mass Email Sending** - Send personalized emails via Gmail API or SMTP
- 📱 **Mass SMS Sending** - Send SMS messages via Twilio
- 👥 **Contact Management** - Import/export contacts from CSV files
- 📝 **Message Templates** - Create and manage reusable message templates
- 🔄 **Personalization** - Dynamic content with contact data placeholders

### 🤖 AI Integration (NEW!)
- **AI Message Processing** - Receive and customize AI-generated messages
- **Advanced Customization** - Multi-level personalization (basic, full, advanced)
- **API Endpoints** - RESTful API for AI chatbot integration
- **Smart Placeholders** - Context-aware message customization
- **Behavioral Context** - Messages adapt based on contact behavior and history

### System Features
- ⏰ **Rate Limiting** - Built-in delays to respect service limits
- 📊 **Delivery Tracking** - Comprehensive logging and delivery statistics
- 🖥️ **CLI Interface** - Easy-to-use command-line interface
- 🔧 **Interactive Mode** - User-friendly interactive prompts
- 🌐 **API Server** - HTTP API for external integrations

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   copy env.example .env
   ```
4. Configure your credentials in `.env`

## Configuration

### Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add your credentials to `.env`:
   ```
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REFRESH_TOKEN=your_refresh_token
   GMAIL_USER=your_email@gmail.com
   ```

### Twilio SMS Setup

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### SMTP Alternative (Optional)

If you prefer SMTP over Gmail API:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Usage

### Command Line Interface

#### Send Mass Emails
```bash
# Send emails using a template
node index.js send-email -f contacts.csv -t welcome_email

# Send emails with custom subject and message
node index.js send-email -f contacts.csv -s "Special Offer!" -m "Check out our latest deals..."

# Dry run to preview without sending
node index.js send-email -f contacts.csv -t welcome_email --dry-run

# Custom delay between emails (milliseconds)
node index.js send-email -f contacts.csv -t welcome_email --delay 2000
```

#### Send Mass SMS
```bash
# Send SMS using a template
node index.js send-sms -f contacts.csv -t follow_up_sms

# Send SMS with custom message
node index.js send-sms -f contacts.csv -m "Your service is complete. Rate us 5 stars!"

# Dry run to preview
node index.js send-sms -f contacts.csv -t follow_up_sms --dry-run
```

### 🤖 AI Message Processing (NEW!)
```bash
# Process AI-generated message with full customization
node index.js ai-process -f contacts.csv -m "Hi [GREETING], special offer for [COMPANY_CONTEXT]!" -s "Special Offer" -t email

# Preview AI message customization without sending
node index.js ai-process -f contacts.csv -m "Hi [GREETING]!" --preview

# Advanced customization with AI context
node index.js ai-process -f contacts.csv -m "Hi [GREETING]!" -l advanced

# Start API server for AI chatbot integration
node index.js api-server --port 3001
```

#### Template Management
```bash
# List all templates
node index.js templates --list

# Create new template
node index.js templates --create

# Delete template
node index.js templates --delete template_name
```

#### Interactive Mode
```bash
# Run in interactive mode
node index.js interactive
```

### Contact List Format

Your CSV file should have the following columns:
- `name` - Contact's full name
- `email` - Email address
- `phone` - Phone number (with country code)
- `company` - Company name (optional)
- `address` - Street address (optional)
- `city` - City (optional)
- `state` - State (optional)
- `zip` - ZIP code (optional)
- `notes` - Additional notes (optional)

Example:
```csv
name,email,phone,company,notes
John Doe,john.doe@example.com,+1234567890,Example Corp,Potential customer
Jane Smith,jane.smith@example.com,+1987654321,Test Company,Returning customer
```

### Message Templates

Templates support personalization using placeholders:

- `{{name}}` - Full name
- `{{firstName}}` - First name
- `{{lastName}}` - Last name
- `{{email}}` - Email address
- `{{phone}}` - Phone number
- `{{company}}` - Company name
- `{{address}}` - Street address
- `{{city}}` - City
- `{{state}}` - State
- `{{zip}}` - ZIP code

Example template:
```
Hi {{firstName}},

Thank you for choosing {{company}}! Your service is scheduled for tomorrow.

Best regards,
The Team
```

## Programmatic Usage

```javascript
const MassMessagingBot = require('./src/MassMessagingBot');
const ContactManager = require('./src/ContactManager');

async function sendCampaign() {
  // Initialize bot
  const bot = new MassMessagingBot();
  await bot.initialize();
  
  // Load contacts
  const contactManager = new ContactManager();
  const contacts = await contactManager.loadContacts('contacts.csv');
  
  // Send emails
  const result = await bot.sendMassEmails(contacts, {
    template: 'welcome_email',
    delay: 1000
  });
  
  console.log(`Sent ${result.successful} emails`);
}

sendCampaign();
```

## Security Features

- ✅ **Rate Limiting** - Prevents spam and respects service limits
- ✅ **Input Validation** - Validates email addresses and phone numbers
- ✅ **Error Handling** - Comprehensive error logging and recovery
- ✅ **Credential Protection** - Environment variables for sensitive data
- ✅ **Delivery Tracking** - Full audit trail of all messages sent

## Logging

All activities are logged to:
- `logs/combined.log` - All log messages
- `logs/error.log` - Error messages only
- `logs/deliveries.log` - Message delivery tracking

## Troubleshooting

### Common Issues

1. **Gmail API Authentication Error**
   - Ensure your refresh token is valid
   - Check that Gmail API is enabled in Google Cloud Console

2. **Twilio SMS Fails**
   - Verify your phone number format (include country code)
   - Check your Twilio account balance
   - Ensure your Twilio phone number is verified

3. **CSV Import Errors**
   - Check file encoding (should be UTF-8)
   - Ensure required columns exist
   - Validate email addresses and phone numbers

### Getting Help

Check the logs in the `logs/` directory for detailed error information. Most issues are logged with helpful error messages.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For support or questions, please create an issue in the repository.