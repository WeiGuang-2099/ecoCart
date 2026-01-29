/**
 * Configuration Module
 * Manages environment variables and validates required settings
 */

module.exports = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Keys
  openaiApiKey: process.env.OPENAI_API_KEY,
  
  // File upload limits
  maxFileSize: 5 * 1024 * 1024, // 5MB
  
  // Image processing
  maxImageWidth: 1200,
  imageQuality: 0.8,
  
  // Privacy settings
  dataRetention: '0-days',
  storagePolicy: 'memory-only',
  
  /**
   * Validate configuration
   * Throws error if required settings are missing in production
   */
  validate() {
    const errors = [];
    
    if (this.nodeEnv === 'production' && !this.openaiApiKey) {
      errors.push('OPENAI_API_KEY is required in production environment');
    }
    
    if (this.port && (isNaN(this.port) || this.port < 1 || this.port > 65535)) {
      errors.push('PORT must be a valid port number (1-65535)');
    }
    
    if (errors.length) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
  },
  
  /**
   * Get configuration summary (safe for logging)
   */
  getSummary() {
    return {
      port: this.port,
      nodeEnv: this.nodeEnv,
      hasOpenAIKey: !!this.openaiApiKey,
      maxFileSize: `${this.maxFileSize / 1024 / 1024}MB`
    };
  }
};
