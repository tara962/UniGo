# UniGo — Architecture & Deployment Guide

## Overview

UniGo uses a **serverless architecture** on AWS, deployed via **AWS CDK (TypeScript)**. The frontend is a static HTML/CSS/JS site hosted on S3 + CloudFront. The backend consists of Cognito (auth), DynamoDB (database), Lambda (compute), and API Gateway (REST API).

---

## Project Structure

```
UniGo/
├── index.html              # Study Buddy page (map + heatmap)
├── food.html               # Food Finder page
├── options.html            # User profile & preferences
├── schedule.html           # Schedule page
├── login.html              # Authentication (sign up / log in)
├── css/
│   └── styles.css          # All styling
├── js/
│   ├── config.js           # ⚠️ AWS config (fill after deploy)
│   ├── auth.js             # Cognito authentication client
│   ├── api.js              # API Gateway client
│   ├── app.js              # Shared UI logic (sidebar, prefs, etc.)
│   ├── map-study.js        # Study Buddy map + heatmap + markers
│   └── map-food.js         # Food Finder map
├── infra/                  # AWS CDK Infrastructure
│   ├── cdk.json            # CDK app config
│   ├── package.json        # CDK dependencies
│   ├── tsconfig.json       # TypeScript config
│   ├── bin/
│   │   └── infra.ts        # CDK app entry point
│   ├── lib/
│   │   └── unigo-stack.ts  # Main stack (all AWS resources)
│   └── lambda/
│       ├── index.mjs       # Lambda handler (API logic)
│       └── package.json    # Lambda dependencies
└── deploy.ps1              # Legacy simple deploy (can be removed)
```

---

## AWS Services Used

| Service | Purpose | Pricing Model |
|---------|---------|---------------|
| **S3** | Hosts static frontend files | Pay per storage + requests |
| **CloudFront** | CDN + HTTPS for frontend | Pay per request + data transfer |
| **Cognito** | User authentication (sign up, login, JWT tokens) | Free tier: 50,000 MAU |
| **DynamoDB** | Database for users, locations, buddies | Pay per request (on-demand) |
| **Lambda** | Backend API logic | Free tier: 1M requests/month |
| **API Gateway** | REST API with CORS + auth | Free tier: 1M calls/month |

**Estimated cost for a small project:** $0–5/month within free tier.

---

## How the CDK Stack Works

The entire infrastructure is defined in `infra/lib/unigo-stack.ts`. When you run `cdk deploy`, it creates a CloudFormation stack with:

### 1. Frontend Hosting
```
S3 Bucket → CloudFront Distribution → HTTPS URL
```
- S3 stores your HTML/CSS/JS files (private, accessed only through CloudFront)
- CloudFront provides HTTPS (required for geolocation API) and global caching
- `BucketDeployment` automatically uploads your frontend files on each deploy
- Default root is `login.html` (unauthenticated users land here)

### 2. Authentication (Cognito)
```
User Pool → User Pool Client → JWT Tokens
```
- Users sign up/in with email + password
- Cognito returns JWT tokens (ID, Access, Refresh)
- The ID token is sent as `Authorization` header in API calls
- Password policy: minimum 6 characters, no complexity requirements
- Auto-verifies email addresses

### 3. Database (DynamoDB)

**3 tables:**

| Table | Partition Key | Sort Key | TTL | Purpose |
|-------|-------------|----------|-----|---------|
| `unigo-users` | `userId` (String) | — | — | User profiles & preferences |
| `unigo-locations` | `locationId` (String) | `userId` (String) | `ttl` | User check-ins for vibe meter |
| `unigo-buddies` | `buddyId` (String) | — | `ttl` | Active study sessions |

- **Locations** expire after 2 hours (TTL)
- **Buddies** expire after 4 hours (TTL)
- `unigo-locations` has a GSI (`active-users-index`) for querying all active users

### 4. API (Lambda + API Gateway)

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | ✅ | Get current user's profile |
| `PUT` | `/users` | ✅ | Update profile |
| `GET` | `/users/{userId}` | ❌ | Get public profile |
| `GET` | `/locations` | ❌ | Get all active user locations (heatmap) |
| `POST` | `/locations` | ✅ | Check in at a location |
| `GET` | `/buddies` | ❌ | Get all study buddy broadcasts |
| `POST` | `/buddies` | ✅ | Broadcast a study session |

- ✅ = requires Cognito JWT token in `Authorization` header
- ❌ = public (no auth needed)
- Lambda runs Node.js 20, uses AWS SDK v3 for DynamoDB
- CORS is enabled for all origins

---

## How Frontend ↔ Backend Wiring Works

### Authentication Flow
```
login.html
    → js/auth.js → Cognito HTTP API (SignUp / InitiateAuth)
    → JWT tokens stored in localStorage
    → Redirect to index.html or options.html
```

### Page Load Flow
```
Any page loads
    → js/config.js (AWS endpoints)
    → js/auth.js (token management)
    → js/api.js (API client)
    → js/app.js checks Auth.isLoggedIn()
        → If no token → redirect to login.html
        → If token exists → page loads normally
```

### API Call Flow
```
Frontend action (e.g., fetch buddies)
    → API.getBuddies()
    → fetch(API_URL + '/buddies', { headers: { Authorization: idToken } })
    → API Gateway validates token via Cognito Authorizer
    → Lambda executes → DynamoDB query
    → JSON response back to frontend
```

### Fallback Behavior
If `config.js` still has placeholder values (`YOUR_API_URL_HERE`), the app gracefully falls back to:
- Static demo buddy data on the map
- localStorage-based auth (original behavior)
- No API calls are made

This means the site works both locally for development AND live after deployment.

---

## First-Time Setup & Deployment

### Prerequisites
- Node.js 18+ installed
- AWS CLI installed and configured (`aws configure`)
- An AWS account

### Deploy Steps

```powershell
# 1. Navigate to CDK project
cd C:\Users\uutot\Downloads\UniGo\infra

# 2. Install CDK dependencies
npm install

# 3. Install Lambda dependencies
cd lambda
npm install
cd ..

# 4. Bootstrap CDK (one-time per account/region)
npx cdk bootstrap

# 5. Deploy everything
npx cdk deploy
```

### After Deploy

CDK will print outputs like:
```
Outputs:
UniGoStack.WebsiteURL = https://d1234abcdef.cloudfront.net
UniGoStack.ApiURL = https://abc123.execute-api.us-east-1.amazonaws.com/prod/
UniGoStack.UserPoolId = us-east-1_AbCdEfG
UniGoStack.UserPoolClientId = 1a2b3c4d5e6f7g8h9i
UniGoStack.DistributionId = E1234567ABCDEF
```

**Copy these into `js/config.js`:**
```javascript
const UNIGO_CONFIG = {
  API_URL: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/',
  USER_POOL_ID: 'us-east-1_AbCdEfG',
  USER_POOL_CLIENT_ID: '1a2b3c4d5e6f7g8h9i',
  REGION: 'us-east-1',
};
```

Then redeploy to push the updated config to S3:
```powershell
npx cdk deploy
```

Your site is now live at the CloudFront URL with full backend!

---

## Updating & Redeploying

### Frontend changes only (HTML/CSS/JS)
```powershell
cd C:\Users\uutot\Downloads\UniGo\infra
npx cdk deploy
```
CDK detects changed files and re-uploads to S3 + invalidates CloudFront cache.

### Backend changes (Lambda code)
```powershell
cd C:\Users\uutot\Downloads\UniGo\infra
npx cdk deploy
```
Same command — CDK detects Lambda code changes and updates the function.

### Infrastructure changes (new tables, endpoints, etc.)
```powershell
cd C:\Users\uutot\Downloads\UniGo\infra
npx cdk deploy
```
Same command — CDK handles all CloudFormation updates safely.

**TL;DR: The deploy command is always:**
```powershell
cd infra && npx cdk deploy
```

---

## Tearing Down (Delete Everything)

```powershell
cd C:\Users\uutot\Downloads\UniGo\infra
npx cdk destroy
```
This removes ALL AWS resources (S3 bucket, CloudFront, Cognito, DynamoDB, Lambda, API Gateway). Data will be lost.

---

## Development Workflow

### Local Development
1. Open `login.html` in browser (or use Live Server extension)
2. Site works with demo data (localStorage + static buddies)
3. No AWS needed for UI development

### Adding a New API Endpoint
1. Add the route in `infra/lib/unigo-stack.ts` (API Gateway resource + method)
2. Add the handler logic in `infra/lambda/index.mjs`
3. Add the client method in `js/api.js`
4. Call it from your frontend JS
5. Run `npx cdk deploy`

### Adding a New DynamoDB Table
1. Define the table in `infra/lib/unigo-stack.ts`
2. Grant Lambda permissions: `newTable.grantReadWriteData(apiHandler)`
3. Add env variable: `NEW_TABLE: newTable.tableName`
4. Use it in Lambda: `process.env.NEW_TABLE`
5. Run `npx cdk deploy`

### Adding a New Page
1. Create the HTML file in the root
2. Include the standard script tags: `config.js`, `auth.js`, `api.js`, `app.js`
3. Copy the header/sidebar from any existing page
4. The BucketDeployment will automatically pick it up on next deploy

---

## Key Design Decisions

- **No backend framework** — Lambda is a single handler with routing via `resource` + `httpMethod`. Simple and fast.
- **TTL on locations/buddies** — DynamoDB automatically deletes stale records. No cleanup Lambda needed.
- **Pay-per-request billing** — No provisioned capacity. $0 when no traffic.
- **Cognito with USER_PASSWORD_AUTH** — No hosted UI dependency. Auth is fully custom in our frontend.
- **Frontend-first fallback** — App works without backend for local dev. API calls only fire if config is filled in.
- **Single stack** — Everything in one CDK stack for simplicity. Split into multiple stacks as the project grows.

---

## Team Notes

- **Never commit `js/config.js` with real values to a public repo** — it contains your User Pool Client ID. Add it to `.gitignore` or use environment-specific configs.
- **CloudFront cache** — Changes may take a few minutes to propagate. For instant updates during testing, invalidate: `aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"`
- **Cognito email verification** — Currently set to auto-verify. For production, consider requiring actual email confirmation.
- **CORS** — Currently allows all origins. For production, restrict to your CloudFront domain.
