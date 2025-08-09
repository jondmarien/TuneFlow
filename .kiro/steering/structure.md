# TuneFlow Project Structure & Architecture

## Root Directory Organization
```
├── src/                    # Main source code
├── public/                 # Static assets and legal documents
├── docs/                   # Project documentation
├── patches/                # Package patches (patch-package)
├── .kiro/                  # Kiro AI assistant configuration
├── .vscode/                # VS Code workspace settings
├── .next/                  # Next.js build output (generated)
└── node_modules/           # Dependencies (generated)
```

## Source Code Architecture (`src/`)

### Core Application Structure

#### **`app/` - Next.js App Router**
Modern file-based routing with React Server Components:
```
app/
├── api/                    # API route handlers
│   ├── spotify/           # Spotify API endpoints
│   │   ├── auth/          # OAuth authentication
│   │   ├── playlist/      # Playlist operations
│   │   └── me/            # User profile
│   ├── youtube/           # YouTube API endpoints
│   └── genkit/            # AI workflow endpoints
├── (legal-pages)/         # Route groups for legal pages
│   ├── privacy-policy/
│   ├── terms-of-use/
│   ├── gdpr-policy/
│   └── data-opt-out/
├── layout.tsx             # Root layout with providers
├── page.tsx               # Main application page
├── globals.css            # Global styles and CSS variables
└── SessionProviderWrapper.tsx # NextAuth session wrapper
```

#### **`components/` - React Component Library**
Feature-based component organization:
```
components/
├── ui/                    # Shadcn/ui base components
│   ├── button.tsx         # Button variants with CVA
│   ├── dialog.tsx         # Modal dialogs
│   ├── input.tsx          # Form inputs
│   ├── toast.tsx          # Notification system
│   └── ...                # Other UI primitives
├── shared/                # Cross-feature components
│   ├── ThemeToggle.tsx    # Dark/light mode toggle
│   ├── DarkReaderFixWrapper.tsx # Hydration fix
│   └── LoadingSpinner.tsx # Loading states
├── playlist/              # Playlist management
│   ├── PlaylistCreator.tsx
│   ├── PlaylistManager.tsx
│   └── PlaylistItem.tsx
├── song/                  # Song display and interaction
│   ├── SongCard.tsx
│   ├── SongList.tsx
│   └── SongSearch.tsx
├── spotify/               # Spotify-specific UI
│   ├── SpotifyAuth.tsx
│   ├── SpotifyPlayer.tsx
│   └── SpotifyPlaylist.tsx
└── youtube/               # YouTube-specific UI
    ├── YouTubeParser.tsx
    ├── YouTubeEmbed.tsx
    └── YouTubePlaylist.tsx
```

#### **`ai/` - AI Integration Layer**
Genkit-based AI workflows:
```
ai/
├── flows/                 # AI workflow definitions
│   ├── song-recognition.ts
│   ├── content-parsing.ts
│   └── playlist-generation.ts
├── ai-instance.ts         # Genkit configuration
├── dev.ts                 # Development server
└── prompts/               # AI prompt templates
```

### Supporting Architecture

#### **`hooks/` - Custom React Hooks**
Reusable stateful logic:
```
hooks/
├── usePlaylistCreation.ts # Playlist creation workflow
├── useAlbumArtWithFailure.ts # Album art with fallbacks
├── useSessionStorage.ts   # Browser storage management
├── use-toast.ts          # Toast notification system
└── use-mobile.tsx        # Mobile device detection
```

#### **`services/` - Business Logic Layer**
API integration and business logic:
```
services/
├── spotify-service.ts     # Spotify API client
├── playlist.ts           # Playlist operations
└── api.ts                # Generic API utilities
```

#### **`utils/` - Pure Utility Functions**
Helper functions without side effects:
```
utils/
├── formatters.ts         # Data formatting utilities
├── typeGuards.ts         # TypeScript type guards
├── sessionHelpers.ts     # Session management helpers
├── darkReaderFix.ts      # Theme compatibility fixes
└── redis.ts              # Redis client configuration
```

#### **`types/` - TypeScript Definitions**
Shared type definitions:
```
types/
├── tuneflow.ts           # Core application types
├── spotify.ts            # Spotify API types
├── youtube.ts            # YouTube API types
└── ai.ts                 # AI workflow types
```

#### **`lib/` - Library Configurations**
Third-party library setup:
```
lib/
├── utils.ts              # Tailwind utility functions (cn)
├── auth.ts               # NextAuth configuration
└── redis.ts              # Redis client setup
```

## Configuration Files

### **Core Configuration**
- **`next.config.ts`**: Next.js build and runtime configuration
- **`tsconfig.json`**: TypeScript compiler settings with strict mode
- **`tailwind.config.ts`**: Tailwind CSS with custom design system
- **`components.json`**: Shadcn/ui component configuration

### **Package Management**
- **`package.json`**: Dependencies and scripts
- **`yarn.lock`**: Dependency lock file (Yarn 4.9.2)
- **`patches/`**: Custom package modifications

## Import Path Conventions

### **Path Aliases (configured in tsconfig.json)**
```typescript
// Component imports
import { Button } from "@/components/ui/button"
import { PlaylistCreator } from "@/components/playlist/PlaylistCreator"

// Utility imports
import { cn } from "@/lib/utils"
import { formatDuration } from "@/utils/formatters"

// Hook imports
import { usePlaylistCreation } from "@/hooks/usePlaylistCreation"

// Service imports
import { getTrackAlbumArt } from "@/services/spotify-service"

// Type imports
import type { Song } from "@/types/tuneflow"
```

### **Import Organization**
1. **External libraries** (React, Next.js, third-party)
2. **Internal components** (UI, shared, feature-specific)
3. **Hooks and utilities** (custom hooks, utility functions)
4. **Types** (TypeScript type imports)
5. **Relative imports** (same directory or parent)

## Component Architecture Patterns

### **Component Composition**
- **Compound Components**: Related components that work together
- **Render Props**: Flexible component APIs for customization
- **Higher-Order Components**: Cross-cutting concerns (rare, prefer hooks)

### **State Management**
- **Local State**: useState for component-specific state
- **Server State**: TanStack Query for API data
- **Global State**: React Context for app-wide state
- **URL State**: Next.js router for shareable state

### **Error Handling**
- **Error Boundaries**: React error boundaries for component errors
- **Try-Catch**: Async operation error handling
- **Validation**: Zod schemas for runtime type checking

## File Naming Conventions

### **React Components**
- **PascalCase**: `PlaylistCreator.tsx`, `SongCard.tsx`
- **Descriptive Names**: Clear purpose and functionality
- **Feature Prefixes**: `SpotifyAuth.tsx`, `YouTubeParser.tsx`

### **Hooks**
- **camelCase with `use` prefix**: `usePlaylistCreation.ts`
- **Descriptive Purpose**: `useAlbumArtWithFailure.ts`
- **Return Type Indication**: `useSessionStorage.ts`

### **Utilities & Services**
- **camelCase**: `formatters.ts`, `typeGuards.ts`
- **Plural for Collections**: `formatters.ts` (multiple functions)
- **Service Suffix**: `spotify-service.ts`, `api-service.ts`

### **Types**
- **camelCase**: `tuneflow.ts`, `spotify.ts`
- **Domain-Based**: Group related types by feature/domain

### **API Routes**
- **kebab-case**: `create-playlist.ts`, `search-tracks.ts`
- **RESTful Naming**: Follow REST conventions for endpoints
- **Nested Structure**: Mirror API endpoint structure

## Code Organization Principles

### **Feature-Based Organization**
- Group related functionality together
- Minimize cross-feature dependencies
- Clear feature boundaries and interfaces

### **Separation of Concerns**
- **UI Components**: Pure presentation logic
- **Business Logic**: Services and utilities
- **State Management**: Hooks and context providers
- **API Integration**: Dedicated service layers

### **Dependency Direction**
- **UI → Hooks → Services → Utils**
- **Avoid Circular Dependencies**: Clear dependency hierarchy
- **Interface Segregation**: Small, focused interfaces

### **Testing Strategy** (Future Implementation)
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Feature workflows
- **E2E Tests**: Critical user journeys
- **API Tests**: External service integration

## Development Workflow

### **Component Development**
1. **Create Component**: Start with TypeScript interface
2. **Implement Logic**: Add functionality with proper error handling
3. **Style Component**: Apply Tailwind classes and variants
4. **Add Documentation**: JSDoc comments for complex logic
5. **Export Component**: Add to appropriate barrel export

### **API Route Development**
1. **Define Interface**: Request/response types
2. **Implement Handler**: Business logic with validation
3. **Error Handling**: Comprehensive error responses
4. **Authentication**: Secure endpoints appropriately
5. **Documentation**: API documentation comments

### **Hook Development**
1. **Identify Reusable Logic**: Extract from components
2. **Define Interface**: Clear input/output types
3. **Implement Hook**: Stateful logic with cleanup
4. **Error Handling**: Graceful error states
5. **Testing**: Unit tests for hook behavior