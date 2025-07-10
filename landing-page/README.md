# Walcache Landing Page

A standalone marketing landing page for Walcache - Lightning-fast CDN for Walrus decentralized storage.

## 🚀 Features

- **Animated Landing Page**: GSAP-powered scroll animations
- **Dark Theme**: Consistent dark branding
- **Responsive Design**: Mobile-first approach
- **External Links**: Launch App button links to main product
- **Optimized**: Minimal dependencies for fast loading

## 🛠️ Development

### Prerequisites

- Node.js 18+ or Bun
- Modern web browser

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development Server

```bash
# Start dev server on http://localhost:3400
npm run dev
# or
bun dev
```

### Build for Production

```bash
# Build for production
npm run build
# or
bun build

# Preview production build
npm run preview
# or
bun preview
```

## 🔧 Configuration

Update the external URLs in `src/components/LandingPage.tsx`:

```typescript
const CONFIG = {
  MAIN_APP_URL: 'https://app.walcache.com', // Your main product URL
  DEMO_URL: 'https://demo.walcache.com', // Your demo URL
}
```

## 📁 Project Structure

```
landing-page/
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx    # Main landing page component
│   │   └── Button.tsx         # Button component
│   ├── assets/
│   │   └── walcache-logo.jpeg # Logo asset
│   ├── App.tsx                # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html               # HTML template
└── package.json            # Dependencies
```

## 🌐 Deployment

This landing page can be deployed to:

- **Vercel**: Connect your GitHub repo for automatic deployments
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions to build and deploy
- **Any static hosting**: Upload the `dist` folder contents

### Build Command

```bash
npm run build
```

### Output Directory

```
dist/
```

## 🎨 Customization

- **Colors**: Update gradient colors in `LandingPage.tsx`
- **Content**: Modify text, stats, and features in the component
- **Logo**: Replace `src/assets/walcache-logo.jpeg`
- **Animations**: Adjust GSAP animations timing and effects

## 📱 Links Configuration

All external links open in new tabs with security attributes:

- `Launch App` → Main product application
- `Get Started` → Main product application
- `View Demo` → Demo application
- `Start Building Now` → Main product application
