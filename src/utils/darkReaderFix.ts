"use client";

import { useEffect } from 'react';

/**
 * Fixes hydration issues with Dark Reader extension by delaying its application
 * until after the client-side hydration is complete.
 */
export function useDarkReaderFix() {
  useEffect(() => {
    // Check if Dark Reader is active
    const isDarkReaderEnabled = () => {
      return (
        document.documentElement.hasAttribute('data-darkreader-mode') ||
        document.documentElement.hasAttribute('data-darkreader-scheme')
      );
    };

    // If Dark Reader is detected, temporarily disable it during hydration
    if (isDarkReaderEnabled()) {
      // Remove Dark Reader attributes from HTML element during initial load
      document.documentElement.removeAttribute('data-darkreader-mode');
      document.documentElement.removeAttribute('data-darkreader-scheme');
      
      // Add a style to prevent Dark Reader from applying during hydration
      const style = document.createElement('style');
      style.textContent = 'html * { transition: none !important; color: inherit !important; background-color: inherit !important; }';
      document.head.appendChild(style);

      // Use a timeout to ensure Dark Reader is re-enabled only after hydration
      const timer = setTimeout(() => {
        document.head.removeChild(style);
        // Restore Dark Reader attributes if they were removed
        if (!document.documentElement.hasAttribute('data-darkreader-mode')) {
          document.documentElement.setAttribute('data-darkreader-mode', 'dynamic');
          document.documentElement.setAttribute('data-darkreader-scheme', 'dark');
        }
      }, 1000); // Delay for 1 second to ensure hydration is complete

      return () => {
        clearTimeout(timer);
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);
}
