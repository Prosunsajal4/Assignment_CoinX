# KoinX Transaction Reconciliation Engine

A Node.js backend that reconciles cryptocurrency transactions from two sources using configurable matching tolerances and generates reconciliation reports.

## Features

- CSV ingestion with data quality validation
- Configurable timestamp and quantity tolerances
- Smart type mapping (TRANSFER_IN ↔ TRANSFER_OUT)
- Asset normalization and alias handling
- Detailed reconciliation reports (CSV format)
- REST API for triggering reconciliation and retrieving reports
- MongoDB integration for data persistence

## Prerequisites

- Node.js (v14+)
- MongoDB Atlas account
- npm

## Installation

```bash
git clone https://github.com/Prosunsajal4/Assignment_CoinX.git
cd Assignment_CoinX
npm install
```

## Environment Setup

Create a `.env` file:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
TIMESTAMP_TOLERANCE_SECONDS=300
QUANTITY_TOLERANCE_PCT=0.01
```

## Running Locally

```bash
npm start          # Production
npm run dev        # Development with auto-reload
```

## API Endpoints

### POST `/api/reconcile`
Trigger reconciliation run.

**Request Body (optional):**
```json
{
  "timestampToleranceSeconds": 300,
  "quantityTolerancePct": 0.01
}
```

**Response:**
```json
{
  "success": true,
  "runId": "uuid",
  "stats": {
    "matched": 21,
    "conflicting": 0,
    "unmatchedUser": 5,
    "unmatchedExchange": 4
  }
}
```

### GET `/api/report/:runId`
Download full reconciliation report (CSV).

### GET `/api/report/:runId/summary`
Get summary statistics.

### GET `/api/report/:runId/unmatched`
Get unmatched transactions only.

### GET `/health`
Health check endpoint.

## Deployment to Vercel

1. Ensure code is pushed to GitHub
2. Go to https://vercel.com and sign in with GitHub
3. Click "New Project" → Import your repository
4. Select "Other" as framework
5. Add environment variables:
   - MONGODB_URI
   - TIMESTAMP_TOLERANCE_SECONDS
   - QUANTITY_TOLERANCE_PCT
   - NODE_ENV=production
6. Click "Deploy"

## Data Quality

The engine flags (but never drops) rows with issues:
- Missing required fields
- Invalid timestamp format
- Invalid quantity (must be non-negative)
- Duplicate transaction IDs
- Malformed data

All flagged rows are preserved and included in reports.

## Configuration

Tolerance settings can be configured via environment variables or per-request:
- `TIMESTAMP_TOLERANCE_SECONDS` (default: 300)
- `QUANTITY_TOLERANCE_PCT` (default: 0.01)

Supported asset aliases:
- BTC, Bitcoin
- ETH, Ethereum
- SOL, Solana
- USDT, Tether

## Project Structure

```
├── config/database.js
├── models/Transaction.js, ReconciliationRun.js
├── services/ingestionService.js, matchingService.js, reportService.js
├── controllers/reconciliationController.js
├── routes/reconciliationRoutes.js
├── utils/config.js, assetAliases.js, validators.js
├── data/user_transactions.csv, exchange_transactions.csv
└── server.js
```

## Sample Test

```bash
curl -X POST http://localhost:5000/api/reconcile
```

## License

ISC

This project uses Git for version control with meaningful commit messages:

- `feat: add feature description` - New features
- `fix: bug description` - Bug fixes
- `refactor: description` - Code refactoring
- `docs: description` - Documentation updates
- `test: description` - Test additions or modifications

## Deployment

### Deploy to Vercel

This application can be deployed to Vercel for serverless execution.

#### Prerequisites:

- Vercel account (free at https://vercel.com)
- Git repository (GitHub, GitLab, or Bitbucket)
- MongoDB Atlas account (for cloud database)

#### Steps:

1. **Prepare MongoDB Atlas**:
   - Create a cluster at https://www.mongodb.com/cloud/atlas
   - Create a database user
   - Whitelist your Vercel IP (or use 0.0.0.0 for all IPs)
   - Get your connection string

2. **Push to GitHub**:

   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

3. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select "Other" as the framework
   - Click "Deploy"

4. **Configure Environment Variables**:
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add the following variables:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourApp
     TIMESTAMP_TOLERANCE_SECONDS=300
     QUANTITY_TOLERANCE_PCT=0.01
     NODE_ENV=production
     ```

5. **Redeploy**:
   - After setting environment variables, trigger a redeploy from the Deployments tab

#### Environment Configuration for Vercel:

- The application automatically uses Node.js runtime
- `vercel.json` is configured to route all requests through the main server
- Database connections are managed through environment variables
- Reports are generated in the `/tmp` directory (serverless-safe)

#### Note on File Storage:

For serverless environments, the reports directory might not persist. Consider:

- Storing reports in MongoDB (future enhancement)
- Using AWS S3 or similar object storage
- Using Vercel KV for temporary storage

### Local Development Setup

1. Clone and install:

   ```bash
   git clone <your-repo-url>
   cd Assignment_CoinX
   npm install
   ```

2. Create `.env` file (use `.env.example` as template):

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your MongoDB connection string and desired tolerances

4. Start development server:
   ```bash
   npm run dev
   ```

## Future Enhancements

Potential improvements for production deployment:

- **Authentication**: Add API key or JWT authentication
- **Rate limiting**: Prevent abuse of API endpoints
- **Caching**: Cache reconciliation results for faster repeated queries
- **Webhook support**: Notify external systems when reconciliation completes
- **Bulk processing**: Support for processing multiple file pairs
- **Advanced matching**: Machine learning-based matching for complex scenarios
- **Dashboard**: Web UI for visualizing reconciliation results
- **Audit logging**: Detailed audit trail for compliance

## License

ISC

## Author

Built for KoinX Backend Internship Assignment
