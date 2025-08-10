# Declutter App MVP Specification

## Project Overview

Build a web application to help elderly parents in Japan inventory and manage items for decluttering. The app uses Google Gemini AI to analyze photos of items and generate metadata including resale value estimates and disposal recommendations based on the Japanese second-hand market.

**IMPORTANT**: This app is initially being developed as a fast weekend project for internal use only! Security, performance, and testing are very low priority for this MVP and will be addressed later.

## Core Features (MVP Scope)

1. **Photo Capture**: Take/upload photo of item with automatic compression
2. **AI Analysis**: Send to Gemini 2.5 for structured metadata extraction
3. **Review & Edit**: Display AI results in editable form
4. **Item Management**: Edit/update/delete existing items
5. **Dashboard**: View all items with summary metrics and searchable/filterable list
6. **Export**: Download data as CSV

## Technical Stack

```bash
# Create project
npx create-next-app@latest declutter-app --typescript --tailwind --app --src-dir --import-alias "@/*"

# Core dependencies
npm install @google/generative-ai dexie react-hook-form zod papaparse
npm install @tanstack/react-table uuid browser-image-compression
npm install --save-dev @types/uuid @types/papaparse
```

## Data Model

```typescript
interface DeclutterItem {
  id: string; // UUID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  photo: Blob; // Compressed image
  thumbnail: Blob; // Small preview for lists
  name: string;
  nameJapanese?: string;
  description: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  estimatedPriceJPY: {
    low: number;
    high: number;
    confidence: number; // 0-1 scale
  };
  recommendedAction: 'keep' | 'trash' | 'thrift' | 'online' | 'donate';
  actionRationale?: string; // Why this action was recommended
  marketplaces: string[]; // ["Mercari", "Yahoo Auctions", etc.]
  searchQueries: string[]; // Suggested search terms for marketplaces
  specialNotes: string;
  keywords: string[]; // For internal search
  disposalFeeJPY?: number; // For oversized items (粗大ごみ)
  municipalityCode?: string; // For location-specific disposal info
}

// Runtime display helper
function getBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

// Remember to revoke URLs when done
function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # Gemini API endpoint
│   ├── capture/
│   │   └── page.tsx          # Photo capture page
│   ├── dashboard/
│   │   └── page.tsx          # Items list/table + summary
│   ├── edit/[id]/
│   │   └── page.tsx          # Edit existing item
│   ├── layout.tsx
│   └── page.tsx              # Redirect to dashboard
├── components/
│   ├── dashboard-summary.tsx # Aggregate metrics
│   ├── item-form.tsx         # Create/Edit form component
│   ├── items-table.tsx       # Dashboard table
│   └── photo-capture.tsx     # Camera/upload component
├── lib/
│   ├── db.ts                 # Dexie setup
│   ├── gemini.ts            # Gemini client/prompts
│   ├── image-utils.ts       # Compression/thumbnail generation
│   └── types.ts             # TypeScript interfaces
└── utils/
    └── export.ts            # CSV export logic
```

## Image Processing

```typescript
// lib/image-utils.ts
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, quality: 'standard' | 'lite' = 'standard'): Promise<Blob> {
  const options = {
    maxSizeMB: quality === 'lite' ? 0.5 : 1,
    maxWidthOrHeight: quality === 'lite' ? 1280 : 1920,
    useWebWorker: true
  };
  return await imageCompression(file, options);
}

export async function generateThumbnail(file: File): Promise<Blob> {
  const options = {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 200,
    useWebWorker: true
  };
  return await imageCompression(file, options);
}

// Check available storage quota
export async function checkStorageQuota(): Promise<{available: number; used: number; percentage: number}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const available = estimate.quota || 0;
    const used = estimate.usage || 0;
    const percentage = (used / available) * 100;
    return { available, used, percentage };
  }
  return { available: 0, used: 0, percentage: 0 };
}
```

## API Design

### POST /api/analyze

Accepts compressed image, returns structured JSON from Gemini.

```typescript
// Request: FormData with 'image' file
// Response: 
{
  success: boolean;
  data?: Omit<DeclutterItem, 'id' | 'createdAt' | 'updatedAt' | 'photo' | 'photoUrl' | 'thumbnailUrl'>;
  error?: string;
}
```

## Gemini Integration

### Model Selection
- Default: `gemini-2.5-flash-latest` (best price/performance balance)
- Precision mode: `gemini-2.5-flash` (when confidence is low or for valuable items)
- Note: User can toggle "Use precision mode" for better accuracy at higher cost

### Current Pricing (as of 2024)
- **2.5 Flash-Lite**: $0.10 per 1M input tokens, $0.40 per 1M output tokens
- **2.5 Flash**: $0.30 per 1M input tokens, $2.50 per 1M output tokens
- Estimated cost per item: $0.01-0.02 (Flash-Lite), $0.03-0.05 (Flash)

### System Prompt (Japanese Context)

```
あなたは日本の中古市場に詳しいアシスタントです。入力画像から商品の詳細を分析し、以下の情報を提供してください：

1. 商品名（日本語と英語）
2. 商品の説明
3. カテゴリー（家電、家具、衣類、本・メディア、雑貨、その他）
4. 状態（新品同様/良好/可/要修理など）
5. 日本での中古相場（円、税込）と確信度（0-1）
6. 推奨処分方法：
   - keep: 保管（思い出の品、まだ使用中、価値がある）
   - online: メルカリ、ヤフオク等で販売（1500円以上の価値があり、発送可能なもの）
   - thrift: リサイクルショップへ（大型、低価値だが使用可能）
   - donate: 寄付（自治体施設、NPO等。状態良好だが売却困難）
   - trash: 廃棄または粗大ごみ（壊れている、需要なし）
7. 推奨理由（なぜその処分方法を選んだか）
8. 検索キーワード（メルカリやヤフオクで使える具体的な検索語）
9. 粗大ごみの場合、概算処分費用（自治体により300円〜3000円程度）

日本の主要な中古品取扱店を考慮してください：
- メルカリ（一般的な品物）
- ヤフオク（コレクターズアイテム）
- 2nd STREET（衣類、家具、家電）
- BOOK OFF（本、メディア、小型家電）
- HARD OFF（電化製品、楽器）

家電リサイクル法対象品（エアコン、テレビ、冷蔵庫、洗濯機）や危険物については特記事項に記載してください。
```

### Response Schema

```typescript
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    nameJapanese: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    condition: { 
      type: SchemaType.STRING,
      enum: ['new', 'like_new', 'good', 'fair', 'poor']
    },
    estimatedPriceJPY: {
      type: SchemaType.OBJECT,
      properties: {
        low: { type: SchemaType.NUMBER },
        high: { type: SchemaType.NUMBER },
        confidence: { type: SchemaType.NUMBER }
      }
    },
    recommendedAction: {
      type: SchemaType.STRING,
      enum: ['keep', 'trash', 'thrift', 'online', 'donate']
    },
    actionRationale: { type: SchemaType.STRING },
    marketplaces: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    },
    searchQueries: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    },
    specialNotes: { type: SchemaType.STRING },
    keywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    },
    disposalFeeJPY: { 
      type: SchemaType.NUMBER,
      nullable: true 
    }
  }
};
```

## UI/UX Flow

### 1. Dashboard (`/dashboard`) - Default Landing Page
**Summary Section:**
- Total items by action (Keep: X, Sell Online: Y, Thrift: Z, Trash: W)
- Estimated total resale value range: ¥XXX,XXX - ¥XXX,XXX
- Estimated disposal costs: ¥XX,XXX
- Items by category (pie chart or simple counts)

**Items Table:**
- Columns: Thumbnail, Name, Category, Price Range, Action, Updated Date
- Filters: By action (keep/trash/thrift/online), category, date range
- Search by name/description
- Actions: Edit, Delete (with confirmation)
- Export selected/all as CSV

### 2. Capture Page (`/capture`)
- Municipality selector (one-time setup, stored in localStorage)
- Large camera/upload button (mobile-friendly)
- Image quality toggle (Standard/Lite mode)
- Image preview with compression indicator
- Storage quota warning if >80% full
- "Analyzing..." state during AI processing
- Redirects to edit form after analysis

### 3. Edit Form (`/edit/[id]` or modal)
- Shows compressed image
- All fields editable with validation
- Save/Cancel/Delete buttons
- Success feedback and redirect to dashboard

### 4. Navigation
- Simple header: Logo | Dashboard | Add Item
- Mobile hamburger menu

## Database Schema (Dexie)

```typescript
// lib/db.ts
import Dexie, { Table } from 'dexie';

export interface DeclutterItemDB extends DeclutterItem {
  // All fields from DeclutterItem
}

export class DeclutterDatabase extends Dexie {
  items!: Table<DeclutterItemDB>;

  constructor() {
    super('DeclutterDB');
    this.version(1).stores({
      items: 'id, createdAt, updatedAt, recommendedAction, category, name'
    });
  }
}

export const db = new DeclutterDatabase();
```

## Dashboard Summary Calculations

```typescript
interface DashboardSummary {
  totalItems: number;
  itemsByAction: {
    keep: number;
    online: number;
    thrift: number;
    donate: number;
    trash: number;
  };
  itemsByCategory: Record<string, number>;
  estimatedResaleValue: {
    low: number;
    high: number;
    averageConfidence: number;
  };
  estimatedDisposalCost: number;
}

// Calculate in dashboard component
function calculateSummary(items: DeclutterItem[]): DashboardSummary {
  // Aggregate calculations
  // Only count online/thrift items for resale value
  // Only count trash items with disposalFeeJPY for disposal costs
}
```

## CSV Export Safety

```typescript
// utils/export.ts
import Papa from 'papaparse';

// Prevent CSV injection attacks
function sanitizeForCsv(value: any): any {
  if (typeof value !== 'string') return value;
  
  // If cell starts with =, +, -, or @, prepend with '
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function exportToCsv(items: DeclutterItem[]) {
  const sanitizedItems = items.map(item => ({
    ...item,
    name: sanitizeForCsv(item.name),
    description: sanitizeForCsv(item.description),
    specialNotes: sanitizeForCsv(item.specialNotes),
    // Sanitize all string fields
  }));
  
  const csv = Papa.unparse(sanitizedItems);
  // Trigger download
}
```

## Implementation Steps

1. **Setup Next.js project with TypeScript and Tailwind**
2. **Create Dexie database schema**
3. **Build image compression utilities**
4. **Create Gemini API route** with 2.5 model
5. **Build photo capture** with compression feedback
6. **Implement CRUD operations** for items
7. **Create dashboard with summary metrics**
8. **Build item management table** with edit/delete
9. **Add CSV export** functionality
10. **Polish UI** with loading states and confirmations
11. **Test complete flow** including edge cases
12. **Deploy to Vercel**

## Key Considerations

### Performance
- Compress images client-side before storage (max 1MB)
- Generate thumbnails for list views (max 200x200)
- Lazy load images in dashboard
- Pagination if >50 items

### Japanese Market Specifics
- Display prices in JPY with proper formatting (¥1,000)
- Include disposal fee estimates for oversized items
- Consider "keep" items in value calculations (don't count toward profit)
- Show both Japanese and English names when available
- Link to municipality-specific disposal pages based on user's selected location

### Municipality Integration
```typescript
// lib/municipality-data.ts
export const municipalities = {
  'tokyo-shibuya': {
    name: '渋谷区',
    sodaiGomiUrl: 'https://www.city.shibuya.tokyo.jp/kurashi/gomi/sodai.html',
    kademRicycleUrl: 'https://www.city.shibuya.tokyo.jp/kurashi/gomi/kaden.html'
  },
  // Add major municipalities
};

// In item display, show relevant links based on category and municipalityCode
```

### Error Handling
- Image compression failures
- Network errors during AI analysis
- Invalid image formats
- API rate limits
- Database quota exceeded

## Environment Variables

```env
GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

```bash
# Deploy to Vercel
vercel --prod
```

## Immediate Follow-up: Multi-User Cloud Sync

### Architecture for Shared Access
After MVP launch, implement cloud sync for family collaboration:

1. **Authentication**: Add NextAuth.js with Google/Email providers
2. **Cloud Database**: Migrate from Dexie to Supabase/Firebase
3. **Real-time Sync**: Enable live updates across devices
4. **User Management**: Family invite system
5. **Conflict Resolution**: Last-write-wins with version history
6. **Image Storage**: Move to cloud storage (Cloudflare R2/S3)

### Migration Path
```typescript
// Progressive enhancement approach
interface CloudSyncConfig {
  enabled: boolean;
  userId?: string;
  familyId?: string;
  lastSyncAt?: string;
}

// Dual-write to local and cloud during transition
// Maintain offline-first capability
```

## Cost Estimates
- Gemini 2.0 Flash: ~$0.01 per 1M input tokens (with images)
- Average image analysis: ~$0.002-0.004 per item
- For 1000 items: ~$2-4 total API cost
- Cloud storage (follow-up): ~$0.015/GB/month for images