// --- Dark Reader Fix Wrapper ---
/**
 * Client-side wrapper to apply the Dark Reader fix.
 *
 * Prevents server-client hydration mismatch issues by running the fix on the client only.
 */
"use client";

import { useDarkReaderFix } from '@/utils/darkReaderFix';
import React from 'react';

/**
 * DarkReaderFixWrapper component.
 * Calls useDarkReaderFix hook to delay Dark Reader activation until after hydration.
 */
export function DarkReaderFixWrapper() {
  useDarkReaderFix();
  return null;
}
