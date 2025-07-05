# Frontend Deployment Guide

## Option 1: Vercel (Recommended)

1. **Build Configuration**

```bash
npm run build
```

2. **Environment Variables**
   Create `.env.production`:

```
VITE_API_BASE_URL=https://your-cdn-domain.com
VITE_CDN_BASE_URL=https://your-cdn-domain.com/cdn
```

3. **Deploy to Vercel**

```bash
npx vercel
# Follow prompts, set environment variables in Vercel dashboard
```

## Option 2: Netlify

1. **Build Settings**

- Build command: `npm run build`
- Publish directory: `dist`

2. **Environment Variables** (in Netlify dashboard)

```
VITE_API_BASE_URL=https://your-cdn-domain.com
VITE_CDN_BASE_URL=https://your-cdn-domain.com/cdn
```

## Option 3: Self-hosted with Docker

```dockerfile
# Dockerfile for frontend
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Option 4: GitHub Pages

1. **Setup GitHub Actions**
   Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_CDN_BASE_URL: ${{ secrets.VITE_CDN_BASE_URL }}

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

2. **Configure GitHub Pages**

- Go to repository Settings > Pages
- Set source to "GitHub Actions"
- Add environment variables in Settings > Secrets
