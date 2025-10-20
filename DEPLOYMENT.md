# Deploying Calendarly to Vercel

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Confirm project settings
   - Your app will be live in seconds!

3. **Production Deploy**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Website

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment"
   git push
   ```

2. **Go to [vercel.com](https://vercel.com)**
   - Sign in with GitHub
   - Click "Add New Project"
   - Select your `Calendarly` repository
   - Vercel will auto-detect the settings from `vercel.json`
   - Click "Deploy"

## Your App URLs

After deployment, you'll get:
- **Production**: `https://calendarly.vercel.app` (or your custom domain)
- **Preview**: Unique URL for each git branch/commit

## Using on Phone

Once deployed:

1. **Open the URL** on your phone browser
2. **Sign in** with the same username/password you created on desktop
3. **Add to Home Screen** (optional):
   - **iOS**: Tap Share → "Add to Home Screen"
   - **Android**: Tap Menu → "Add to Home Screen"

## How Sync Works

- Create account on **any device** (desktop/phone/tablet)
- Use the **same username + password** on other devices
- Data syncs **automatically** via Gun.js P2P network
- Works **offline** - syncs when back online

## Environment Info

- **Build Command**: `npm run build:web`
- **Output Directory**: `dist`
- **Framework**: Vanilla JS (no framework needed)
- **Node Version**: Any recent version

## Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `calendarly.yourdomain.com`)
4. Update DNS records as instructed

## Troubleshooting

**Build fails?**
- Check that `build-web.js` exists
- Ensure `src/` folder has all files

**Sync not working?**
- Check browser console for errors
- Gun.js relay servers might be slow (first connection can take ~10 seconds)
- Try creating a new account to test

**Can't access on phone?**
- Make sure you're using HTTPS (Vercel provides this automatically)
- Some features require secure context (HTTPS)

## Development vs Production

- **Desktop App**: Run `npm run dev` (uses Tauri)
- **Web App**: Deploy to Vercel (no Tauri, browser only)
- **Both work** with the same Gun.js sync!

Enjoy your synced calendar! 🎉
