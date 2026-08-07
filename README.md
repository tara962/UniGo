# UniGo 🎓

A real-time campus companion for UBC Vancouver students. UniGo helps you find study spots, connect with study buddies, optimize your schedule with AI, and navigate campus life — all in one place.

**Live Site:** [https://d2wem3v0eb23xv.cloudfront.net](https://d2wem3v0eb23xv.cloudfront.net)

---

## What is UniGo?

UniGo solves a common problem for university students: **so many study spots, so little time, and no way to know what's busy.** It combines crowd-sourced location data, study buddy matching, and AI-powered schedule optimization into a single campus tool.

---

## Features

### 📚 Study Buddy Finder
- Interactive map centered on UBC Vancouver campus (Leaflet.js + OpenStreetMap)
- Real-time "Vibe Meter" heatmap showing how busy each study location is, based on active UniGo users (green = quiet, red = busy)
- Study buddy markers on the map — click any marker to see what they're studying, their course, and study preferences
- Broadcast your own study session for others to find you

### 🗓️ AI Schedule Optimizer
- Input your class schedule (name, day, time, location)
- Set preferences for activities, dietary restrictions, and meals
- AI generates an optimized time-blocked schedule for your free time between classes
- Suggests meals, study sessions, exercise, transit blocks, and breaks
- Regenerate for different suggestions using a variation seed
- Powered by **Claude Sonnet 4.6** via AWS Bedrock

### 📍 Live Location Sharing
- Enable location sharing to appear on the map as a "ME" marker
- Uses device GPS (Geolocation API) on HTTPS
- Your location contributes to the campus vibe meter heatmap
- Toggle on/off anytime from the Options page

### 🔐 Campus Security
- One-tap emergency button on the map
- Mobile: calls UBC Campus Security (604-822-2222) directly
- Desktop: opens the UBC Community Safety website

### ⚙️ User Profile & Preferences
- Profile photo upload
- Academic info (year, degree, major, minor)
- Study method preferences (Pomodoro, Deep Work, Flashcards, Group Study, Solo, Active Recall)
- Location preferences (Daylight, Dark Lit, Windows, Enclosed, High Floor, Basement)
- Habit preferences (Early Riser, Night Owl, Morning/Afternoon/Evening/Late Night Study)
- Editable course list (add/remove courses you're taking)

### 🔑 Authentication
- Sign up / Log in with email and password
- Secure JWT-based authentication via AWS Cognito
- Protected API endpoints for user-specific actions

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| HTML5 / CSS3 / Vanilla JavaScript | Core frontend (no frameworks) |
| [Leaflet.js](https://leafletjs.com/) | Interactive map rendering |
| [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) | Heatmap visualization for vibe meter |
| [OpenStreetMap](https://www.openstreetmap.org/) | Map tile layer |
| [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter) | Typography |

### Backend (Serverless on AWS)
| Service | Purpose |
|---------|---------|
| [AWS CDK](https://aws.amazon.com/cdk/) (TypeScript) | Infrastructure as Code |
| [Amazon S3](https://aws.amazon.com/s3/) | Static frontend hosting |
| [Amazon CloudFront](https://aws.amazon.com/cloudfront/) | CDN + HTTPS delivery |
| [Amazon Cognito](https://aws.amazon.com/cognito/) | User authentication (sign up, login, JWT tokens) |
| [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) | NoSQL database (users, locations, buddies) |
| [AWS Lambda](https://aws.amazon.com/lambda/) (Node.js 20) | Serverless API compute |
| [Amazon API Gateway](https://aws.amazon.com/api-gateway/) | REST API with CORS |
| [Amazon Bedrock](https://aws.amazon.com/bedrock/) | AI model hosting (Claude Sonnet 4.6) |

### AI Model
| Model | Provider | Use Case |
|-------|----------|----------|
| Claude Sonnet 4.6 | Anthropic (via AWS Bedrock) | Schedule optimization — generates time-blocked suggestions for free time between classes |

### Development Tools
| Tool | Purpose |
|------|---------|
| [Kiro IDE](https://kiro.dev/) | AI-powered development environment |
| Git / GitHub | Version control |
| AWS CLI | Cloud deployment & management |

---

## Project Structure

```
UniGo/
├── index.html              # Study Buddy page (map + heatmap + markers)
├── scheduler.html          # AI Schedule Optimizer
├── schedule.html           # My Schedule page
├── options.html            # User profile & preferences
├── login.html              # Authentication (sign up / log in)
├── css/
│   └── styles.css          # All styling (responsive)
├── js/
│   ├── config.js           # AWS configuration (API URL, Cognito IDs)
│   ├── auth.js             # Cognito authentication client
│   ├── api.js              # API Gateway client
│   ├── app.js              # Shared UI logic (sidebar, prefs, avatar)
│   ├── map-study.js        # Study Buddy map + heatmap + user location
│   └── map-food.js         # Food Finder map (deprecated)
├── infra/                  # AWS CDK Infrastructure
│   ├── cdk.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── bin/infra.ts        # CDK app entry point
│   ├── lib/unigo-stack.ts  # All AWS resources defined here
│   └── lambda/
│       ├── index.mjs       # Lambda API handler
│       └── package.json
└── ARCHITECTURE.md         # Detailed architecture & deployment guide
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI installed and configured (`aws configure`)
- AWS account with Bedrock model access enabled for Claude Sonnet 4.6

### Local Development

Just open `login.html` in a browser. The site works locally with demo data (static buddy markers, localStorage auth). No AWS needed for UI work.

### Deploy to AWS

```bash
# 1. Install dependencies
cd infra
npm install
cd lambda && npm install && cd ..

# 2. Bootstrap CDK (first time only)
npx cdk bootstrap

# 3. Deploy everything
npx cdk deploy
```

After deploy, copy the CDK output values into `js/config.js`:

```javascript
const UNIGO_CONFIG = {
  API_URL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/',
  USER_POOL_ID: 'us-east-1_XXXXXXX',
  USER_POOL_CLIENT_ID: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
  REGION: 'us-east-1',
};
```

Then redeploy to push the config:
```bash
npx cdk deploy
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | ✅ | Get current user profile |
| PUT | `/users` | ✅ | Update profile |
| GET | `/users/{userId}` | ❌ | Get public profile |
| GET | `/locations` | ❌ | Get active user locations (heatmap data) |
| POST | `/locations` | ✅ | Check in at a location |
| GET | `/buddies` | ❌ | Get active study buddy broadcasts |
| POST | `/buddies` | ✅ | Broadcast a study session |
| POST | `/optimize` | ❌ | AI schedule generation (Bedrock) |

---

## Database Schema

| Table | Key | TTL | Purpose |
|-------|-----|-----|---------|
| `unigo-users` | `userId` (partition) | — | Profiles & preferences |
| `unigo-locations` | `locationId` + `userId` | 2 hours | User check-ins for vibe meter |
| `unigo-buddies` | `buddyId` | 4 hours | Active study session broadcasts |

---

## Design Decisions

- **No frontend framework** — Vanilla JS keeps it simple, fast, and dependency-free
- **Single Lambda handler** — Routes via `resource` + `httpMethod` for simplicity
- **DynamoDB TTL** — Stale locations and buddy sessions auto-expire without cleanup jobs
- **Pay-per-request billing** — $0 when there's no traffic
- **Graceful fallback** — Works locally with demo data, connects to real backend only when configured
- **Mobile-first responsive** — Sidebar overlays on mobile, content shifts on desktop

---

## Team

Built by UBC students for UBC students.

---

## License

This project is for educational purposes.
