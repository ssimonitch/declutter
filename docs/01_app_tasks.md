# Declutter App MVP Task List

## Project Setup

- [x] Create Next.js project with TypeScript, Tailwind, App Router
- [x] Install all required dependencies
- [x] Set up folder structure according to spec
- [x] Create .env.local file with GEMINI_API_KEY placeholder
- [x] Configure Tailwind CSS
- [x] Set up TypeScript types file (lib/types.ts)

## Database & Storage Layer

- [x] Create Dexie database schema (lib/db.ts)
- [x] Define DeclutterItem interface with all fields
- [x] Set up database indexes for efficient queries
- [x] Create database helper functions (add, update, delete, get, list)
- [x] Test database operations work correctly

## Image Processing Utilities

- [x] Create image compression functions (standard and lite modes)
- [x] Create thumbnail generation function
- [x] Implement storage quota checking function
- [x] Create blob URL management helpers
- [x] Test image processing with various file sizes

## Gemini API Integration

- [x] Set up Gemini client configuration (lib/gemini.ts)
- [x] Write Japanese market system prompt
- [x] Define response schema structure
- [x] Create API route (/api/analyze/route.ts)
- [x] Implement image-to-base64 conversion
- [x] Add error handling for API failures
- [x] Test API with sample images

## Core Components

### Photo Capture Component

- [x] Create file input with camera support
- [x] Add image preview functionality
- [x] Show compression progress indicator
- [x] Display storage quota warnings
- [x] Add quality mode toggle (Standard/Lite)
- [x] Handle upload errors gracefully

### Item Form Component

- [x] Set up react-hook-form with Zod schema
- [x] Create all form fields matching data model
- [x] Add field validation rules
- [x] Implement save functionality
- [x] Add delete confirmation dialog
- [x] Display confidence scores appropriately
- [x] Show marketplace search queries

### Items Table Component

- [x] Set up TanStack Table
- [x] Configure columns (thumbnail, name, category, price, action, date)
- [x] Add sorting functionality
- [x] Add filtering by action type
- [x] Add filtering by category
- [x] Add text search functionality
- [x] Implement row click to edit
- [x] Add bulk selection for export

### Dashboard Summary Component

- [x] Calculate total items by action
- [x] Calculate estimated resale value ranges
- [x] Calculate average confidence scores
- [x] Calculate disposal costs
- [x] Create category breakdown
- [x] Format all monetary values in JPY

## Pages

### Layout (app/layout.tsx)

- [ ] Create responsive navigation header
- [ ] Add mobile hamburger menu
- [ ] Include links to Dashboard and Add Item
- [ ] Set up proper metadata

### Dashboard Page (app/dashboard/page.tsx)

- [ ] Integrate dashboard summary component
- [ ] Integrate items table component
- [ ] Add export to CSV button
- [ ] Handle empty state
- [ ] Add loading states

### Home Page (app/page.tsx)

- [ ] Create redirect to dashboard

### Capture Page (app/capture/page.tsx)

- [ ] Add municipality selector (first-time setup)
- [ ] Integrate photo capture component
- [ ] Handle API response
- [ ] Navigate to edit form after analysis
- [ ] Show error states

### Edit Page (app/edit/[id]/page.tsx)

- [ ] Load item data from database
- [ ] Integrate item form component
- [ ] Handle save and redirect
- [ ] Handle delete and redirect
- [ ] Add back navigation

## Features

### CSV Export

- [ ] Implement CSV generation with Papaparse
- [ ] Add CSV injection protection
- [ ] Include all relevant fields
- [ ] Format dates and prices appropriately
- [ ] Create download trigger
- [ ] Support filtered/selected export

### Municipality Integration

- [ ] Create municipalities data structure
- [ ] Store selected municipality in localStorage
- [ ] Display relevant disposal links
- [ ] Show municipality-specific notes

### Error Handling

- [ ] Handle network errors gracefully
- [ ] Handle invalid image formats
- [ ] Handle API rate limits
- [ ] Handle storage quota exceeded
- [ ] Display user-friendly error messages

### Performance Optimizations

- [ ] Implement lazy loading for images
- [ ] Add pagination for large datasets (>50 items)
- [ ] Optimize blob URL lifecycle
- [ ] Minimize unnecessary re-renders

## UI/UX Polish

- [ ] Ensure mobile-first responsive design
- [ ] Add loading skeletons
- [ ] Add success toast notifications
- [ ] Add confirmation dialogs for destructive actions
- [ ] Format all prices with ¥ symbol and commas
- [ ] Display both English and Japanese names where available

## Testing & Validation

- [ ] Test photo capture on mobile devices
- [ ] Test with various image sizes and formats
- [ ] Verify Japanese prompt produces accurate results
- [ ] Test all CRUD operations
- [ ] Verify CSV export works correctly
- [ ] Test storage quota warnings
- [ ] Check accessibility basics

## Deployment

- [ ] Set up Vercel project
- [ ] Configure environment variables
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Share URL with family members

## Documentation

- [ ] Add README with setup instructions
- [ ] Document environment variables
- [ ] Note API cost expectations
- [ ] Include basic troubleshooting guide

## Post-MVP Planning

- [ ] Document cloud sync architecture
- [ ] List required changes for multi-user support
- [ ] Plan authentication approach
- [ ] Estimate cloud storage costs
