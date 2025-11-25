/**
 * useLogger Hook
 * React hook for using the logger in components
 */

import { useState, useEffect } from 'react';
import logger from '@/utils/logger';

export const useLogger = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Subscribe to log updates
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    // Get initial logs
    setLogs(logger.getLogs());

    return unsubscribe;
  }, []);

  return {
    logs,
    logger,
    clearLogs: () => logger.clear(),
  };
};

