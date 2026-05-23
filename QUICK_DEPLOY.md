# 🚀 Quick Vercel Deployment Guide (5 Minutes)

## Step 1️⃣: Prepare MongoDB Atlas (2 min)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and log in
3. Create a new cluster (free tier available)
4. Once created, click "Connect"
5. Choose "Connect your application"
6. Select "Node.js" driver version 4.1 or later
7. **Copy your connection string** - looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourApp
   ```

> ⚠️ **Important**: Replace `<username>` and `<password>` with your actual database user credentials

## Step 2️⃣: Deploy to Vercel (3 min)

### Via Vercel Dashboard (Easiest)

1. Visit https://vercel.com
2. Sign up or log in with GitHub
3. Click **"New Project"**
4. Click **"Import Git Repository"**
5. Paste: `https://github.com/Prosunsajal4/Assignment_CoinX`
6. Click **"Import"**
7. You'll see project configuration screen:
   - Framework: Select **"Other"**
   - Build Command: *Leave blank*
   - Output Directory: *Leave blank*

8. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add these 4 variables:

| Name | Value |
|------|-------|
| MONGODB_URI | Your MongoDB connection string from Step 1 |
| TIMESTAMP_TOLERANCE_SECONDS | 300 |
| QUANTITY_TOLERANCE_PCT | 0.01 |
| NODE_ENV | production |

9. Click **"Deploy"** button
10. Wait for deployment to complete (3-5 minutes)
11. You'll get a URL like: `https://assignment-coinx.vercel.app`

## ✅ Verify Deployment Works

```bash
# Test with your Vercel domain
DOMAIN=https://your-project-name.vercel.app

# Health check
curl $DOMAIN/health

# Should return:
# {"success":true,"message":"KoinX Reconciliation Engine is running","timestamp":"..."}
```

## 📍 Your Live API Endpoints

Once deployed, these endpoints are live:

```
POST   https://your-domain.vercel.app/api/reconcile
GET    https://your-domain.vercel.app/api/report/:runId
GET    https://your-domain.vercel.app/api/report/:runId/summary
GET    https://your-domain.vercel.app/api/report/:runId/unmatched
GET    https://your-domain.vercel.app/health
```

## 🧪 Test Your Deployment

### Test 1: Trigger Reconciliation
```powershell
# PowerShell
$domain = "https://your-project-name.vercel.app"
$response = Invoke-WebRequest -Uri "$domain/api/reconcile" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body "{}"
  
$runId = ($response.Content | ConvertFrom-Json).runId
Write-Host "Run ID: $runId"
```

### Test 2: Get Summary
```powershell
$response = Invoke-WebRequest -Uri "$domain/api/report/$runId/summary" -Method GET
$response.Content | ConvertFrom-Json | Format-List
```

### Test 3: Get Unmatched
```powershell
$response = Invoke-WebRequest -Uri "$domain/api/report/$runId/unmatched" -Method GET
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

## ⚠️ Common Issues & Fixes

### "MongoDB Connection Failed"
- ✓ Copy MongoDB URI correctly (check username/password)
- ✓ In MongoDB Atlas, whitelist IP: 0.0.0.0/0
- ✓ Wait 2-3 minutes after creating cluster
- ✓ Verify connection string format

### "500 Internal Server Error"
- ✓ Check Vercel function logs (Deployments > Functions)
- ✓ Verify all 4 environment variables are set
- ✓ Try redeploying after setting variables

### "Environment variables not working"
- ✓ Set variables in Vercel dashboard
- ✓ Trigger a redeployment (Redeploy button)
- ✓ Wait 1-2 minutes for changes to take effect

## 🔗 Useful Links

- **Your Vercel Dashboard**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Your Repository**: https://github.com/Prosunsajal4/Assignment_CoinX

## 📋 Submission Checklist

After deployment:

- ✅ Visit your Vercel deployment URL
- ✅ Test `/health` endpoint
- ✅ Test `/api/reconcile` endpoint
- ✅ Copy your deployment URL
- ✅ Submit to KoinX with:
  - GitHub Repository: https://github.com/Prosunsajal4/Assignment_CoinX
  - Vercel Deployment URL: https://your-project-name.vercel.app
  - README: In repository (comprehensive documentation included)

---

**That's it! 🎉 Your KoinX Reconciliation Engine is now live in production!**

For detailed information, see:
- **DEPLOYMENT.md** - Full deployment guide with troubleshooting
- **COMPLETION_SUMMARY.md** - What was built and tested
- **README.md** - API documentation and features
