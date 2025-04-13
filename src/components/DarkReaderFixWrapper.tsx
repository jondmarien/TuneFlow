"use client";

import { useDarkReaderFix } from '@/utils/darkReaderFix';
import React from 'react';

/**
 * A client-side wrapper component to apply the Dark Reader fix.
 * This prevents server-client hydration mismatch issues.
 */
export function DarkReaderFixWrapper() {
  useDarkReaderFix();
  return null;
}
