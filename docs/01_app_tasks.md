# Declutter App MVP Task List

## Project Setup
- [x] Create Next.js project with TypeScript, Tailwind, App Router
- [x] Install all required dependencies
- [ ] Set up folder structure according to spec
- [x] Create .env.local file with GEMINI_API_KEY placeholder
- [ ] Configure Tailwind CSS
- [ ] Set up TypeScript types file (lib/types.ts)

## Database & Storage Layer
- [ ] Create Dexie database schema (lib/db.ts)
- [ ] Define DeclutterItem interface with all fields
- [ ] Set up database indexes for efficient queries
- [ ] Create database helper functions (add, update, delete, get, list)
- [ ] Test database operations work correctly

## Image Processing Utilities
- [ ] Create image compression functions (standard and lite modes)
- [ ] Create thumbnail generation function
- [ ] Implement storage quota checking function
- [ ] Create blob URL management helpers
- [ ] Test image processing with various file sizes

## Gemini API Integration
- [ ] Set up Gemini client configuration (lib/gemini.ts)
- [ ] Write Japanese market system prompt
- [ ] Define response schema structure
- [ ] Create API route (/api/analyze/route.ts)
- [ ] Implement image-to-base64 conversion
- [ ] Add error handling for API failures
- [ ] Test API with sample images

## Core Components

### Photo Capture Component
- [ ] Create file input with camera support
- [ ] Add image preview functionality
- [ ] Show compression progress indicator
- [ ] Display storage quota warnings
- [ ] Add quality mode toggle (Standard/Lite)
- [ ] Handle upload errors gracefully

### Item Form Component
- [ ] Set up react-hook-form with Zod schema
- [ ] Create all form fields matching data model
- [ ] Add field validation rules
- [ ] Implement save functionality
- [ ] Add delete confirmation dialog
- [ ] Display confidence scores appropriately
- [ ] Show marketplace search queries

### Items Table Component
- [ ] Set up TanStack Table
- [ ] Configure columns (thumbnail, name, category, price, action, date)
- [ ] Add sorting functionality
- [ ] Add filtering by action type
- [ ] Add filtering by category
- [ ] Add text search functionality
- [ ] Implement row click to edit
- [ ] Add bulk selection for export

### Dashboard Summary Component
- [ ] Calculate total items by action
- [ ] Calculate estimated resale value ranges
- [ ] Calculate average confidence scores
- [ ] Calculate disposal costs
- [ ] Create category breakdown
- [ ] Format all monetary values in JPY

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