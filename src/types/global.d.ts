export {};

declare global {
  interface Window {
    Spotify?: any; // Use a more specific type if you know it
  }
}
