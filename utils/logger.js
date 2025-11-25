/**
 * Logger Utility
 * Centralized logging system for branch admin pages
 * Stores logs in memory and provides methods to add different log types
 */

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Maximum number of logs to keep
    this.listeners = new Set();
  }

  /**
   * Subscribe to log updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of log updates
   */
  notify() {
    this.listeners.forEach(callback => callback([...this.logs]));
  }

  /**
   * Add a log entry
   */
  addLog(type, message, data = null, title = null) {
    const log = {
      type,
      message,
      data,
      title,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(log);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notify();
    return log;
  }

  /**
   * Log API request
   */
  logAPI(method, endpoint, payload = null) {
    return this.addLog(
      'api',
      `${method} ${endpoint}`,
      { method, endpoint, payload },
      `API Request: ${method} ${endpoint}`
    );
  }

  /**
   * Log API response
   */
  logAPIResponse(endpoint, response, status = null) {
    return this.addLog(
      'api',
      `Response from ${endpoint}`,
      { endpoint, response, status },
      `API Response: ${endpoint}`
    );
  }

  /**
   * Log API error
   */
  logAPIError(endpoint, error, payload = null) {
    return this.addLog(
      'error',
      `API Error: ${endpoint} - ${error.message || error}`,
      { endpoint, error, payload },
      `API Error: ${endpoint}`
    );
  }

  /**
   * Log success message
   */
  success(message, data = null) {
    return this.addLog('success', message, data, 'Success');
  }

  /**
   * Log error message
   */
  error(message, data = null) {
    return this.addLog('error', message, data, 'Error');
  }

  /**
   * Log warning message
   */
  warning(message, data = null) {
    return this.addLog('warning', message, data, 'Warning');
  }

  /**
   * Log info message
   */
  info(message, data = null) {
    return this.addLog('info', message, data, 'Info');
  }

  /**
   * Log data fetch
   */
  logDataFetch(dataType, result, count = null) {
    const message = count !== null 
      ? `Fetched ${count} ${dataType}`
      : `Fetched ${dataType}`;
    
    return this.addLog(
      'info',
      message,
      { dataType, result, count },
      `Data Fetch: ${dataType}`
    );
  }

  /**
   * Log data mapping/transformation
   */
  logDataMapping(source, target, count = null) {
    return this.addLog(
      'info',
      `Mapped ${source} to ${target}${count ? ` (${count} items)` : ''}`,
      { source, target, count },
      'Data Mapping'
    );
  }

  /**
   * Log missing data
   */
  logMissingData(field, context = null) {
    return this.addLog(
      'warning',
      `Missing data: ${field}${context ? ` in ${context}` : ''}`,
      { field, context },
      'Missing Data'
    );
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.notify();
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get logs by type
   */
  getLogsByType(type) {
    return this.logs.filter(log => log.type === type);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

