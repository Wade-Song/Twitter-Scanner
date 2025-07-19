# Twitter Scanner Proxy Server

A lightweight proxy server for the Twitter Scanner browser extension that provides free Claude API access with usage limits.

## Features

- 🔒 Rate limiting and usage tracking
- 📊 Memory-based usage counters
- 🛡️ Security headers and CORS protection
- 📝 Comprehensive logging
- 🔄 Automatic retry mechanism for Claude API
- 🚀 Easy deployment to cloud platforms

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Claude API key
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Build and start:**
   ```bash
   npm install --production
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_API_KEY` | Your Claude API key | Required |
| `CLAUDE_API_URL` | Claude API endpoint | `https://api.anthropic.com/v1/messages` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `MAX_REQUESTS_PER_IP` | Rate limit per IP | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `MAX_FREE_USAGE_PER_IP` | Free usage limit | `50` |
| `USAGE_RESET_INTERVAL_HOURS` | Usage reset interval | `24` |

## API Endpoints

### POST /api/analyze
Analyze tweets using Claude API.

**Request Body:**
```json
{
  "tweets": [
    {
      "author": "@username",
      "content": "Tweet content...",
      "timestamp": "2024-01-01T00:00:00Z",
      "url": "https://twitter.com/username/status/123"
    }
  ],
  "systemPrompt": "Optional custom system prompt"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": "Formatted analysis in markdown...",
  "usage": {
    "current": 1,
    "limit": 10,
    "remaining": 9
  },
  "processingTime": 1500
}
```

### GET /health
Health check endpoint.

### GET /usage/:clientKey?
Get usage statistics for a client.

## Deployment Options

### Railway
1. Fork this repository
2. Connect to Railway
3. Set environment variables
4. Deploy

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --env CLAUDE_API_KEY=your_key`

### Docker
```bash
docker build -t twitter-scanner-proxy .
docker run -p 3000:3000 -e CLAUDE_API_KEY=your_key twitter-scanner-proxy
```

### Heroku
```bash
heroku create your-app-name
heroku config:set CLAUDE_API_KEY=your_key
git push heroku main
```

## Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Usage Tracking**: Free tier limits per client
- **CORS Protection**: Only allows extension origins
- **Security Headers**: Helmet.js for additional security
- **Input Validation**: Validates all incoming requests
- **Error Handling**: Comprehensive error logging

## Monitoring

The server provides detailed logging for:
- Request/response cycles
- Claude API calls and retries
- Rate limiting events
- Usage tracking
- Error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.