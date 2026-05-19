# 3JES Install - Deployment Guide

A utility management web application for 3JES Electric. Features subscriber management, installation tracking, E-Load management, technician dispatch, and reporting.

**Architecture**: All data is stored in Google Sheets. The app reads/writes directly to your spreadsheet via a Google Apps Script web app. No local database required — perfect for serverless hosting.

## Prerequisites

- Node.js 18+ installed
- A Google Apps Script web app deployed (see `SHEETS_CODE.js`)
- A Vercel or Netlify account

## Environment Variables

Set these in your hosting platform's environment settings:

| Variable | Description | Example |
|---|---|---|
| `DATA_SOURCE` | Always `sheets` | `sheets` |
| `NETLIFY` | Set to `true` on Netlify | `true` |
| `NEXT_PUBLIC_WEBAPP_URL` | Your Google Apps Script URL | `https://script.google.com/macros/s/.../exec` |
| `NEXT_PUBLIC_SHEET_NAME` | Google Sheet tab name | `3JES_MASTERLIST` |
| `NEXT_PUBLIC_APP_NAME` | App display name | `3JES Install` |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL | `https://your-app.vercel.app` |
| `JWT_SECRET` | Secret for auth tokens | Any strong random string |

---

## Deploy to Vercel

### Option A: One-Click Deploy (Recommended)

1. Push this project to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add the environment variables listed above in the Vercel dashboard
5. Click **Deploy**

### Option B: CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Vercel Environment Setup

Go to your project settings → **Environment Variables** and add:

```
DATA_SOURCE=sheets
NEXT_PUBLIC_WEBAPP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
NEXT_PUBLIC_SHEET_NAME=3JES_MASTERLIST
NEXT_PUBLIC_APP_NAME=3JES Install
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
JWT_SECRET=your-random-secret-here
```

Redeploy after adding variables: `vercel --prod`

---

## Deploy to Netlify

### Option A: One-Click Deploy

1. Push this project to a GitHub repository
2. Go to [app.netlify.com/start](https://app.netlify.com/start)
3. Connect your repository
4. Build settings are pre-configured in `netlify.toml`
5. Add environment variables in **Site settings → Environment variables**
6. Click **Deploy site**

### Option B: CLI Deploy

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### Netlify Environment Setup

Go to **Site settings → Environment variables** and add:

```
DATA_SOURCE=sheets
NETLIFY=true
NEXT_PUBLIC_WEBAPP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
NEXT_PUBLIC_SHEET_NAME=3JES_MASTERLIST
NEXT_PUBLIC_APP_NAME=3JES Install
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
JWT_SECRET=your-random-secret-here
```

Trigger a new deploy after adding variables.

---

## Google Sheets Setup

1. Open Google Sheets and create a spreadsheet named `3JES_MASTERLIST`
2. Create the following tabs: `INSTALLATIONS`, `USERS`, `ELOAD`, `MODEMS`
3. Deploy `SHEETS_CODE.js` as a Google Apps Script web app:
   - Open Extensions → Apps Script
   - Paste the contents of `SHEETS_CODE.js`
   - Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the web app URL and set it as `NEXT_PUBLIC_WEBAPP_URL`

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your variables
cp .env.production .env.local
# Edit .env.local with your actual values

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Google Sheets (via Apps Script)
- **State**: Zustand
- **Charts**: Recharts
- **Deployment**: Vercel / Netlify
