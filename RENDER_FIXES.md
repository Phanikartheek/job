# Render Deployment Troubleshooting - Quick Fixes

## 🔴 Common Render Backend Errors & Solutions

### Error 1: "ModuleNotFoundError: No module named 'flask'"
**Cause:** requirements.txt not installed properly
**Fix:**
```yaml
buildCommand: "pip install --upgrade pip && pip install -r requirements.txt"
```

### Error 2: "Connection timeout" or "Service timeout"
**Cause:** Backend taking too long to start (BERT/torch models)
**Fix:**
```yaml
startCommand: "gunicorn --chdir flask_backend app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1"
```
(Increase timeout from 60 to 120 seconds)

### Error 3: "Port already in use"
**Fix:** Render assigns port automatically, make sure command uses `$PORT` variable:
```yaml
startCommand: "gunicorn --chdir flask_backend app:app --bind 0.0.0.0:$PORT"
```

### Error 4: "Gunicorn not found"
**Fix:** Add gunicorn to requirements.txt
Add this line to requirements.txt:
```
gunicorn==21.2.0
```

### Error 5: "Python version mismatch"
**Fix:** Set in environment variables:
```
PYTHON_VERSION = 3.10.0
```

---

## ✅ Quick Render Setup Checklist

- [ ] render.yaml exists in root directory
- [ ] requirements.txt has all dependencies including gunicorn
- [ ] Flask app.py exists in flask_backend/
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `gunicorn --chdir flask_backend app:app --bind 0.0.0.0:$PORT --timeout 60`
- [ ] Python version: 3.10.0
- [ ] Environment variables set (if using .env)

---

## 🔧 Manual Fix if Stuck

If Render keeps failing:

1. **Delete the service** (jobguard-api)
2. **Create new Web Service** on Render
3. **Connect to GitHub** (phanikartheek/job repo)
4. **Set these exact values:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --chdir flask_backend app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60`
   - Python Version: 3.10.0
5. **Environment Variables:**
   ```
   FLASK_ENV=production
   ```
6. **Deploy**

---

## 📊 Expected Log Output (Success)

```
Cloning repository...
Running build command...
Collecting Flask==3.0.0...
...
Installing collected packages...
Successfully installed Flask scikit-learn xgboost...

Running start command...
[2026-03-14 13:45:00] Starting gunicorn...
[2026-03-14 13:45:02] Listening on 0.0.0.0:PORT
✅ Service is live!
```

---

## 🔗 Render Settings Path

Dashboard → jobguard-api → Settings:
- Build & Deploy tab
- Environment tab
- Redirects tab

---

**What error are you seeing on Render?** Please share the screenshot of the error.
