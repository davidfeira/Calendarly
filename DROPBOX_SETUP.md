# Dropbox Sync Setup Guide

Calendarly now supports syncing your calendar data across devices using Dropbox!

## Setup Instructions

### Step 1: Create a Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click **"Create app"**
3. Choose:
   - **API**: Scoped access
   - **Type of access**: Full Dropbox (or App folder if you prefer)
   - **Name**: Choose any name (e.g., "Calendarly Sync")
4. Click **"Create app"**

### Step 2: Configure Your App

1. In your app's settings page, find the **App key** (it looks like: `abc123xyz456`)
2. Scroll down to **OAuth 2** section
3. Add your redirect URIs (must include `/oauth-callback` path):
   - For local development: `http://localhost:8080/oauth-callback`
   - For Vercel: `https://your-app.vercel.app/oauth-callback` (your actual Vercel URL)
   - For desktop: `http://localhost:1420/oauth-callback`
4. Set permissions in the **Permissions** tab:
   - `files.content.write` (to save calendar data)
   - `files.content.read` (to load calendar data)
5. Click **Submit** at the bottom of the Permissions page

### Step 3: Update Your Code

1. Open `src/app.js`
2. Find this line near the top (around line 15):
   ```javascript
   const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY';
   ```
3. Replace `'YOUR_DROPBOX_APP_KEY'` with your actual App key:
   ```javascript
   const DROPBOX_APP_KEY = 'abc123xyz456';
   ```

### Step 4: Build and Deploy

For the web version (Vercel):
```bash
npm run build-web
vercel --prod
```

For desktop:
```bash
npm run tauri build
```

## How to Use

1. Open Calendarly (desktop or web)
2. Click the Settings button (⚙)
3. Click **"Connect Dropbox"**
4. You'll be redirected to Dropbox to authorize the app
5. Once connected, your calendar will automatically sync!

## Features

- **Automatic sync**: Changes are automatically synced to Dropbox
- **Cross-device**: Sync between desktop and web versions
- **Conflict resolution**: Newer data always takes precedence
- **Local backup**: Data is always saved locally first

## File Location

Your calendar data is stored in:
```
/Calendarly/calendar-data.json
```

You can view or backup this file directly from your Dropbox.

## Troubleshooting

### "Not connected" after clicking Connect
- Check that your redirect URI matches your actual URL
- Make sure you added the correct redirect URI in the Dropbox App Console

### Sync not working
- Disconnect and reconnect Dropbox
- Check browser console for errors
- Verify your App key is correct

### Desktop app won't connect
- Make sure you added `http://localhost:1420` as a redirect URI
- Try rebuilding the app after updating the App key

## Security Notes

- Your Dropbox access token is stored securely in localStorage
- Only your calendar data is accessed (files.content.read/write)
- The app never stores your Dropbox password
- You can revoke access anytime from Dropbox settings
