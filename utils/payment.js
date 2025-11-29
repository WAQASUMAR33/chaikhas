/**
 * Payment Utility Functions
 * Standardized functions for detecting and displaying payment methods across all dashboards
 */

/**
 * Detects if a payment is a credit payment
 * Checks multiple field names and formats (case-insensitive)
 * 
 * @param {Object} sale - Sale/Order/Bill object
 * @returns {boolean} - True if payment is credit
 */
export function isCreditPayment(sale) {
  if (!sale) return false;

  // Normalize payment fields (handle various field name formats)
  const paymentMode = (sale.payment_mode || sale.paymentMethod || sale.paymentMode || '').toString().trim();
  const paymentMethod = (sale.payment_method || sale.paymentMethod || '').toString().trim();
  const paymentStatus = (sale.payment_status || sale.paymentStatus || '').toString().trim();
  const isCreditFlag = sale.is_credit || sale.isCredit;
  const customerId = sale.customer_id || sale.customerId;

  // Check if any payment field contains "credit" (case-insensitive)
  const isCredit = 
    paymentStatus.toLowerCase() === 'credit' || 
    paymentMethod.toLowerCase() === 'credit' || 
    paymentMode.toLowerCase() === 'credit' ||
    isCreditFlag === true ||
    isCreditFlag === 1 ||
    isCreditFlag === '1' ||
    (customerId && customerId > 0 && paymentStatus.toLowerCase() === 'unpaid' && paymentMethod.toLowerCase() === 'credit');

  return isCredit;
}

/**
 * Gets the payment method display value
 * Prioritizes credit detection and handles fallbacks
 * 
 * @param {Object} sale - Sale/Order/Bill object
 * @returns {string} - Payment method display string
 */
export function getPaymentMethodDisplay(sale) {
  if (!sale) return 'N/A';

  // If it's credit, always show "Credit"
  if (isCreditPayment(sale)) {
    return 'Credit';
  }

  // Otherwise, show the actual payment method
  const paymentMode = (sale.payment_mode || sale.paymentMethod || sale.paymentMode || '').toString().trim();
  const paymentMethod = (sale.payment_method || sale.paymentMethod || '').toString().trim();
  const paymentStatus = (sale.payment_status || sale.paymentStatus || '').toString().trim();

  // Return the first available payment method, or 'N/A' if none
  return paymentMode || paymentMethod || paymentStatus || 'N/A';
}

/**
 * Gets normalized payment fields from a sale/order/bill object
 * Useful for consistent field access across different API responses
 * 
 * @param {Object} sale - Sale/Order/Bill object
 * @returns {Object} - Normalized payment fields
 */
export function getPaymentFields(sale) {
  if (!sale) {
    return {
      paymentMode: '',
      paymentMethod: '',
      paymentStatus: '',
      isCredit: false,
      customerId: null,
    };
  }

  return {
    paymentMode: (sale.payment_mode || sale.paymentMethod || sale.paymentMode || '').toString().trim(),
    paymentMethod: (sale.payment_method || sale.paymentMethod || '').toString().trim(),
    paymentStatus: (sale.payment_status || sale.paymentStatus || '').toString().trim(),
    isCredit: sale.is_credit || sale.isCredit || false,
    customerId: sale.customer_id || sale.customerId || null,
  };
}

