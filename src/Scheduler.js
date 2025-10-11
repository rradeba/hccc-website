const cron = require('node-cron');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class Scheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.scheduleFile = path.join(__dirname, '..', 'data', 'scheduled-tasks.json');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure data directory exists
      await this.ensureDataDirectory();
      
      // Load existing scheduled tasks
      await this.loadScheduledTasks();
      
      this.initialized = true;
      logger.info('Scheduler initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      throw error;
    }
  }

  async ensureDataDirectory() {
    const dataDir = path.dirname(this.scheduleFile);
    try {
      await fs.access(dataDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dataDir, { recursive: true });
        logger.info('Created data directory');
      } else {
        throw error;
      }
    }
  }

  async loadScheduledTasks() {
    try {
      const content = await fs.readFile(this.scheduleFile, 'utf8');
      const tasks = JSON.parse(content);
      
      // Restore scheduled tasks
      for (const task of tasks) {
        if (task.status === 'active') {
          await this.scheduleTask(task);
        }
      }
      
      logger.info(`Loaded ${tasks.length} scheduled tasks`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create empty array
        await this.saveScheduledTasks([]);
      } else {
        logger.error('Failed to load scheduled tasks:', error);
      }
    }
  }

  async saveScheduledTasks(tasks) {
    try {
      await fs.writeFile(this.scheduleFile, JSON.stringify(tasks, null, 2));
    } catch (error) {
      logger.error('Failed to save scheduled tasks:', error);
      throw error;
    }
  }

  async scheduleEmailCampaign(taskData) {
    const task = {
      id: this.generateTaskId(),
      type: 'email',
      name: taskData.name,
      description: taskData.description,
      schedule: taskData.schedule,
      contacts: taskData.contacts,
      template: taskData.template,
      subject: taskData.subject,
      message: taskData.message,
      delay: taskData.delay || 1000,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null
    };

    await this.scheduleTask(task);
    return task;
  }

  async scheduleSMSCampaign(taskData) {
    const task = {
      id: this.generateTaskId(),
      type: 'sms',
      name: taskData.name,
      description: taskData.description,
      schedule: taskData.schedule,
      contacts: taskData.contacts,
      template: taskData.template,
      message: taskData.message,
      delay: taskData.delay || 2000,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null
    };

    await this.scheduleTask(task);
    return task;
  }

  async scheduleTask(task) {
    try {
      // Calculate next run time
      const nextRun = this.calculateNextRun(task.schedule);
      task.nextRun = nextRun;

      // Create cron job
      const cronJob = cron.schedule(task.schedule, async () => {
        await this.executeTask(task);
      }, {
        scheduled: false,
        timezone: task.timezone || 'America/New_York'
      });

      // Store task
      this.scheduledTasks.set(task.id, {
        task: task,
        cronJob: cronJob
      });

      // Start the job
      cronJob.start();

      // Save to file
      await this.saveTask(task);

      logger.info(`Scheduled task "${task.name}" (${task.id}) for ${nextRun}`);
      return task;
    } catch (error) {
      logger.error(`Failed to schedule task "${task.name}":`, error);
      throw error;
    }
  }

  calculateNextRun(schedule) {
    try {
      // Parse cron expression and calculate next run
      const cronParser = require('cron-parser');
      const interval = cronParser.parseExpression(schedule);
      return interval.next().toDate().toISOString();
    } catch (error) {
      logger.error('Failed to calculate next run time:', error);
      return null;
    }
  }

  async executeTask(task) {
    try {
      logger.info(`Executing scheduled task: ${task.name} (${task.id})`);
      
      // Update last run time
      task.lastRun = new Date().toISOString();
      
      // Initialize bot if not already done
      const MassMessagingBot = require('./MassMessagingBot');
      const bot = new MassMessagingBot();
      await bot.initialize();

      let result;
      
      if (task.type === 'email') {
        result = await bot.sendMassEmails(task.contacts, {
          template: task.template,
          subject: task.subject,
          message: task.message,
          delay: task.delay
        });
      } else if (task.type === 'sms') {
        result = await bot.sendMassSMS(task.contacts, {
          template: task.template,
          message: task.message,
          delay: task.delay
        });
      }

      // Update task with results
      task.lastResult = result;
      task.nextRun = this.calculateNextRun(task.schedule);

      // Save updated task
      await this.saveTask(task);

      logger.info(`Task "${task.name}" completed: ${result.successful} successful, ${result.failed} failed`);
      
    } catch (error) {
      logger.error(`Failed to execute task "${task.name}":`, error);
      task.lastError = error.message;
      await this.saveTask(task);
    }
  }

  async cancelTask(taskId) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    if (!scheduledTask) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Stop cron job
    scheduledTask.cronJob.stop();
    scheduledTask.cronJob.destroy();

    // Update task status
    scheduledTask.task.status = 'cancelled';
    await this.saveTask(scheduledTask.task);

    // Remove from memory
    this.scheduledTasks.delete(taskId);

    logger.info(`Cancelled task: ${scheduledTask.task.name} (${taskId})`);
    return true;
  }

  async pauseTask(taskId) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    if (!scheduledTask) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Stop cron job
    scheduledTask.cronJob.stop();
    scheduledTask.task.status = 'paused';
    await this.saveTask(scheduledTask.task);

    logger.info(`Paused task: ${scheduledTask.task.name} (${taskId})`);
    return true;
  }

  async resumeTask(taskId) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    if (!scheduledTask) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Start cron job
    scheduledTask.cronJob.start();
    scheduledTask.task.status = 'active';
    await this.saveTask(scheduledTask.task);

    logger.info(`Resumed task: ${scheduledTask.task.name} (${taskId})`);
    return true;
  }

  async listTasks() {
    const tasks = [];
    for (const scheduledTask of this.scheduledTasks.values()) {
      tasks.push({
        id: scheduledTask.task.id,
        name: scheduledTask.task.name,
        type: scheduledTask.task.type,
        schedule: scheduledTask.task.schedule,
        status: scheduledTask.task.status,
        nextRun: scheduledTask.task.nextRun,
        lastRun: scheduledTask.task.lastRun,
        createdAt: scheduledTask.task.createdAt
      });
    }
    return tasks;
  }

  async getTask(taskId) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    return scheduledTask ? scheduledTask.task : null;
  }

  async saveTask(task) {
    try {
      // Load all tasks
      const content = await fs.readFile(this.scheduleFile, 'utf8');
      const tasks = JSON.parse(content);
      
      // Update or add task
      const index = tasks.findIndex(t => t.id === task.id);
      if (index >= 0) {
        tasks[index] = task;
      } else {
        tasks.push(task);
      }
      
      // Save back to file
      await this.saveScheduledTasks(tasks);
    } catch (error) {
      logger.error('Failed to save task:', error);
      throw error;
    }
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for common schedules
  static getCommonSchedules() {
    return {
      'Every minute': '* * * * *',
      'Every 5 minutes': '*/5 * * * *',
      'Every hour': '0 * * * *',
      'Every day at 9 AM': '0 9 * * *',
      'Every weekday at 9 AM': '0 9 * * 1-5',
      'Every Monday at 9 AM': '0 9 * * 1',
      'Every month on the 1st at 9 AM': '0 9 1 * *',
      'Every 15 minutes': '*/15 * * * *',
      'Every 30 minutes': '*/30 * * * *',
      'Every 2 hours': '0 */2 * * *'
    };
  }

  async cleanup() {
    logger.info('Cleaning up scheduler...');
    
    // Stop all cron jobs
    for (const scheduledTask of this.scheduledTasks.values()) {
      scheduledTask.cronJob.stop();
      scheduledTask.cronJob.destroy();
    }
    
    this.scheduledTasks.clear();
    this.initialized = false;
  }
}

module.exports = Scheduler;


