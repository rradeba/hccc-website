// Rate limiting utility for form submissions
class RateLimiter {
  constructor() {
    this.submissions = new Map();
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  // Check if user can submit (rate limit: 10 submissions per 10 minutes)
  canSubmit(identifier, maxSubmissions = 10, windowMs = 10 * 60 * 1000) {
    const now = Date.now();
    const userSubmissions = this.submissions.get(identifier) || [];
    
    // Remove old submissions outside the window
    const recentSubmissions = userSubmissions.filter(
      timestamp => now - timestamp < windowMs
    );
    
    // Update the map with recent submissions
    this.submissions.set(identifier, recentSubmissions);
    
    // Check if user is within rate limit
    return recentSubmissions.length < maxSubmissions;
  }

  // Record a submission
  recordSubmission(identifier) {
    const now = Date.now();
    const userSubmissions = this.submissions.get(identifier) || [];
    userSubmissions.push(now);
    this.submissions.set(identifier, userSubmissions);
  }

  // Get time until next submission is allowed
  getTimeUntilNextSubmission(identifier, windowMs = 10 * 60 * 1000) {
    const userSubmissions = this.submissions.get(identifier) || [];
    if (userSubmissions.length === 0) return 0;
    
    const oldestSubmission = Math.min(...userSubmissions);
    const timeUntilReset = windowMs - (Date.now() - oldestSubmission);
    
    return Math.max(0, timeUntilReset);
  }

  // Clean up old entries
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [identifier, submissions] of this.submissions.entries()) {
      const recentSubmissions = submissions.filter(
        timestamp => now - timestamp < maxAge
      );
      
      if (recentSubmissions.length === 0) {
        this.submissions.delete(identifier);
      } else {
        this.submissions.set(identifier, recentSubmissions);
      }
    }
  }

  // Get user identifier (IP + User Agent for better tracking)
  getUserIdentifier() {
    // In a real app, you'd get the actual IP from the server
    // For now, we'll use a combination of available data
    const userAgent = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create a semi-unique identifier
    return btoa(`${userAgent}-${screenRes}-${timezone}`).slice(0, 32);
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();

// Rate limiting decorator for form submissions
export const withRateLimit = (fn, maxSubmissions = 3, windowMs = 10 * 60 * 1000) => {
  return async (...args) => {
    const identifier = rateLimiter.getUserIdentifier();
    
    if (!rateLimiter.canSubmit(identifier, maxSubmissions, windowMs)) {
      const timeUntilNext = rateLimiter.getTimeUntilNextSubmission(identifier, windowMs);
      const minutes = Math.ceil(timeUntilNext / (60 * 1000));
      
      throw new Error(
        `Too many submissions. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before submitting again.`
      );
    }
    
    // Record the submission
    rateLimiter.recordSubmission(identifier);
    
    // Execute the original function
    return await fn(...args);
  };
};
