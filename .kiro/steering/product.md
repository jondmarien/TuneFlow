# TuneFlow Product Overview

TuneFlow is an AI-powered playlist generator that seamlessly integrates YouTube and Spotify to help users discover, parse, and organize music from videos and comments into personalized playlists. Built with modern web technologies and AI, it bridges the gap between music discovery on YouTube and playlist management on streaming platforms.

## Core Features

### Music Discovery & Parsing
- **YouTube Content Parsing**: Extract song titles and artists from YouTube comments, video descriptions, and chapters
- **Multi-Source Detection**: Supports direct video links, manual input, and batch processing
- **Smart Content Analysis**: Handles various formats including DJ sets, music compilations, and user-generated content
- **Chapter Recognition**: Automatically detects timestamped tracklists in video descriptions

### AI-Powered Intelligence
- **Advanced Song Recognition**: Uses Genkit and Google Gemini AI for intelligent song identification
- **Context-Aware Matching**: Understands music context, genres, and artist variations
- **Smart Recommendations**: Suggests similar tracks and improves recognition accuracy over time
- **Error Correction**: Handles typos, abbreviations, and non-standard formatting in source content

### Multi-Platform Playlist Creation
- **Spotify Integration**: Create and manage Spotify playlists with full OAuth authentication
- **YouTube Playlist Support**: Generate regular YouTube playlists (not YouTube Music)
- **Batch Operations**: Add, remove, and manage multiple tracks efficiently
- **Playlist Customization**: Custom names, descriptions, and privacy settings

### Performance & User Experience
- **Smart Caching**: Redis-based caching for album art, API responses, and search results
- **Progressive Enhancement**: Works without JavaScript for core functionality
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Accessibility First**: WCAG compliant with screen reader support and keyboard navigation
- **Dark/Light Mode**: System-aware theming with manual toggle option

## Target Users

### Primary Audience
- **Music Enthusiasts**: Users who discover music through YouTube and want organized playlists
- **DJ & Music Curators**: Professionals who need to quickly convert sets into trackable playlists
- **Content Creators**: YouTubers and streamers who want to share their music selections
- **Music Collectors**: Users who want to preserve and organize music discoveries

### Use Cases
- Converting DJ mix tracklists into Spotify playlists
- Extracting songs from YouTube comment sections
- Organizing music from compilation videos
- Creating playlists from music discovery channels
- Archiving personal music discoveries

## Key Integrations & APIs

### Music Platforms
- **Spotify Web API**: Full playlist management, search, and user authentication
- **YouTube Data API v3**: Video metadata, comments, and playlist creation
- **Google APIs**: OAuth authentication and YouTube playlist management

### AI & Intelligence
- **Google Gemini AI**: Advanced natural language processing for song recognition
- **Genkit Framework**: AI workflow orchestration and prompt management

### Infrastructure
- **Redis**: High-performance caching for API responses and album artwork
- **NextAuth.js**: Secure OAuth authentication flow management
- **Firebase**: User data persistence and session management

## Business Value
- **Time Saving**: Automates manual playlist creation from video content
- **Discovery Enhancement**: Helps users organize and revisit discovered music
- **Cross-Platform Bridge**: Connects YouTube discovery with streaming platform organization
- **Content Preservation**: Prevents loss of music discoveries from temporary or deleted videos

## Technical Differentiators
- **AI-First Approach**: Leverages modern AI for intelligent content parsing
- **Performance Optimized**: Smart caching and efficient API usage
- **Developer Friendly**: Well-documented, modular architecture
- **Privacy Conscious**: Minimal data collection with clear user controls