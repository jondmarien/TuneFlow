# TuneFlow Tech Stack & Development Guide

## Core Framework & Runtime

### Next.js 15 Architecture
- **App Router**: Modern file-based routing with React Server Components
- **React Server Components**: Server-side rendering for optimal performance
- **Static Export**: Configured for static site generation (`output: 'export'`)
- **Turbopack**: Fast development bundler for improved DX
- **TypeScript**: Strict mode enabled with comprehensive type checking

### Runtime Environment
- **Node.js**: Server-side JavaScript runtime
- **ES2017 Target**: Modern JavaScript features with broad compatibility
- **Module Resolution**: Bundler-based resolution for optimal tree-shaking

## UI & Styling Architecture

### Design System
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **CSS Variables**: HSL-based color system for consistent theming
- **Responsive Design**: Mobile-first approach with breakpoint system
- **Dark/Light Mode**: Class-based theme switching with system preference detection

### Component Library
- **Shadcn/ui**: Accessible component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible components for complex UI patterns
- **Class Variance Authority (CVA)**: Type-safe component variant management
- **Lucide React**: Consistent icon system with tree-shaking support

### Styling Conventions
- **Utility Classes**: Prefer Tailwind utilities over custom CSS
- **Component Variants**: Use CVA for component styling variations
- **CSS Custom Properties**: Leverage CSS variables for dynamic theming
- **Responsive Utilities**: Mobile-first responsive design patterns

## AI & External API Integration

### AI Platform
- **Genkit**: Google's AI development framework for workflow orchestration
- **Google Gemini 2.0 Flash**: Multimodal AI model for content analysis and song recognition
- **Prompt Management**: Organized prompt directory structure for AI workflows
- **Error Handling**: Comprehensive error handling for AI operations

### Music Platform APIs
- **Spotify Web API**: 
  - OAuth 2.0 authentication flow
  - Playlist creation and management
  - Track search and metadata retrieval
  - User profile access
- **YouTube Data API v3**:
  - Video metadata extraction
  - Comment parsing and analysis
  - Playlist creation (regular YouTube, not YouTube Music)
  - Chapter detection and parsing

### API Client Patterns
- **Service Layer Architecture**: Dedicated service classes for each API
- **Token Management**: Automatic token refresh and caching
- **Rate Limiting**: Built-in respect for API rate limits
- **Error Recovery**: Graceful degradation and retry mechanisms

## Data Management & Caching

### Caching Strategy
- **Redis**: High-performance in-memory caching
  - Album art URL caching
  - API response caching
  - Session data storage
  - Rate limit tracking
- **TanStack Query**: Client-side state management and caching
- **Browser Storage**: LocalStorage for theme preferences and user settings

### Data Flow
- **Server-Side**: API routes handle external service communication
- **Client-Side**: React hooks manage UI state and user interactions
- **Caching Layers**: Multi-level caching for optimal performance

## Authentication & Security

### OAuth Implementation
- **NextAuth.js**: Secure authentication framework
- **Spotify OAuth**: PKCE flow for secure token exchange
- **Google OAuth**: YouTube API access with appropriate scopes
- **Session Management**: Secure cookie-based session handling

### Security Practices
- **Environment Variables**: Secure API key management
- **CORS Configuration**: Proper cross-origin request handling
- **Token Encryption**: Secure storage of access tokens
- **Input Validation**: Comprehensive request validation

## Development Tools & Quality

### Code Quality
- **TypeScript**: Strict type checking with comprehensive coverage
- **ESLint**: Code linting with Next.js recommended rules
- **Prettier**: Consistent code formatting (implied by clean codebase)
- **Path Aliases**: Clean imports using `@/` prefix

### Development Workflow
- **Hot Reload**: Fast development with Turbopack
- **Type Checking**: Real-time TypeScript validation
- **Error Boundaries**: Graceful error handling in React components
- **Development Logging**: Comprehensive logging for debugging

## Common Commands & Scripts

### Development
```bash
yarn run dev          # Start development server on port 9002 with Turbopack
yarn run genkit:dev   # Start Genkit AI development server
yarn run genkit:watch # Start Genkit with file watching for prompt changes
```

### Build & Deployment
```bash
yarn run build        # Build optimized production bundle
yarn run export       # Export static files for deployment
yarn run start        # Start production server
```

### Code Quality & Testing
```bash
yarn run lint         # Run ESLint for code quality checks
yarn run typecheck    # Run TypeScript compiler without emitting files
```

### Package Management
```bash
yarn install        # Install dependencies (uses Yarn 4.9.2)
npx patch-package   # Apply custom package patches
```

## Environment Configuration

### Required Environment Variables
```bash
# Core Application
NEXT_PUBLIC_APP_URL=         # Public app URL for OAuth callbacks
NEXTAUTH_URL=                # NextAuth.js URL configuration
NEXTAUTH_SECRET=             # NextAuth.js encryption secret

# AI Services
GOOGLE_GENAI_API_KEY=        # Google Gemini AI API key
YOUTUBE_API_KEY=             # YouTube Data API v3 key

# Music Platform APIs
SPOTIFY_CLIENT_ID=           # Spotify app client ID
SPOTIFY_CLIENT_SECRET=       # Spotify app client secret
SPOTIFY_REDIRECT_URI=        # OAuth callback URL

# Google Services
GOOGLE_CLIENT_ID=            # Google OAuth client ID
GOOGLE_CLIENT_SECRET=        # Google OAuth client secret

# Infrastructure
REDIS_URL=                   # Redis connection string (optional, defaults to localhost)

# Legacy/Future APIs
SOUNDCLOUD_CLIENT_ID=        # SoundCloud API (currently paused)
SOUNDCLOUD_CLIENT_SECRET=    # SoundCloud API (currently paused)
SOUNDCLOUD_REDIRECT_URI=     # SoundCloud OAuth callback
```

### Development Setup
1. **Clone Repository**: `git clone <repo-url>`
2. **Install Dependencies**: `yarn install`
3. **Environment Setup**: Copy `.env.example` to `.env.local`
4. **API Configuration**: Set up OAuth apps for Spotify and Google
5. **Redis Setup**: Install and start Redis server (optional for development)
6. **Start Development**: `npm run dev`

## Performance Considerations

### Optimization Strategies
- **Static Generation**: Pre-built pages for optimal loading
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic route-based code splitting
- **Caching**: Multi-level caching strategy for API responses
- **Bundle Analysis**: Regular bundle size monitoring

### Monitoring & Observability
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Core Web Vitals monitoring
- **API Monitoring**: Rate limit and response time tracking