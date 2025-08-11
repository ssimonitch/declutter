# Declutter AI - 整理アプリ

A Next.js application for helping elderly parents in Japan inventory and manage items for decluttering. Uses AI-powered image analysis to provide pricing estimates and disposal recommendations.

## Features

- 📸 **Photo Capture**: Take photos of items to automatically analyze and categorize
- 🤖 **AI Analysis**: Google Gemini AI provides detailed item information including:
  - Japanese and English names (specific and generic)
  - Dual pricing (online marketplaces vs thrift shops)
  - Disposal recommendations based on value and convenience
- 👨‍👩‍👧‍👦 **Family Collaboration**: Share inventory with family members using Dexie Cloud
- 📊 **Dashboard**: View summary statistics and manage all items
- 📱 **Mobile-First**: Optimized for elderly users on tablets and phones
- 🇯🇵 **Japanese Market Focus**: Tailored for Japanese second-hand markets and disposal regulations

## Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4
- **Database**: Dexie (IndexedDB) with Cloud sync support
- **AI**: Google Gemini 2.5 for image analysis
- **Forms**: react-hook-form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key
- (Optional) Dexie Cloud account for family sharing

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/declutter.git
cd declutter
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

- `GEMINI_API_KEY` - Required for AI analysis
- `NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL` - Optional for family sharing
- `EXA_API_KEY` - Optional for enhanced market search

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Family Sharing Setup (Optional)

To enable family collaboration:

1. **Create a Dexie Cloud account** at https://cloud.dexie.org/
2. **Create a database** in the Dexie Cloud dashboard
3. **Copy your database URL** and add it to `.env.local`:
   ```
   NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL=https://your-database.dexie.cloud
   ```
4. **Restart the development server**
5. **Use the Family Sharing UI** in the dashboard to:
   - Create family groups (realms)
   - Invite family members by email
   - Switch between private and shared items

### How Family Sharing Works

- **Private Items**: By default, all items are private to you
- **Family Groups**: Create named groups (e.g., "実家の整理")
- **Invite Members**: Add siblings by their email addresses
- **Shared Access**: All family members can view and edit shared items
- **Real-time Sync**: Changes sync automatically when online

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages
│   ├── api/       # API routes (Gemini integration)
│   ├── capture/   # Photo capture page
│   ├── dashboard/ # Main items list and metrics
│   └── edit/      # Item editing pages
├── components/    # Reusable React components
│   └── family-sharing.tsx # Collaboration UI
├── lib/          # Core utilities
│   ├── db.ts     # Dexie database with realm support
│   ├── gemini.ts # AI integration
│   └── types.ts  # TypeScript interfaces
└── utils/        # Helper functions
```

## Key Features for Japanese Market

- **Marketplace Integration**: Supports Mercari, Yahoo Auctions, 2nd STREET, BOOK OFF, HARD OFF
- **Disposal Categories**: 可燃ごみ, 不燃ごみ, 粗大ごみ, 家電リサイクル法
- **Municipal Support**: Location-specific disposal fees and regulations
- **Conservative Pricing**: Realistic estimates accounting for fees and market conditions
- **Convenience Focus**: Recommendations balance profit with ease of disposal

## Security & Privacy

- All data stored locally in browser (IndexedDB)
- Optional cloud sync for family sharing only
- No data sent to third parties except:
  - Google Gemini API for image analysis
  - Dexie Cloud for family sync (if enabled)
- API keys never exposed to client

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
