# Deploy to Vercel - Step by Step

## Prerequisites
- Vercel account: https://vercel.com (sign up free with GitHub)
- MongoDB Atlas account: https://www.mongodb.com/cloud/atlas (free tier available)
- Code pushed to GitHub: ✅ Done

## Step 1: Prepare MongoDB Connection String

1. Go to https://www.mongodb.com/cloud/atlas
2. Create/Login to your account
3. Create a new cluster (free M0 tier)
4. Click "Connect" → "Connect your application"
5. Select Node.js driver
6. Copy connection string: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
7. **Save this - you'll need it for Vercel**

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com
2. Click "New Project"
3. Click "Import Git Repository"
4. Search for: `Prosunsajal4/Assignment_CoinX`
5. Click "Import"
6. Under "Build & Development Settings":
   - Framework Preset: Select "Other"
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: npm install
7. Click "Environment Variables" and add:
   ```
   MONGODB_URI: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourApp
   TIMESTAMP_TOLERANCE_SECONDS: 300
   QUANTITY_TOLERANCE_PCT: 0.01
   NODE_ENV: production
   ```
8. Click "Deploy"
9. Wait 2-5 minutes for deployment to complete

### Option B: Via Vercel CLI

```powershell
npm install -g vercel
cd Assignment_CoinX
vercel login
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Set project name: assignment-coinx
# - Detected Node.js? Yes
# - Add Environment Variables when prompted
vercel env add MONGODB_URI
vercel env add TIMESTAMP_TOLERANCE_SECONDS
vercel env add QUANTITY_TOLERANCE_PCT
vercel env add NODE_ENV production

vercel --prod
```

## Step 3: Verify Deployment

After deployment completes, you'll get a URL like: `https://assignment-coinx.vercel.app`

Test it:

```powershell
# Test health endpoint
$domain = "https://your-deployment-url.vercel.app"
Invoke-WebRequest "$domain/health"

# Should return:
# {"success":true,"message":"KoinX Reconciliation Engine is running",...}
```

## Step 4: Test API Endpoints

```powershell
# 1. Trigger reconciliation
$response = Invoke-WebRequest -Uri "$domain/api/reconcile" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body "{}"

$runId = ($response.Content | ConvertFrom-Json).runId
Write-Host "Run ID: $runId"

# 2. Get summary
Invoke-WebRequest "$domain/api/report/$runId/summary"

# 3. Get unmatched
Invoke-WebRequest "$domain/api/report/$runId/unmatched"

# 4. Download report
Invoke-WebRequest "$domain/api/report/$runId" -OutFile report.csv
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Check MONGODB_URI in Vercel env vars. Whitelist 0.0.0.0/0 in MongoDB Atlas. |
| 500 error | Check Vercel function logs. Verify all env vars are set. |
| Env vars not working | Redeploy after setting variables. Changes take effect on next deployment. |

## Your Deployment URLs

After deployment:

- **Live API**: https://your-project-name.vercel.app
- **Health Check**: https://your-project-name.vercel.app/health
- **GitHub**: https://github.com/Prosunsajal4/Assignment_CoinX
- **Vercel Dashboard**: https://vercel.com/dashboard

## API Endpoints (After Deployment)

```
POST   /api/reconcile              # Trigger reconciliation
GET    /api/report/:runId          # Download CSV report
GET    /api/report/:runId/summary  # Get statistics
GET    /api/report/:runId/unmatched # Get unmatched transactions
GET    /health                     # Health check
```

## What's Deployed

- ✅ Node.js backend (Express)
- ✅ MongoDB integration
- ✅ CSV transaction reconciliation
- ✅ REST API endpoints
- ✅ Configurable matching tolerances
- ✅ Data quality validation
- ✅ Report generation (CSV)

## Next Steps

1. Visit your deployment URL
2. Test the API endpoints
3. Submit deployment URL to KoinX
4. Include repository URL: https://github.com/Prosunsajal4/Assignment_CoinX

Done! 🎉
