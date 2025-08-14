# Testing Without Dexie Cloud

This document explains how to run the Declutter app without Dexie Cloud for testing purposes.

## Why Test Without Dexie Cloud?

Testing without Dexie Cloud is useful for:

- Local development when you don't need sync features
- Testing core functionality without authentication
- Debugging issues that might be related to cloud sync
- Running the app in environments where Dexie Cloud is not available

## How to Disable Dexie Cloud

### Method 1: Environment Variable (Recommended)

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_DISABLE_DEXIE_CLOUD=true
```

When this is set to `true`, the app will:

- Skip Dexie Cloud configuration
- Use only local IndexedDB storage
- Disable authentication requirements
- Hide family sharing features (realms)
- All data remains local to the browser

### Method 2: Comment Out Database URL

Alternatively, you can comment out or remove the Dexie Cloud database URL:

```bash
# NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL=your-database-url
```

## What Works Without Dexie Cloud

✅ **Full Functionality:**

- Creating and editing items
- Photo capture and AI analysis
- Dashboard and statistics
- CSV export
- Search and filtering
- Multiple item deletion

❌ **Disabled Features:**

- Family sharing (realms)
- Cloud sync across devices
- User authentication
- Invitations

## Important Notes

1. **Data is Local Only**: Without Dexie Cloud, all data is stored in the browser's IndexedDB. Clearing browser data will delete all items.

2. **No Migration Path**: Items created without Dexie Cloud cannot be automatically migrated to a cloud-enabled instance later.

3. **Realm Functions**: The app will still accept realm parameters in functions, but they will be ignored since all data is local.

4. **Testing vs Production**: This mode is intended for testing only. For production use with family sharing, Dexie Cloud should be enabled.

## Running Tests

To run the app in test mode:

```bash
# Set the environment variable
echo "NEXT_PUBLIC_DISABLE_DEXIE_CLOUD=true" >> .env.local

# Start the development server
npm run dev

# Or build and run production
npm run build
npm start
```

## Switching Back to Cloud Mode

To re-enable Dexie Cloud:

1. Remove or set to `false`:

   ```bash
   NEXT_PUBLIC_DISABLE_DEXIE_CLOUD=false
   ```

2. Ensure the database URL is set:

   ```bash
   NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL=your-database-url
   ```

3. Restart the development server

## Console Messages

When Dexie Cloud is disabled, you'll see this message in the browser console:

```
Dexie Cloud is disabled via NEXT_PUBLIC_DISABLE_DEXIE_CLOUD environment variable
```

When enabled and configured successfully:

```
Dexie Cloud configured successfully
```
