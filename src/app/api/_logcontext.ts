// Context-aware logging for Next.js API routes using AsyncLocalStorage.
// This enables global IP-aware logging for all API routes.

import { AsyncLocalStorage } from 'async_hooks';

// Define the type for context
interface RequestContext {
  ip?: string;
}

// Use environment variable for IPs
const myIpsEnv = process.env.MY_COMPUTER_IPS;
const MY_IPS = myIpsEnv ? myIpsEnv.split(',').map(ip => ip.trim()) : [];

// Create an AsyncLocalStorage instance
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

// Patch global console.log to include IP if available, and replace with THEBEAST-PC if matches
const originalLog = console.log;
console.log = function (...args: any[]) {
  const store = requestContextStorage.getStore();
  let ip = store && store.ip ? store.ip : undefined;
  if (ip && MY_IPS.includes(ip)) {
    ip = 'THEBEAST-PC';
  }
  if (ip) {
    originalLog(`[IP: ${ip}]`, ...args);
  } else {
    originalLog(...args);
  }
};

// Helper to run a function within a context containing the IP address
export function withRequestContext<T>(ip: string | undefined, fn: () => T): T {
  return requestContextStorage.run({ ip }, fn);
}
