# Deployment Troubleshooting Guide

## 🔴 Vercel & Render Deployment Failures - Solutions

### Problem 1: Render Backend Failing (Memory/Size Limits)
**Cause:** `requirements_enhanced.txt` with `torch` and `transformers` exceeds free tier limits
**Solution:** Use lightweight `requirements.txt` instead

✅ **Fixed in render.yaml:**
```yaml
buildCommand: "pip install -r requirements.txt"  # Lightweight, no ML
startCommand: "gunicorn --chdir flask_backend app:app --bind 0.0.0.0:$PORT"
```

### Problem 2: Vercel Frontend Build Failing
**Cause:** Missing environment variables or incorrect build output directory
**Solution:** Configure proper build settings in vercel.json

✅ **Fixed in vercel.json:**
```json
{
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "rewrites": [{"source": "/api/:path*", "destination": "..."}]
}
```

---

## 🔧 Deployment Setup Steps

### Step 1: Configure Vercel (Frontend)

1. Go to https://vercel.com/dashboard
2. Select your "job" project
3. Go to **Settings → Environment Variables**
4. Add:
   ```
   VITE_API_URL = https://jobguard-api-qgxe.onrender.com
   VITE_SUPABASE_URL = your_supabase_url
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
   ```
5. Go to **Settings → Build & Output** 
6. Verify:
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Click **"Redeploy"** button

### Step 2: Configure Render (Backend)

1. Go to https://dashboard.render.com
2. Select your "jobguard-api" service
3. Go to **Settings → Environment**
4. Add:
   ```
   FLASK_ENV = production
   SUPABASE_URL = your_supabase_url
   SUPABASE_KEY = your_supabase_key
   ```
5. Go to **Settings → Build & Deploy**
6. Verify:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --chdir flask_backend app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60`
   - Python Version: 3.10.0
7. Click **"Redeploy"** button

---

## 📋 Deployment Checklist

### Prerequisites
- [ ] GitHub repository synced (all changes pushed)
- [ ] `.env.example` file created
- [ ] `render.yaml` using `requirements.txt` (not enhanced)
- [ ] `vercel.json` with correct build settings
- [ ] Supabase credentials obtained

### Vercel Setup
- [ ] Project connected to GitHub
- [ ] Environment variables configured
- [ ] Build settings correct (npm run build → dist)
- [ ] Domain configured (if custom)

### Render Setup
- [ ] Service created (jobguard-api)
- [ ] Connected to GitHub
- [ ] Environment variables from `.env.example`
- [ ] Redeploy triggered

### Testing
- [ ] Frontend loads on Vercel URL
- [ ] API requests proxy to Render backend
- [ ] Health check endpoint responds: `GET /api/health`
- [ ] Database connections work

---

## ⚡ Quick Deployment

### Option 1: Automatic (Recommended)
1. Push changes to GitHub main branch
2. Vercel auto-deploys frontend
3. Render auto-deploys backend
4. Both should be live in 2-5 minutes

### Option 2: Manual Redeploy
**Vercel:**
- Dashboard → Deployments → Select latest → "Redeploy"

**Render:**
- Dashboard → jobguard-api → Manual Deploy → "Deploy latest commit"

---

## 🐛 Common Deployment Errors & Fixes

### Error: "Build failed - npm: not found"
**Fix:** Ensure Node.js version 18+ is selected in Vercel settings

### Error: "pip: command not found"
**Fix:** Ensure Python 3.10 is set in Render environment variables

### Error: "Cannot find module 'Flask'"
**Fix:** Make sure `requirements.txt` is in root directory (not render.yaml pointing to wrong file)

### Error: "Module not found: '@/components'"
**Fix:** Ensure `vite.config.ts` alias is correct:
```typescript
resolve: {
    alias: {
        "@": path.resolve(__dirname, "./src"),
    }
}
```

### Error: "Supabase connection timeout"
**Fix:** Check environment variables match your Supabase project URL and key

---

## 📊 Expected Behavior After Deployment

### Frontend (Vercel)
- ✅ Homepage loads with hero section
- ✅ Can navigate to Analyze page
- ✅ Form renders without errors
- ✅ API calls proxy to Render backend

### Backend (Render)
- ✅ Service running on https://jobguard-api-qgxe.onrender.com
- ✅ Health check: `GET /api/health` returns `{"status": "ok"}`
- ✅ All ML models loaded (original + BERT versions available)
- ✅ Database connected and storing results

### Both
- ✅ CORS headers allow Vercel → Render requests
- ✅ Error logs visible in each platform's dashboard
- ✅ Auto-restart on crash

---

## 🚀 Upgrading to Production (Optional)

### For Heavier ML Models (BERT, Multilingual, etc.)
If you want to enable advanced features on Render:
1. Upgrade Render to Paid plan ($7+/month)
2. Install `requirements_enhanced.txt`
3. Update `render.yaml`:
   ```yaml
   buildCommand: "pip install -r requirements_enhanced.txt"
   startCommand: "gunicorn app_enhanced:app --bind 0.0.0.0:$PORT --timeout 120"
   ```
4. Redeploy

**Current Setup:** Basic ML models (TF-IDF, Random Forest, XGBoost, Isolation Forest)
**Advanced Setup:** BERT, Multilingual, Neural Networks, Continuous Learning

---

## 📞 Support

### Debug Information to Collect
When troubleshooting, gather:
1. **Vercel logs:** Dashboard → Project → Deployments → select deployment → View Logs
2. **Render logs:** Dashboard → Service → Logs tab
3. **GitHub Actions:** Repository → Actions → Check workflow status
4. **Browser console:** F12 → Console tab → check for errors

### Contact
- Vercel Support: https://vercel.com/support
- Render Support: https://docs.render.com/support
- GitHub Issues: Create issue in repository

---

**Last Updated:** March 14, 2026
