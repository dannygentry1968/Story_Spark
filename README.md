# StorySpark v3

**From Idea to Income** — AI-powered children's book creation for Amazon KDP.

## Overview

StorySpark is a comprehensive platform for creating, managing, and publishing children's books on Amazon KDP. It leverages AI for story generation and illustration, with a focus on producing profitable, high-quality books efficiently.

## Features

- **📚 Multiple Book Types**: Picture books, board books, early readers, activity books, coloring books
- **🔍 Niche Research**: Discover profitable niches and trends
- **✍️ AI Story Generation**: Claude-powered content creation
- **🎨 Consistent Illustrations**: Character reference system for visual coherence
- **📖 Series Management**: Group books and maintain character consistency
- **🏷️ Listing Optimization**: Generate keywords, descriptions, categories
- **📤 KDP Export**: Print-ready PDF generation with proper specs
- **📈 Performance Tracking**: Log published books and track results

## Tech Stack

- **Framework**: SvelteKit
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS
- **AI Text**: Anthropic Claude API
- **AI Images**: OpenAI gpt-image-1
- **PDF**: PDFKit
- **Deployment**: Docker

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Production (Docker)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the deployment script
./deploy.sh
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for text generation |
| `OPENAI_API_KEY` | OpenAI API key for image generation |
| `DATABASE_URL` | SQLite database path (default: `file:./data/storyspark.db`) |
| `STORAGE_PATH` | Path for image storage (default: `./data/storage`) |

## Project Structure

```
storyspark-v3/
├── src/
│   ├── lib/
│   │   ├── components/    # Reusable UI components
│   │   ├── db/            # Database schema and connection
│   │   ├── services/      # AI and export services
│   │   ├── stores/        # Svelte stores
│   │   └── types/         # TypeScript types
│   └── routes/
│       ├── api/           # API endpoints
│       ├── books/         # Book management
│       ├── characters/    # Character bible
│       ├── niche/         # Niche research
│       ├── series/        # Series management
│       └── listing/       # KDP listings
├── data/                  # Database and storage (gitignored)
├── drizzle/               # Database migrations
├── static/                # Static assets
├── Dockerfile
├── docker-compose.yml
└── deploy.sh
```

## The Profit Pipeline

1. **Discover** — Research niches and trends
2. **Plan** — Define concept and structure
3. **Create** — Generate story content
4. **Illustrate** — Create consistent visuals
5. **Polish** — Edit and refine
6. **Export** — Generate KDP-ready PDF
7. **Listing** — Optimize for discoverability
8. **Track** — Monitor performance

## License

Private — All rights reserved.
