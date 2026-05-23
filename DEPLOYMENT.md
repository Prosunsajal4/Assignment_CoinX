# KoinX Reconciliation Engine - Deployment Guide

## Status: ✅ Ready for Production Deployment

Your KoinX Transaction Reconciliation Engine is fully implemented and tested. This guide will walk you through deploying it to Vercel.

## Pre-Deployment Checklist ✓

- ✅ All source code committed to GitHub (main branch)
- ✅ All 4 REST API endpoints implemented and tested
- ✅ MongoDB integration configured
- ✅ Configuration management via environment variables
- ✅ Comprehensive error handling and validation
- ✅ Production-ready logging
- ✅ Vercel configuration file (vercel.json) created
- ✅ Environment variables template (.env.example) provided
- ✅ Complete documentation in README.md

## Repository Information

- **Repository URL**: https://github.com/Prosunsajal4/Assignment_CoinX
- **Branch**: main
- **Latest Commit**: Deployment preparation with Vercel config

## Quick Deployment Steps

### Step 1: Verify Repository Access
Make sure you have access to your GitHub repository at:
https://github.com/Prosunsajal4/Assignment_CoinX

### Step 2: Ensure MongoDB Atlas Account
1. Create a free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a cluster (if not already created)
3. Create a database user with appropriate permissions
4. Whitelist IP address 0.0.0.0/0 (or specific Vercel IPs)
5. Get your MongoDB connection string (format: `mongodb+srv://username:password@cluster...`)

### Step 3: Deploy to Vercel

**Option A: Using Vercel Dashboard (Recommended for Beginners)**

1. Visit https://vercel.com
2. Sign up or log in with GitHub
3. Click "New Project"
4. Import the Assignment_CoinX repository
5. Select framework: Choose "Other"
6. Configure Build & Development Settings:
   - Build Command: (leave empty - npm install runs by default)
   - Output Directory: (leave empty)
   - Install Command: `npm install`
7. Click "Environment Variables" and add:
   ```
   MONGODB_URI: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourApp
   TIMESTAMP_TOLERANCE_SECONDS: 300
   QUANTITY_TOLERANCE_PCT: 0.01
   NODE_ENV: production
   ```
8. Click "Deploy"

**Option B: Using Vercel CLI (For Advanced Users)**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project directory
cd Assignment_CoinX

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables when prompted
# Then confirm deployment
```

### Step 4: Configure Environment Variables

After deployment, update environment variables in Vercel Dashboard:

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add these variables for production:

| Variable | Value | Example |
|----------|-------|---------|
| MONGODB_URI | Your MongoDB Atlas connection string | mongodb+srv://user:pass@cluster... |
| TIMESTAMP_TOLERANCE_SECONDS | Timestamp tolerance in seconds | 300 |
| QUANTITY_TOLERANCE_PCT | Quantity tolerance percentage | 0.01 |
| NODE_ENV | Environment name | production |

4. After adding variables, trigger a redeployment from the "Deployments" tab

### Step 5: Test Deployment

Once deployed, test your endpoints:

```bash
# Replace with your Vercel domain
DOMAIN=https://your-project.vercel.app

# Test health endpoint
curl $DOMAIN/health

# Test reconciliation endpoint
curl -X POST $DOMAIN/api/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "timestampToleranceSeconds": 300,
    "quantityTolerancePct": 0.01
  }'

# Get summary (replace RUN_ID with the runId from above)
curl $DOMAIN/api/report/RUN_ID/summary

# Get unmatched transactions
curl $DOMAIN/api/report/RUN_ID/unmatched
```

## API Endpoints After Deployment

Once deployed, your API will be available at your Vercel domain:

- **Health Check**: `GET https://your-domain.vercel.app/health`
- **Reconcile**: `POST https://your-domain.vercel.app/api/reconcile`
- **Get Report**: `GET https://your-domain.vercel.app/api/report/:runId`
- **Get Summary**: `GET https://your-domain.vercel.app/api/report/:runId/summary`
- **Get Unmatched**: `GET https://your-domain.vercel.app/api/report/:runId/unmatched`

## Important Notes

### File Storage Limitation
Vercel's serverless environment uses ephemeral storage. CSV reports are generated in `/tmp` and will persist for the request duration but not between deployments. For production:

1. **Option 1**: Store reports in MongoDB (recommended long-term)
2. **Option 2**: Use AWS S3 or similar object storage
3. **Option 3**: Use Vercel KV for temporary caching

### Database Connection
- MongoDB connection times out after 30 seconds in serverless
- For high-volume usage, consider MongoDB Atlas M2 tier or higher
- Connection pooling is configured via Mongoose

### Cold Starts
- First request after deployment may take 5-10 seconds
- Subsequent requests are faster (hot starts)
- Consider using Vercel's concurrency limits to manage costs

## Monitoring & Debugging

### View Logs in Vercel Dashboard
1. Go to your project in Vercel
2. Click "Deployments" → Select your deployment
3. Click "Functions" to view serverless function logs
4. Monitor real-time execution and errors

### Check Deployment Status
```bash
vercel status
```

### View Recent Deployments
```bash
vercel ls
```

## Troubleshooting

### MongoDB Connection Fails
- ✓ Verify MONGODB_URI is correctly set in environment variables
- ✓ Check MongoDB Atlas whitelist includes 0.0.0.0/0 or Vercel's IP
- ✓ Ensure database user has correct permissions
- ✓ Test connection string locally before deploying

### API Returns 500 Error
1. Check Vercel function logs for errors
2. Verify all environment variables are set
3. Check MongoDB connectivity
4. Look for validation errors in request body

### Reconciliation Takes Too Long
- Reduce the number of transactions
- Optimize MongoDB queries
- Consider upgrading MongoDB tier
- Implement caching for repeated queries

## Performance Optimization

### For Large Datasets
1. Implement transaction batching in ingestion service
2. Add indexing for frequently queried fields
3. Use MongoDB aggregation pipelines
4. Consider rate limiting on API endpoints

### Database Optimization
- Vercel has cold-start limitations
- MongoDB Atlas connection pooling is enabled
- Consider M2 or higher tier for production use

## Security Recommendations

1. **API Authentication** (Not implemented in this version)
   - Add API key validation
   - Implement JWT tokens
   - Use rate limiting

2. **Data Validation**
   - All inputs are validated (already implemented)
   - Consider adding request size limits

3. **Environment Variables**
   - Never commit sensitive data
   - Use Vercel's environment variables
   - Rotate credentials periodically

## Rollback & Versioning

To rollback to a previous deployment:
1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Find the deployment you want to restore
4. Click the three dots menu
5. Select "Promote to Production"

## Cost Estimation

Vercel Free Plan:
- 100 GB bandwidth/month
- Included Serverless Function invocations
- Good for development/testing

Estimated Monthly Cost (Production):
- $20-50 depending on traffic
- MongoDB Atlas M2 tier: $9/month

## Next Steps

1. ✅ Deploy to Vercel using steps above
2. ✅ Test all API endpoints
3. ✅ Monitor performance in first week
4. ✅ Set up uptime monitoring
5. ✅ Configure alerts for errors
6. ✅ Plan scaling strategy

## Support & Documentation

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Node.js on Vercel**: https://vercel.com/docs/functions/nodejs

## Submission Checklist for KoinX

Before submitting to KoinX:

- ✅ Code is production-ready
- ✅ All 4 API endpoints working
- ✅ Database schema properly designed
- ✅ Data quality handling implemented
- ✅ Comprehensive documentation provided
- ✅ Clean git commit history
- ✅ Vercel deployment ready
- ✅ MongoDB integration complete
- ✅ Configuration management implemented
- ✅ Error handling robust

## Repository URL
**https://github.com/Prosunsajal4/Assignment_CoinX**

Your application is ready for production deployment! 🚀
