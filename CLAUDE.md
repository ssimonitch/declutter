# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Declutter AI**, a Next.js 15 web application designed to help elderly parents in Japan inventory and manage items for decluttering. The app uses Google Gemini AI to analyze photos of items and provide structured metadata including:
- Japanese second-hand market value estimates
- Disposal recommendations based on Japanese municipal regulations
- Marketplace recommendations (Mercari, Yahoo Auctions, etc.)

## Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4
- **Database**: Dexie (IndexedDB wrapper) for local browser storage
- **AI Integration**: Google Gemini 2.5 Flash for image analysis
- **Key Libraries**:
  - `react-hook-form` + `zod` for form validation
  - `@tanstack/react-table` for data tables
  - `browser-image-compression` for client-side image optimization
  - `papaparse` for CSV export
  - `uuid` for unique identifiers

## Development Commands

```bash
# Install dependencies
npm install

# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture & Data Flow

### Core Data Model
The app centers around the `DeclutterItem` interface which stores:
- Item metadata (name in English/Japanese, description, category)
- Photos as compressed Blobs with thumbnails
- Price estimates and confidence scores
- Recommended actions (keep/sell online/thrift shop/donate/trash)
- Japanese marketplace recommendations
- Municipal disposal fees for oversized items (粗大ごみ)

### Key User Flows

1. **Photo Capture → AI Analysis**
   - User takes/uploads photo at `/capture`
   - Image compressed client-side to <1MB
   - Sent to `/api/analyze` endpoint
   - Gemini API returns structured metadata
   - Data saved to IndexedDB

2. **Item Management**
   - Dashboard at `/dashboard` shows all items with metrics
   - Edit items at `/edit/[id]`
   - Export data as CSV with sanitization

3. **Storage Strategy**
   - All data stored locally in browser (IndexedDB via Dexie)
   - Images stored as Blobs with URL.createObjectURL() for display
   - Automatic thumbnail generation for list views

## Japanese Market Integration

The app is specifically tailored for the Japanese second-hand market:

- **Marketplaces**: Mercari, Yahoo Auctions, 2nd STREET, BOOK OFF, HARD OFF
- **Disposal Categories**: 
  - Regular trash (可燃ごみ/不燃ごみ)
  - Oversized items (粗大ごみ) with fee estimates
  - Home appliance recycling (家電リサイクル法)
- **Pricing**: All values in JPY with proper formatting (¥1,000)
- **Municipality Support**: Location-specific disposal guidance

## Gemini API Integration

- **Model**: `gemini-2.0-flash-latest` (balance of cost/performance)
- **Structured Output**: Uses schema validation for consistent responses
- **System Prompt**: Japanese-context aware with marketplace expertise
- **Cost**: ~$0.002-0.004 per item analysis

## Important Implementation Notes

1. **Client-Side Image Processing**: All image compression happens in the browser before storage
2. **CSV Export Safety**: Sanitization prevents CSV injection attacks
3. **Storage Quota**: Monitor IndexedDB quota (typically 50% of free disk space)
4. **No Backend Database**: Currently local-only, cloud sync planned for future
5. **Mobile-First UI**: Optimized for elderly users on tablets/phones

## File Structure Conventions

```
src/
├── app/           # Next.js App Router pages
│   ├── api/       # API routes (Gemini integration)
│   ├── capture/   # Photo capture page
│   ├── dashboard/ # Main items list and metrics
│   └── edit/      # Item editing pages
├── components/    # Reusable React components
├── lib/          # Core utilities
│   ├── db.ts     # Dexie database setup
│   ├── gemini.ts # AI integration
│   └── types.ts  # TypeScript interfaces
└── utils/        # Helper functions
```

## Environment Variables

Required in `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing & Validation

Before committing changes:
1. Run `npm run lint` to check code quality
2. Run `npm run build` to verify TypeScript compilation
3. Test image capture and AI analysis flow
4. Verify CSV export includes proper sanitization
5. Check responsive design on mobile devices

## Security Considerations

- Never commit API keys or secrets
- Sanitize all CSV exports to prevent injection
- Validate all user inputs with Zod schemas
- Use blob URLs carefully (revoke when done)
- Monitor storage quota to prevent data loss
- Always keep scope as minimal as possible. This is a personal project MVP so security, performance, and testing are not high priority right now.