# SoundCloud API Parity Implementation Plan

This document outlines the steps required to bring SoundCloud integration to full parity with existing Spotify and YouTube features in TuneFlow.

---

## Step-by-Step Plan for Full SoundCloud Parity

### 1. Frontend: User Authentication & Connection Status
- **Add a SoundCloud connect/login button**  
  - Create a `SoundCloudStatusBanner` component (like `SpotifyStatusBanner` and `YoutubeStatusBanner`).
  - Add a button that redirects to `/api/soundcloud/auth` for OAuth login.
  - Show connection status (connected/disconnected) based on the presence of a valid access token (check via a `/api/soundcloud/me` endpoint).

- **Update the main UI**  
  - Add SoundCloud as a selectable service in your playlist creation flow (where you currently choose Spotify/YouTube).
  - Show the SoundCloud status banner alongside the others.

### 2. Backend: User Info & Playlist Endpoints
- **Implement `/api/soundcloud/me`**  
  - Fetch the user's profile info using the SoundCloud API and the access token stored in cookies.
  - Return `{ connected: boolean, id, username, ... }` (similar to `/api/spotify/me`).

- **Implement `/api/soundcloud/playlist`**  
  - If SoundCloud's API allows playlist creation, add an endpoint to create a playlist and add tracks for the authenticated user.
  - Use the access token from cookies for authenticated requests.

### 3. Frontend: Playlist Creation Logic
- **Add SoundCloud playlist creation logic**  
  - In your playlist creation form/component, add logic for SoundCloud:
    - Gather track IDs/URIs for SoundCloud (using your `/api/soundcloud/search`).
    - Call your new `/api/soundcloud/playlist` endpoint to create the playlist.
    - Show success/error messages and provide a link to the created playlist.

- **Service Functions/Hooks**  
  - Add service functions (e.g., `createSoundCloudPlaylist`, `searchSoundCloudTrack`, `fetchSoundCloudConnection`) similar to your Spotify/YouTube services.

### 4. UI/UX Parity
- **Update all places where Spotify/YouTube are referenced**  
  - Ensure SoundCloud is an option everywhere (dropdowns, banners, playlist creation, etc.).
  - Add SoundCloud icons and branding for a consistent look.

### 5. Testing & Polish
- **Test the full flow:**  
  - Login, search, playlist creation, error handling, and logout for SoundCloud.
- **Update documentation:**  
  - Add SoundCloud setup instructions and usage notes to your README.

---

## Example: SoundCloudStatusBanner Component

```tsx
export function SoundCloudStatusBanner({ soundcloudConnected, loading, onConnect }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="font-semibold" style={{ color: '#ff5500' }}>SoundCloud</span>
      {soundcloudConnected ? (
        <span className="ml-1 text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold border border-orange-300 min-w-[90px] text-center">
          CONNECTED!
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="ml-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={onConnect}
          disabled={loading}
        >
          Connect
        </Button>
      )}
    </div>
  );
}
```

---

## Summary Table: What to Implement

| Area                | Spotify         | YouTube         | SoundCloud (To Do)         |
|---------------------|-----------------|-----------------|----------------------------|
| OAuth Backend       | ✅              | ✅             | ✅ (already done)          |
| Track Search        | ✅              | N/A            | ✅ (already done)           |
| Playlist Creation   | ✅              | ✅             | 🚧 (implement endpoint/UI) |
| User Info/Status    | ✅              | ✅             | 🚧 (implement endpoint/UI) |
| UI Connect Button   | ✅              | ✅             | 🚧 (add to UI)             |
| UI Playlist Option  | ✅              | ✅             | 🚧 (add to UI)             |
| Service Hooks/Logic | ✅              | ✅             | 🚧 (add to frontend)       |

---

**You are in a strong position to finish this! If you want, you can use this checklist to track your progress as you implement each step.** 