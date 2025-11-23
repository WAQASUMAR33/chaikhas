/**
 * Formatting Utilities
 * Helper functions for formatting prices, dates, etc.
 */

/**
 * Format price in Pakistani Rupees (PKR)
 * @param {number|string} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show PKR symbol (default: true)
 * @returns {string} Formatted price string
 */
export const formatPKR = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || amount === '') {
    return showSymbol ? 'PKR 0.00' : '0.00';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return showSymbol ? 'PKR 0.00' : '0.00';
  }

  // Format with 2 decimal places and thousand separators
  const formatted = numAmount.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return showSymbol ? `PKR ${formatted}` : formatted;
};

/**
 * Format price without symbol (just number with commas)
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted number string
 */
export const formatPrice = (amount) => {
  return formatPKR(amount, false);
};

/**
 * Parse PKR formatted string to number
 * @param {string} priceString - Formatted price string
 * @returns {number} Parsed number
 */
export const parsePrice = (priceString) => {
  if (!priceString) return 0;
  
  // Remove PKR, spaces, and commas
  const cleaned = priceString.toString()
    .replace(/PKR/gi, '')
    .replace(/,/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format a date string into a more readable format
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date, e.g., "Jan 15, 2024 12:30 PM"
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid date
    }
    
    // Format date using Intl.DateTimeFormat for better locale support
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  } catch (error) {
    // If error, return original string
    return dateString;
  }
};

