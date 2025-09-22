// Performance monitoring and optimization utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isMonitoring = false;
  }

  // Start performance monitoring
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupObservers();
    this.measurePageLoad();
    console.log('Performance monitoring started');
  }

  // Stop performance monitoring
  stop() {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('Performance monitoring stopped');
  }

  // Setup performance observers
  setupObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('navigation', entry.name, entry.duration);
        });
      });
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('resource', entry.name, entry.duration);
        });
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  // Measure page load performance
  measurePageLoad() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        if (navigation) {
          this.recordMetric('pageLoad', 'domContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
          this.recordMetric('pageLoad', 'loadComplete', navigation.loadEventEnd - navigation.loadEventStart);
          this.recordMetric('pageLoad', 'totalLoadTime', navigation.loadEventEnd - navigation.fetchStart);
        }
        
        // Measure Core Web Vitals
        this.measureCoreWebVitals();
      }, 0);
    });
  }

  // Measure Core Web Vitals
  measureCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('webVitals', 'LCP', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('webVitals', 'FID', entry.processingStart - entry.startTime);
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric('webVitals', 'CLS', clsValue);
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  // Record a performance metric
  recordMetric(category, name, value) {
    const key = `${category}.${name}`;
    const existing = this.metrics.get(key) || [];
    existing.push({
      value,
      timestamp: Date.now()
    });
    this.metrics.set(key, existing);
  }

  // Get performance metrics
  getMetrics() {
    const result = {};
    for (const [key, values] of this.metrics.entries()) {
      const numericValues = values.map(v => v.value).filter(v => typeof v === 'number');
      if (numericValues.length > 0) {
        result[key] = {
          count: numericValues.length,
          average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          latest: values[values.length - 1].value
        };
      }
    }
    return result;
  }

  // Get performance report
  getReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      metrics
    };
    
    return report;
  }

  // Log performance report
  logReport() {
    const report = this.getReport();
    console.log('Performance Report:', report);
    return report;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance optimization utilities
export const optimizeImages = () => {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    // Add loading="lazy" for images below the fold
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    
    // Add decoding="async" for better performance
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
  });
};

// Preload critical resources
export const preloadCriticalResources = () => {
  const criticalResources = [
    '/src/assets/hccc-blue-logo.PNG',
    '/src/assets/hccc-gate.png',
    '/src/index.css'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.endsWith('.css') ? 'style' : 'image';
    document.head.appendChild(link);
  });
};

// Debounce function for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for performance
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
