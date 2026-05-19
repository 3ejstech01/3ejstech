# Deploying 3EJS Tech to Netlify via GitHub

## What you need before starting
- Your GitHub repository URL (e.g. `https://github.com/your-username/your-repo`)
- A Netlify account at https://netlify.com
- Git installed on your machine (`git --version` to check)

---

## Step 1 — Push the project to GitHub

Run these commands in your project folder (`E:\3JES_alpha`):

```powershell
# 1. Initialize git
git init

# 2. Set your identity (replace with your details)
git config user.name "Your Name"
git config user.email "your@email.com"

# 3. Add all files (respects .gitignore — no secrets, no node_modules)
git add .

# 4. First commit
git commit -m "Initial commit — 3EJS Tech v1 working build"

# 5. Point to your GitHub repo (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# 6. Push to GitHub
git branch -M main
git push -u origin main
```

> If GitHub asks for credentials, use your GitHub username and a
> Personal Access Token (not your password).
> Create one at: https://github.com/settings/tokens → New token → repo scope

---

## Step 2 — Connect Netlify to GitHub

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"GitHub"** and authorize Netlify
4. Search for and select your repository
5. Build settings will be auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Node version:** `20`
6. Click **"Deploy site"** — but DON'T deploy yet, do Step 3 first

---

## Step 3 — Set Environment Variables in Netlify

Before the first deploy, go to:
**Site settings → Environment variables → Add a variable**

Add these one by one:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_WEBAPP_URL` | Your Google Apps Script URL |
| `NEXT_PUBLIC_APP_URL` | Your Netlify site URL (e.g. `https://3jes-tech.netlify.app`) |
| `NEXT_PUBLIC_APP_NAME` | `3EJS Tech` |
| `NEXT_PUBLIC_SHEET_NAME` | `3JES_MASTERLIST` |
| `DATA_SOURCE` | `sheets` |
| `NETLIFY` | `true` |
| `JWT_SECRET` | Any strong random string (min 32 chars) |

> Your Google Apps Script URL is the one you paste in the login screen.
> It looks like: `https://script.google.com/macros/s/AKfycb.../exec`

---

## Step 4 — Deploy

1. Go back to your site in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Watch the build log — it should take 2-3 minutes
4. When it says **"Published"**, your site is live

---

## Step 5 — Test the live site

1. Open your Netlify URL (e.g. `https://3jes-tech.netlify.app`)
2. You should see the login screen
3. Paste your Google Apps Script URL and click "Connect to Google Sheets"
4. Log in with your credentials
5. Verify data syncs correctly

---

## Updating the site after code changes

Every time you push to GitHub, Netlify auto-deploys:

```powershell
# After making changes
git add .
git commit -m "describe what you changed"
git push
```

Netlify detects the push and rebuilds automatically (takes ~2 min).

---

## Troubleshooting

### Build fails with "Cannot find module"
- Check that all dependencies are in `package.json`
- Run `npm install` locally and push the updated `package-lock.json`

### Site loads but data doesn't sync
- Check `NEXT_PUBLIC_WEBAPP_URL` is set correctly in Netlify env vars
- Make sure your Google Apps Script is deployed as "Anyone" access

### Login fails
- Verify the webapp URL is correct
- Check the Users sheet has the correct username/password

### Environment variables not taking effect
- After adding/changing env vars in Netlify, you must trigger a new deploy

---

## Custom Domain (optional)

1. Netlify dashboard → **Domain settings** → **Add custom domain**
2. Follow the DNS instructions for your domain registrar
3. Netlify provides free SSL automatically

---

## Quick Reference

| What | Where |
|------|-------|
| Netlify dashboard | https://app.netlify.com |
| Build logs | Site → Deploys → click a deploy |
| Environment variables | Site → Site settings → Environment variables |
| Deploy hooks | Site → Site settings → Build & deploy → Build hooks |
| GitHub repo | https://github.com/YOUR-USERNAME/YOUR-REPO |
