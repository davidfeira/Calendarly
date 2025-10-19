# Calendarly

A lightweight, beautiful desktop calendar app built with Tauri and vanilla JavaScript.

## Download

### Windows

**[📥 Download Latest Release](https://github.com/davidfeira/Calendarly/releases)**

Download either the `.exe` (recommended) or `.msi` installer and run it.

After installation, go to Settings (⚙) to enable autostart.

### Linux

**Build from source:**

```bash
# Install dependencies (Debian/Ubuntu)
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Clone the repo
git clone https://github.com/davidfeira/Calendarly.git
cd Calendarly

# Install Node dependencies
npm install

# Build the app
npm run build

# Install the .deb package (Debian/Ubuntu)
sudo dpkg -i src-tauri/target/release/bundle/deb/calendarly_0.1.0_amd64.deb

# Or use the AppImage (works on most distros)
chmod +x src-tauri/target/release/bundle/appimage/calendarly_0.1.0_amd64.AppImage
./src-tauri/target/release/bundle/appimage/calendarly_0.1.0_amd64.AppImage
```

After installation, launch the app and go to Settings (⚙) to enable autostart.

## Features

- 📅 Monthly calendar view with dynamic sizing
- 📝 Color-coded note bubbles for each day
- 🎨 10 customizable bubble colors
- ⭐ Mark important days (right-click)
- 🚀 Autostart on system startup (Windows & Linux)
- 🌓 Dark/Light mode
- 🪶 Lightweight (~2MB) - built with Tauri
- 💾 Data persists locally

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **Tauri** - Lightweight desktop framework
- **Vanilla JavaScript** - No heavy frameworks
- **CSS Variables** - Easy theming
- **localStorage** - Simple data persistence

## Screenshots

Clean dark theme with bubble notes and month previews.

## License

MIT
