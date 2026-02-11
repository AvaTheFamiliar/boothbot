# BoothBot

Multi-tenant Telegram bot SaaS for crypto conference lead capture. Projects bring their own bot token.

## Features

- 🤖 **Multi-tenant Bot Management** - Each project uses their own Telegram bot
- 📊 **Lead Capture** - Collect visitor contact info via conversational flow
- 📈 **Analytics Dashboard** - View stats, export leads, send broadcasts
- 🎫 **QR Code Generation** - Generate event-specific QR codes for easy access
- 💰 **Mock Billing** - Free tier: 7 days or 100 contacts per bot

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono, grammY
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vite + React
- **Language**: TypeScript (strict mode)

## Quick Start

### Prerequisites

- Bun installed
- Supabase account with project created
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))

### Installation

1. Clone and install dependencies:
```bash
bun install
cd web && bun install && cd ..
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Run database migrations:
```bash
# Execute the SQL in src/db/schema.sql in your Supabase SQL editor
```

4. Start development servers:
```bash
# Backend
bun run dev

# Frontend (in another terminal)
bun run web:dev
```

### Setting Up a Bot

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get the bot token
3. Register on BoothBot dashboard
4. Add your bot with the token
5. Create an event
6. Set webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook/<BOT_ID>"
```

## Project Structure

```
boothbot/
├── src/
│   ├── index.ts              # Main Hono server
│   ├── db/
│   │   ├── client.ts         # Supabase client
│   │   ├── schema.sql        # Database migrations
│   │   ├── schema.ts         # TypeScript types
│   │   └── repositories/     # Data access layer
│   ├── api/
│   │   ├── middleware/       # Auth, CORS
│   │   └── routes/           # API endpoints
│   ├── bot/
│   │   ├── handler.ts        # Bot instance factory
│   │   ├── manager.ts        # Multi-tenant bot manager
│   │   ├── flow/             # Conversation flows
│   │   ├── middleware.ts     # Bot middleware
│   │   └── keyboards.ts      # Inline keyboards
│   └── lib/
│       ├── auth.ts           # JWT & password hashing
│       ├── billing.ts        # Mock billing limits
│       ├── qr.ts             # QR code generation
│       └── validation.ts     # Zod schemas
└── web/                       # React dashboard
    └── src/
        ├── pages/            # Route pages
        ├── components/       # Reusable components
        └── lib/              # API client
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token

### Bots
- `POST /api/bots` - Create bot
- `GET /api/bots` - List bots
- `GET /api/bots/:id` - Get bot details
- `DELETE /api/bots/:id` - Delete bot

### Events
- `POST /api/events` - Create event
- `GET /api/events?botId=` - List events
- `GET /api/events/:id` - Get event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events/:id/qr` - Get QR code image

### Visitors
- `GET /api/events/:eventId/visitors` - List visitors
- `GET /api/events/:eventId/stats` - Get statistics
- `GET /api/events/:eventId/export` - Export CSV

### Broadcasts
- `POST /api/events/:eventId/broadcast` - Send message to all visitors

### Webhooks
- `POST /webhook/:botId` - Telegram webhook endpoint

## Bot Commands

### Visitor Flow
1. Scan QR code → `/start event_{eventId}`
2. Click "Register as Visitor"
3. Provide: Name → Email → Phone → Wallet Address → Notes
4. Confirm and save

### Admin Commands
- `/stats` - View event statistics
- `/export` - Get CSV export
- `/broadcast <message>` - Send message to all visitors

## Database Schema

### Tables
- `bb_tenants` - Account owners
- `bb_bots` - Telegram bot instances
- `bb_events` - Conference events
- `bb_visitors` - Captured leads
- `bb_broadcasts` - Broadcast history

## Deployment

### Build for Production
```bash
bun run build
cd web && bun run build
```

### Environment Variables
See `.env.example` for required variables.

### Webhook Setup
After deployment, set webhook for each bot:
```bash
https://api.telegram.org/bot{token}/setWebhook?url=https://yourdomain.com/webhook/{botId}
```

## Development

### Type Checking
```bash
bun run typecheck
```

### Code Style
- TypeScript strict mode
- No console.log in production
- Immutable data updates
- Zod validation at boundaries
- Repository pattern for data access

## License

MIT

## Support

For issues and feature requests, please create an issue in the repository.
