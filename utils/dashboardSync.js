/**
 * Dashboard Synchronization Utility
 * Enables real-time updates across multiple dashboard instances
 * Uses localStorage events to notify other tabs/windows when data changes
 */

/**
 * Broadcast an update event to all dashboard instances
 * @param {string} eventType - Type of event ('order_updated', 'bill_updated', 'order_created', etc.)
 * @param {Object} data - Event data (order_id, bill_id, etc.)
 */
export const broadcastUpdate = (eventType, data = {}) => {
  if (typeof window === 'undefined') return;
  
  const event = {
    type: eventType,
    data: data,
    timestamp: Date.now(),
    source: 'dashboard_sync'
  };
  
  // Store in localStorage to trigger storage event
  const key = `dashboard_update_${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(event));
  
  // Remove the item immediately (storage event still fires)
  setTimeout(() => {
    localStorage.removeItem(key);
  }, 100);
  
  // Also dispatch a custom event for same-tab listeners
  window.dispatchEvent(new CustomEvent('dashboardUpdate', { detail: event }));
  
  console.log(`📢 Broadcasted ${eventType}:`, data);
};

/**
 * Listen for dashboard update events
 * @param {Function} callback - Callback function to execute when update occurs
 * @param {string|Array} eventTypes - Event type(s) to listen for (optional, listens to all if not specified)
 * @returns {Function} Cleanup function to remove listeners
 */
export const listenForUpdates = (callback, eventTypes = null) => {
  if (typeof window === 'undefined') return () => {};
  
  const eventTypesArray = eventTypes 
    ? (Array.isArray(eventTypes) ? eventTypes : [eventTypes])
    : null;
  
  const handleStorageEvent = (e) => {
    if (e.key && e.key.startsWith('dashboard_update_')) {
      try {
        const event = JSON.parse(e.newValue);
        if (event && event.source === 'dashboard_sync') {
          // If eventTypes specified, filter by type
          if (!eventTypesArray || eventTypesArray.includes(event.type)) {
            callback(event);
          }
        }
      } catch (error) {
        console.error('Error parsing dashboard update event:', error);
      }
    }
  };
  
  const handleCustomEvent = (e) => {
    const event = e.detail;
    if (event && event.source === 'dashboard_sync') {
      // If eventTypes specified, filter by type
      if (!eventTypesArray || eventTypesArray.includes(event.type)) {
        callback(event);
      }
    }
  };
  
  // Listen to both storage events (cross-tab) and custom events (same-tab)
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('dashboardUpdate', handleCustomEvent);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('dashboardUpdate', handleCustomEvent);
  };
};

/**
 * Event types for dashboard synchronization
 */
export const UPDATE_EVENTS = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_DELETED: 'order_deleted',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  BILL_CREATED: 'bill_created',
  BILL_UPDATED: 'bill_updated',
  BILL_PAID: 'bill_paid',
  TABLE_UPDATED: 'table_updated',
  DISH_UPDATED: 'dish_updated',
  CATEGORY_UPDATED: 'category_updated',
};

