# KoinX Transaction Reconciliation Engine

A production-grade Node.js application that reconciles cryptocurrency transaction data from two sources (user-reported and exchange-exported) using configurable matching tolerances and generates detailed reconciliation reports.

## Project Overview

This engine solves a real-world problem: matching transaction records across different data sources that represent the same activity but may not match perfectly due to timing differences, data quality issues, and perspective differences (e.g., TRANSFER_IN vs TRANSFER_OUT).

## Features

- **CSV Ingestion**: Parses and validates transaction data from CSV files with comprehensive data quality checks
- **Configurable Matching**: Flexible tolerance settings for timestamp and quantity matching
- **Smart Type Mapping**: Handles TRANSFER_IN ↔ TRANSFER_OUT mapping for cross-perspective transactions
- **Asset Normalization**: Handles asset aliases (e.g., BTC = Bitcoin)
- **Detailed Reporting**: Generates CSV reports with categorized results (matched, conflicting, unmatched)
- **REST API**: Clean API endpoints for triggering reconciliation and fetching reports
- **MongoDB Integration**: Scalable database storage for transactions and reconciliation runs

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local instance or MongoDB Atlas)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Assignment_CoinX
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourApp
TIMESTAMP_TOLERANCE_SECONDS=300
QUANTITY_TOLERANCE_PCT=0.01
NODE_ENV=development
```

## Running the Application

Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will start on port 5000 (or the port specified in your .env file).

## API Endpoints

### 1. Trigger Reconciliation
**POST** `/api/reconcile`

Triggers a reconciliation run using the CSV files in the `data/` directory.

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
  "runId": "uuid-v4-string",
  "stats": {
    "matched": 15,
    "conflicting": 2,
    "unmatchedUser": 3,
    "unmatchedExchange": 2
  },
  "ingestion": {
    "user": {
      "totalRows": 25,
      "cleanRows": 22,
      "rowsWithIssues": 3
    },
    "exchange": {
      "totalRows": 24,
      "cleanRows": 24,
      "rowsWithIssues": 0
    }
  },
  "config": {
    "timestampToleranceSeconds": 300,
    "quantityTolerancePct": 0.01
  }
}
```

### 2. Get Full Report
**GET** `/api/report/:runId`

Returns the full reconciliation report as a downloadable CSV file.

**Response:** CSV file download

### 3. Get Summary
**GET** `/api/report/:runId/summary`

Returns a summary of the reconciliation run with counts.

**Response:**
```json
{
  "success": true,
  "runId": "uuid-v4-string",
  "timestamp": "2024-03-15T10:30:00.000Z",
  "config": {
    "timestampToleranceSeconds": 300,
    "quantityTolerancePct": 0.01
  },
  "stats": {
    "matched": 15,
    "conflicting": 2,
    "unmatched_user": 3,
    "unmatched_exchange": 2
  }
}
```

### 4. Get Unmatched Transactions
**GET** `/api/report/:runId/unmatched`

Returns only the unmatched transactions with reasons.

**Response:**
```json
{
  "success": true,
  "runId": "uuid-v4-string",
  "unmatched": {
    "unmatchedUser": [
      {
        "transaction_id": "USR-019",
        "timestamp": "2024-03-10T08:00:00.000Z",
        "type": "BUY",
        "asset": "BTC",
        "quantity": -0.1,
        "reason": "No matching exchange transaction found",
        "dataQualityIssues": ["Invalid quantity (must be non-negative)"]
      }
    ],
    "unmatchedExchange": [
      {
        "transaction_id": "EXC-1024",
        "timestamp": "2024-03-13T18:00:00.000Z",
        "type": "BUY",
        "asset": "ETH",
        "quantity": 0.6,
        "reason": "No matching user transaction found",
        "dataQualityIssues": []
      }
    ]
  }
}
```

## Configuration

The matching tolerances can be configured in three ways:

### 1. Environment Variables (Default)
Set in `.env`:
- `TIMESTAMP_TOLERANCE_SECONDS`: Default timestamp tolerance in seconds (default: 300)
- `QUANTITY_TOLERANCE_PCT`: Default quantity tolerance as percentage (default: 0.01)

### 2. Request Body Overrides
Override defaults by sending config in the POST `/api/reconcile` request body.

### 3. Code Changes
Modify default values in `utils/config.js` (not recommended for production).

## Data Quality Handling

The engine flags but never drops rows with data quality issues:

**Detected Issues:**
- Missing required fields (transaction_id, timestamp, type, asset, quantity)
- Invalid timestamp format (must be ISO 8601)
- Invalid quantity (must be non-negative)
- Duplicate transaction IDs within the same source
- Malformed or empty fields

**Handling Strategy:**
- All rows are stored in the database
- Data quality issues are logged in the `dataQualityIssues` array
- Original raw data is preserved in the `rawRow` field
- Issues are included in the reconciliation report for review

## Key Design Decisions

### 1. Database Schema Design
- **Separate collections** for transactions and reconciliation runs for clear separation of concerns
- **Compound indexes** on `(source, transaction_id)` and `(source, type, asset)` for efficient querying
- **Timestamp index** for time-based queries and matching
- **Embedded dataQualityIssues** array to track multiple validation errors per transaction
- **Preservation of rawRow** to enable debugging and audit trails

### 2. Matching Algorithm
- **One-to-one matching**: Each user transaction matches at most one exchange transaction to avoid complexity
- **Scoring system**: Transactions are scored based on type, asset, timestamp proximity, and quantity proximity
- **Type mapping**: TRANSFER_IN on exchange ↔ TRANSFER_OUT on user (same transaction, opposite perspective)
- **Asset normalization**: Case-insensitive matching with extensible alias system
- **Conflict detection**: Transactions matched by proximity but exceeding tolerance are flagged as conflicting

### 3. Configuration Flexibility
- **Environment variables** for default configuration
- **Request body overrides** for per-run customization
- **No code changes required** for tolerance adjustments

### 4. Asset Alias System
- Implemented extensible mapping in `utils/assetAliases.js`
- Handles common aliases (BTC = Bitcoin, ETH = Ethereum, etc.)
- Easy to extend with additional mappings

### 5. Report Generation
- **CSV format** for easy import into spreadsheets and analysis tools
- **Comprehensive columns** including both sides of matched transactions
- **Categorized results** (MATCHED, CONFLICTING, UNMATCHED_USER, UNMATCHED_EXCHANGE)
- **Reason field** explaining categorization
- **Data quality issues** included for transparency

### 6. Error Handling
- **Never silent failures**: All errors are logged and returned to the client
- **Data quality flags**: Bad rows are flagged but not dropped
- **Graceful degradation**: Missing or invalid fields are handled with defaults

### 7. API Design
- **RESTful principles**: Clear resource-based URLs
- **Consistent responses**: All endpoints return `{ success: boolean, ... }`
- **CSV download**: Proper Content-Type and Content-Disposition headers
- **Health check endpoint**: For monitoring and load balancer health checks

## Project Structure

```
koinx-reconciliation-engine/
├── config/
│   └── database.js              # MongoDB connection setup
├── models/
│   ├── Transaction.js           # Transaction schema
│   └── ReconciliationRun.js     # Reconciliation run metadata schema
├── services/
│   ├── ingestionService.js      # CSV parsing and validation
│   ├── matchingService.js       # Transaction matching algorithm
│   └── reportService.js         # Report generation
├── controllers/
│   └── reconciliationController.js  # API endpoint handlers
├── routes/
│   └── reconciliationRoutes.js      # Route definitions
├── utils/
│   ├── config.js                # Configuration management
│   ├── validators.js            # Data validation helpers
│   └── assetAliases.js          # Asset alias mappings
├── data/
│   ├── user_transactions.csv    # User transaction data
│   └── exchange_transactions.csv  # Exchange transaction data
├── reports/                     # Generated reconciliation reports
├── server.js                    # Express app entry point
├── .env                         # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Testing with Sample Data

The project includes sample CSV files in the `data/` directory with intentionally messy data to demonstrate the engine's data quality handling:

- Duplicate transaction IDs
- Malformed timestamps
- Negative quantities
- Missing fields
- Asset name variations (bitcoin vs BTC)
- Type mapping requirements (TRANSFER_IN vs TRANSFER_OUT)

Run a reconciliation to see how the engine handles these cases:

```bash
curl -X POST http://localhost:5000/api/reconcile
```

## Version Control

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
