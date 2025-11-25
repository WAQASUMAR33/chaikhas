'use client';

/**
 * Beautiful Log Panel Component
 * Shows on the right side of the screen
 * Displays API calls, responses, errors, and data flow
 */

import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Download, AlertCircle, CheckCircle, Info, AlertTriangle, Bug, Database, RefreshCw } from 'lucide-react';

const LogPanel = ({ isOpen, onClose, logs, onClear }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('all'); // all, error, success, info, api
  const logEndRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs based on selected filter
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  // Get log icon based on type
  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'api':
        return <Database className="w-4 h-4 text-blue-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  // Get log color based on type
  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'api':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'info':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  // Format log message
  const formatMessage = (message) => {
    if (typeof message === 'object') {
      return JSON.stringify(message, null, 2);
    }
    return String(message);
  };

  // Export logs to file
  const exportLogs = () => {
    const logText = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      return `[${timestamp}] [${log.type.toUpperCase()}] ${log.message}`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF5F15] to-[#FF8C42] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          <h3 className="font-bold text-lg">Developer Logs</h3>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            {logs.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-white/20 rounded p-1 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 space-y-2">
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1">
          {['all', 'error', 'success', 'warning', 'api', 'info'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded font-medium transition ${
                filter === f
                  ? 'bg-[#FF5F15] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
          <button
            onClick={exportLogs}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
          <label className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3 h-3"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No logs to display</p>
            <p className="text-xs mt-1">Select a different filter or wait for new logs</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 text-xs ${getLogColor(log.type)} transition hover:shadow-md`}
            >
              <div className="flex items-start gap-2 mb-1">
                {getLogIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[10px] uppercase tracking-wide">
                      {log.type}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.title && (
                    <div className="font-medium mb-1 text-sm">{log.title}</div>
                  )}
                  <div className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                    {formatMessage(log.message)}
                  </div>
                  {log.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] font-medium opacity-70 hover:opacity-100">
                        View Data
                      </summary>
                      <pre className="mt-1 p-2 bg-black/5 rounded text-[10px] overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-2 text-center text-xs text-gray-500">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  );
};

export default LogPanel;

