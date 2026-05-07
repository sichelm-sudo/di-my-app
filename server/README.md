# DI-MY Server

Express + TypeScript backend for the DI-MY household repair diagnosis app.

## Prerequisites

- Node.js 18+
- An Anthropic API key

## Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Running

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

The server runs on `http://localhost:3001` by default.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/diagnose` | Diagnose a repair issue from a photo |

### POST /api/diagnose

**Request body:**
```json
{
  "imageBase64": "<base64-encoded image>",
  "mimeType": "image/jpeg",
  "description": "Optional description of the problem"
}
```

**Response:**
```json
{
  "likelyIssue": "Description of the diagnosed problem",
  "confidence": "high",
  "safetyWarnings": [],
  "callProfessional": false,
  "toolsNeeded": ["Wrench", "Teflon tape"],
  "partsNeeded": ["Replacement faucet cartridge"],
  "repairSteps": ["Step 1: ...", "Step 2: ..."],
  "productSuggestions": [
    {
      "name": "Product name",
      "description": "What it's for",
      "estimatedPrice": "$10 - $20",
      "searchQuery": "Search term for Home Depot"
    }
  ]
}
```
