# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Next.js frontend application located in the `frontend/` directory. The project uses:

- **Next.js 15.5.4** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS v4** for styling
- **shadcn/ui** component library (New York style)
- **Lucide React** for icons
- **ESLint** for code linting

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

## Architecture

- **App Router**: Uses Next.js App Router with layout.tsx and page.tsx structure
- **Component Library**: Configured for shadcn/ui components with aliases:
  - `@/components` → components directory
  - `@/lib/utils` → utility functions
  - `@/components/ui` → UI components
- **Styling**: Tailwind CSS with custom utility function `cn()` in `lib/utils.ts` for conditional classes
- **Fonts**: Uses Geist Sans and Geist Mono fonts from Google Fonts
- **TypeScript**: Strict mode enabled with path mapping for `@/*` imports

## Key Configuration Files

- `components.json`: shadcn/ui configuration
- `eslint.config.mjs`: ESLint setup with Next.js rules
- `tsconfig.json`: TypeScript configuration with strict mode
- `next.config.ts`: Next.js configuration (minimal setup)