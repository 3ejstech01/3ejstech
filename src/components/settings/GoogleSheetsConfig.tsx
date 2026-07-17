'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function GoogleSheetsConfig() {
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electron?.isElectron) {
      setIsElectron(true);
      window.electron.getSheetsUrl().then((url) => {
        setSheetsUrl(url);
        setLoading(false);
      });
    } else {
      // Web version - read from env
      setSheetsUrl(process.env.NEXT_PUBLIC_WEBAPP_URL || '');
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (window.electron?.isElectron) {
      await window.electron.setSheetsUrl(sheetsUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Show notification
      await window.electron.showNotification(
        'Settings Saved',
        'Google Sheets configuration updated successfully!'
      );
    }
  };

  if (!isElectron) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          ℹ️ This setting is only available in the desktop app. 
          In web mode, the URL is configured via environment variables.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-4">Loading configuration...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-2">
          Google Apps Script Web App URL
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Enter the deployment URL from your Google Apps Script project. 
          This connects the app to your Google Sheets data source.
        </p>
        <input
          type="url"
          value={sheetsUrl}
          onChange={(e) => setSheetsUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/AKfycb.../exec"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-colors"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!sheetsUrl.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                   text-white rounded-lg font-medium transition-colors
                   disabled:cursor-not-allowed"
        >
          Save Configuration
        </button>

        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-green-600 dark:text-green-400 font-medium"
          >
            ✓ Saved successfully!
          </motion.span>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How to get your Web App URL:
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>Open your Google Sheets document</li>
          <li>Go to Extensions → Apps Script</li>
          <li>Deploy → New deployment</li>
          <li>Select type: Web app</li>
          <li>Set "Execute as" to your account</li>
          <li>Set "Who has access" to "Anyone"</li>
          <li>Click Deploy and copy the Web app URL</li>
          <li>Paste the URL above and click Save</li>
        </ol>
      </div>
    </motion.div>
  );
}
