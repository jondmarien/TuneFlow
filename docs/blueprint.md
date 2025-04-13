# **App Name**: TuneFlow

## Core Features:

- Link Input: Dual input fields for YouTube video links or individual comment URLs.
- Comment Parsing: AI-powered comment parsing to identify song titles and artists. It will use a tool to extract information from the comments. Option to prioritize pinned comments from videos.
- Spotify Integration: Spotify API integration for song searching and playlist creation.
- User Authentication: Spotify user authentication for playlist management.
- Song Preview: Display parsed song titles and artists before creating the playlist.

## Style Guidelines:

- Dark background (#121212) inspired by Spotify's dark mode.
- Light gray (#B3B3B3) for text and subtle UI elements.
- Spotify green (#1DB954) for active elements and highlights.
- Minimalistic layout with clear separation between input fields and results.
- Use recognizable icons for YouTube and Spotify throughout the interface.
- Smooth transitions and loading animations for a polished user experience.

## Original User Request:
I want to create a web app that extracts song titles and artists from YouTube comments and automatically generates a Spotify playlist. The app should allow users to input either:

    A YouTube video link to parse all comments, or

    A direct link to a specific YouTube comment.

The app should identify song names and artists mentioned in the comments, match those songs on Spotify using the Spotify API, and create a playlist directly on the user's Spotify account.

Features:

    Input field for YouTube video links or direct comment URLs (e.g., https://www.youtube.com/watch?v=VIDEO_ID&lc=COMMENT_ID).

    AI-powered parsing of comments to detect song titles and artists.

    Integration with the YouTube API to fetch comments from videos or specific comment threads.

    Integration with the Spotify API to search for songs and create playlists.

    User authentication via Spotify to manage their playlists.

    Option to prioritize pinned comments when parsing video links.

Technical Requirements:

    Use Firebase Firestore for storing user data and playlist metadata.

    Use Firebase Hosting for deploying the app.

    Implement AI (using Gemini in Firebase) for natural language processing to identify song names in comments.

    Include error handling for invalid links, unmatched songs, or API failures.

Design Preferences:

    Modern, minimalistic UI with two input options: "Video Link" and "Comment Link."

    Real-time feedback during playlist creation (e.g., progress indicators).

    Display parsed song titles before finalizing the playlist creation process.

Additional Notes:
Please generate code for both front-end and back-end functionality, ensuring proper handling of both video links and direct comment links. Include a web preview of the app after prototyping.
  