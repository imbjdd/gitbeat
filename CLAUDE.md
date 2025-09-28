# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitBeat is a web application that transforms GitHub repositories into AI-generated music. It analyzes code repositories and creates custom beats based on repository structure, contributors, and development patterns using Suno AI for music generation and Dust.tt for repository analysis.

## Project Structure

This is a Next.js 15 frontend application located in the `frontend/` directory. The main application code is a monorepo with the frontend being the primary component.

## Technology Stack

- **Next.js 15.5.4** with App Router and Turbopack
- **React 19** with TypeScript (strict mode)
- **Tailwind CSS v4** for styling
- **shadcn/ui** component library (New York style, zinc base color)
- **Lucide React** for icons
- **Supabase** for database and storage
- **AI Services**: Dust.tt (@dust-tt/client) for repository analysis, Suno AI for music generation
- **ESLint** with Next.js rules for code linting

## Development Commands

All commands should be run from the `frontend/` directory:

```bash
# Development server with Turbopack
npm run dev
# or
bun dev

# Production build with Turbopack
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

The development server runs on http://localhost:3000.

## Architecture Overview

### API Architecture
- **Repository Analysis**: `/api/dust/conversation` - Analyzes repositories using Dust.tt AI
- **Music Generation**: `/api/suno/generate` and `/api/suno/status/[taskId]` - Handles Suno AI music generation
- **Songs Management**: `/api/songs/*` - CRUD operations for generated songs and voting
- **Contributor Analysis**: `/api/analyze-contributors` - AI-powered contributor personality analysis

### Data Flow
1. User submits GitHub repository URL
2. Repository data fetched from GitHub API
3. Dust.tt analyzes repository structure and content
4. Suno AI generates music based on analysis
5. Songs stored in Supabase with voting capabilities
6. Real-time leaderboard with upvoting system

### Database Schema
- **repositories**: GitHub repository metadata
- **songs**: Generated music tracks with audio/lyrics URLs
- **upvotes**: Voting system for song popularity
- **Storage buckets**: `audio-files` and `lyrics-files` for media storage

## Key Configuration Files

- `components.json`: shadcn/ui configuration with New York style and zinc base color
- `eslint.config.mjs`: ESLint setup with Next.js core-web-vitals and TypeScript rules
- `tsconfig.json`: TypeScript configuration with strict mode and path mapping for `@/*` imports
- `next.config.ts`: Next.js configuration (minimal setup)
- `supabase-schema.sql`: Complete database schema with RLS policies

## Component Architecture

### Core Components
- **Header**: Application branding and navigation
- **TabNavigation**: Switches between "Beats" and "Analysis" modes
- **BeatsAnalysis**: Repository URL input and music generation flow
- **Leaderboard**: Interactive song list with voting and audio playback
- **RepositoryAnalysis**: GitHub repository analysis with AI insights

### State Management Patterns
- Complex component state using React hooks (useState, useEffect, useRef)
- Custom hooks for reusable logic:
  - `useLoadingText`: Dynamic loading text rotation
  - `useSunoPolling`: Polls Suno API for music generation status
- Audio player state management with global playback controls

### Styling Conventions
- Tailwind CSS with custom utility function `cn()` in `lib/utils.ts` for conditional classes
- Dark theme (black background, white text) throughout application
- Responsive design with mobile-first approach using Tailwind breakpoints
- Custom animations for voting feedback and ranking changes

## External Service Integration

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DUST_API_KEY=your_dust_api_key
DUST_WORKSPACE_ID=your_dust_workspace_id
SUNO_API_TOKEN=your_suno_api_token
OPENAI_API_KEY=your_openai_api_key
```

### API Integration Patterns
- **Async Processing**: Music generation is asynchronous with polling mechanism
- **Error Handling**: Silent error handling in many places to maintain UX
- **Rate Limiting**: GitHub API usage with fallback mechanisms for contributor stats
- **Real-time Updates**: Optimistic UI updates for voting with background sync

## Development Patterns

### TypeScript Usage
- Strict type definitions in `lib/types/` and `components/types/`
- Interface definitions for external API responses (GitHub, Suno, Dust)
- Type-safe component props and state management

### Performance Considerations
- Audio player optimization with proper cleanup on component unmount
- Debounced loading states and optimistic UI updates
- Efficient re-rendering using React refs for persistent data
- Image and asset optimization through Next.js

### Code Organization
- Feature-based component organization
- Shared utilities in `lib/` directory
- API routes following RESTful patterns
- Separation of concerns between UI logic and business logic