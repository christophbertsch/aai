# Legacy.AI Backend

🤖 **AI-powered backend for Legacy.AI video interview platform**

Transform personal stories into interactive AI avatars through advanced video processing, transcription, voice cloning, and conversational AI.

## 🌟 Features

### Core Functionality
- **Video Processing**: Upload, process, and analyze video interviews
- **AI Transcription**: Automatic speech-to-text using OpenAI Whisper
- **Voice Cloning**: Create personalized voice models with ElevenLabs/Respeecher
- **Semantic Search**: Vector-based memory search using Qdrant
- **Conversational AI**: Personality-driven responses using GPT-4
- **Memory Indexing**: Automatic content analysis and topic extraction

### Technical Features
- **Scalable Architecture**: Built with Node.js, TypeScript, and Express
- **Real-time Processing**: Background job processing with Redis/Bull
- **Secure Storage**: Supabase integration with RLS policies
- **Rate Limiting**: Comprehensive API protection
- **Health Monitoring**: Built-in health checks and logging
- **Docker Support**: Full containerization with Docker Compose

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (iOS/Web)     │◄──►│   (Express)     │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Redis Queue   │    │   Qdrant        │
│   (Database)    │    │   (Jobs)        │    │   (Vectors)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │   AI Services   │
                    │   (OpenAI, etc) │
                    └─────────────────┘
```

### Architecture Components
- **Database**: Supabase (PostgreSQL with RLS)
- **Vector Storage**: Qdrant for semantic memory
- **Transcription**: OpenAI Whisper / Deepgram
- **Voice Cloning**: ElevenLabs / Respeecher
- **Conversational AI**: GPT-4 with personality modeling
- **Job Processing**: Redis + Bull for background tasks
- **File Storage**: Supabase Storage for videos/audio

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase account
- OpenAI API key
- ElevenLabs API key (optional)

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd legacy-ai-backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start services**:
```bash
# Start with Docker Compose
docker-compose up -d

# Or start locally
npm run dev
```

5. **Verify installation**:
```bash
curl http://localhost:3000/health
```

## 📁 Project Structure

```
legacy-ai-backend/
├── src/
│   ├── routes/           # API route handlers
│   │   ├── upload.ts     # Video upload & processing
│   │   ├── persona.ts    # AI conversation endpoints
│   │   ├── user.ts       # User management
│   │   ├── video.ts      # Video management
│   │   ├── transcript.ts # Transcript operations
│   │   ├── memory.ts     # Memory search & management
│   │   └── voice.ts      # Voice cloning & generation
│   ├── services/         # Business logic services
│   │   ├── supabase.ts   # Database client
│   │   ├── qdrant.ts     # Vector database
│   │   ├── openai.ts     # AI services
│   │   ├── voiceCloning.ts # Voice cloning
│   │   ├── videoProcessor.ts # Video processing
│   │   └── jobProcessor.ts # Background jobs
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # Authentication
│   │   ├── validation.ts # Request validation
│   │   ├── errorHandler.ts # Error handling
│   │   └── rateLimiter.ts # Rate limiting
│   ├── utils/           # Utility functions
│   │   └── logger.ts    # Logging configuration
│   └── index.ts         # Application entry point
├── supabase/
│   └── migrations/      # Database migrations
├── docker-compose.yml   # Docker services
├── Dockerfile          # Container configuration
└── package.json        # Dependencies & scripts
```

## 🔧 Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-key

# Job Queue
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-jwt-secret
```

### Database Setup

1. **Create Supabase project** at [supabase.com](https://supabase.com)

2. **Run database migrations**:
```bash
# Using Supabase CLI
supabase db push

# Or copy SQL from supabase/migrations/ to Supabase dashboard
```

3. **Configure storage buckets**:
   - `videos` - Video files
   - `voice-samples` - Audio samples
   - `thumbnails` - Video thumbnails
   - `voice-responses` - Generated speech

## 🎯 API Usage

### Authentication

All API endpoints require authentication:

```javascript
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Video Upload

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('questionId', questionId);
formData.append('sessionId', sessionId);

const response = await fetch('/api/upload/video', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### AI Conversation

```javascript
const response = await fetch('/api/persona/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Tell me about your childhood',
    persona_settings: {
      voice: true,
      personality: personalityProfile,
      include_memories: true
    }
  })
});
```

## 🚀 Deployment

### Docker Deployment

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale app=3
```

### Cloud Platforms

- **Railway**: One-click deployment
- **Render**: Automatic deployments from Git
- **AWS ECS**: Enterprise container deployment
- **Google Cloud Run**: Serverless container platform

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📚 Documentation

- [API Documentation](API_DOCUMENTATION.md) - Complete API reference
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Database Schema](supabase/migrations/) - Database structure

## 📞 Support

- **Documentation**: [API Docs](API_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@legacyai.com

---

**Built with ❤️ for preserving human stories and wisdom**