// Caching utility for API responses and data
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemorySize = 50; // Maximum number of items in memory cache
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  // Generate cache key
  generateKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  // Check if item is expired
  isExpired(item) {
    if (!item.timestamp || !item.ttl) return false;
    return Date.now() - item.timestamp > item.ttl;
  }

  // Get item from cache
  get(key) {
    const item = this.memoryCache.get(key);
    
    if (!item) return null;
    
    if (this.isExpired(item)) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.data;
  }

  // Set item in cache
  set(key, data, ttl = this.defaultTTL) {
    // Clean up old items if cache is full
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.cleanup();
    }
    
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    this.memoryCache.set(key, item);
  }

  // Remove item from cache
  delete(key) {
    this.memoryCache.delete(key);
  }

  // Clear all cache
  clear() {
    this.memoryCache.clear();
  }

  // Clean up expired items
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.memoryCache.size,
      maxSize: this.maxMemorySize,
      keys: Array.from(this.memoryCache.keys())
    };
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Cached fetch function
export const cachedFetch = async (url, options = {}, ttl = 5 * 60 * 1000) => {
  const key = cacheManager.generateKey(url, options);
  
  // Try to get from cache first
  const cachedData = cacheManager.get(key);
  if (cachedData) {
    console.log('Serving from cache:', url);
    return cachedData;
  }
  
  // Fetch from network
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    cacheManager.set(key, data, ttl);
    
    console.log('Cached response for:', url);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Cache invalidation helpers
export const invalidateCache = (pattern) => {
  const stats = cacheManager.getStats();
  const keysToDelete = stats.keys.filter(key => key.includes(pattern));
  
  keysToDelete.forEach(key => cacheManager.delete(key));
  console.log(`Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
};

// Local storage cache for persistent data
export const localStorageCache = {
  set(key, data, ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  get(key) {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      const now = Date.now();
      
      if (now - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },
  
  delete(key) {
    localStorage.removeItem(`cache_${key}`);
  },
  
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};
