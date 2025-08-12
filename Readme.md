# Legacy.AI Platform

🤖 **Complete AI-powered platform for preserving life stories and creating conversational AI avatars**

**Preserve the person. Continue the conversation.**

Transform personal video interviews into interactive AI companions through advanced video processing, transcription, voice cloning, and conversational AI.

## 🌟 Platform Overview

Legacy.AI is a comprehensive platform that allows people to record video interviews about their life stories, which are then processed using AI to create personalized conversational avatars. The platform includes:

- **iOS Native App**: SwiftUI-based mobile application for video recording
- **Web Application**: React-based responsive web interface  
- **AI Backend**: Node.js/TypeScript backend with advanced AI processing
- **Voice Cloning**: Personalized voice model generation
- **Conversational AI**: Personality-driven chat interface using user's memories

## 📁 Repository Structure

```
legacy-ai-platform/
├── ios-app/              # Native iOS application (SwiftUI)
├── web-app/              # React web application (TypeScript)
├── backend/              # Node.js/TypeScript API server
├── docs/                 # Comprehensive documentation
├── data/                 # Interview questions and test data
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites
- **iOS Development**: Xcode 14+, iOS 15+
- **Web Development**: Node.js 18+, npm/yarn
- **Backend**: Docker, Supabase account, OpenAI API key

### 1. iOS App Setup
```bash
cd ios-app/
# Open LegacyAI.xcodeproj in Xcode
# Configure Supabase credentials in Config.swift
# Build and run on iOS device/simulator
```

### 2. Web App Setup
```bash
cd web-app/
npm install
npm run dev
# Open http://localhost:5173
```

### 3. Backend Setup
```bash
cd backend/
npm install
cp .env.example .env
# Configure environment variables
docker-compose up -d
npm run dev
```

## 🎯 Core Features

### Interview Recording System
- **Structured Questions**: 100 curated questions across 10 life modules
- **Video Recording**: High-quality front-camera recording with review workflow
- **Progress Tracking**: Save and resume interview sessions
- **Cloud Upload**: Automatic upload to secure cloud storage

### AI Processing Pipeline
- **Transcription**: Automatic speech-to-text using OpenAI Whisper
- **Voice Cloning**: Personalized voice model training with ElevenLabs
- **Semantic Search**: Vector-based memory retrieval using Qdrant
- **Personality Analysis**: Big Five personality assessment integration

### Conversational AI Avatar
- **Memory Integration**: AI responses based on recorded stories
- **Personality-Driven**: Responses adapted to user's personality profile
- **Voice Synthesis**: Generated responses in user's cloned voice
- **Context Awareness**: Maintains conversation context and emotional tone

## 🏗️ Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   iOS App       │    │   Web App       │    │   Backend API   │
│   (SwiftUI)     │◄──►│   (React/TS)    │◄──►│   (Node.js/TS)  │
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
                    │ (OpenAI, etc)   │
                    └─────────────────┘
```

### Technology Stack
- **Frontend**: SwiftUI (iOS), React + TypeScript (Web)
- **Backend**: Node.js + TypeScript + Express
- **Database**: Supabase (PostgreSQL with RLS)
- **Vector DB**: Qdrant for semantic search
- **AI Services**: OpenAI GPT-4, Whisper, Embeddings
- **Voice Cloning**: ElevenLabs, Respeecher
- **Job Processing**: Redis + Bull for background tasks
- **Deployment**: Docker, Docker Compose

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[API Documentation](backend/API_DOCUMENTATION.md)** - Complete API reference
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment
- **[Testing Summary](docs/TESTING_SUMMARY.md)** - Testing procedures and results
- **[Project Summary](docs/PROJECT_SUMMARY.md)** - Complete feature overview

## 🧪 Testing & Validation

### Comprehensive Testing Completed
- ✅ **iOS App**: Native functionality, video recording, data persistence
- ✅ **Web App**: Cross-browser compatibility, responsive design, camera integration
- ✅ **Backend**: API endpoints, database operations, AI service integration
- ✅ **End-to-End**: Complete user journey from registration to AI conversation

## 🚀 Deployment

### Production-Ready Features
- **Docker Containerization**: Full docker-compose setup
- **Cloud Deployment**: Railway, Render, AWS, GCP ready
- **Security**: JWT authentication, rate limiting, input validation
- **Monitoring**: Health checks, logging, error tracking
- **Scaling**: Horizontal scaling support with load balancing

### Deployment Options
- **iOS**: App Store deployment (requires Apple Developer account)
- **Web**: Vercel, Netlify, or any static hosting
- **Backend**: Railway, Render, AWS ECS, Google Cloud Run

## 🎯 Business Value

### For Users
- **Preserve Legacy**: Record and preserve life stories for future generations
- **AI Companion**: Create interactive AI avatar for family members
- **Easy Recording**: Intuitive interface with guided questions
- **Secure Storage**: Enterprise-grade security and privacy protection

### For Developers
- **Modern Stack**: Latest technologies and best practices
- **Scalable Architecture**: Handles growth from startup to enterprise
- **Comprehensive Documentation**: Complete setup and deployment guides
- **Production Ready**: Full error handling, monitoring, and security

## 📊 Project Statistics

- **iOS**: 20+ Swift files, 3,000+ lines of code
- **Web**: 8 React components, 2,000+ lines of TypeScript
- **Backend**: 25+ TypeScript files, 5,000+ lines of code
- **Database**: 9 tables with comprehensive schema
- **Documentation**: 200+ pages of guides and references
- **Questions**: 100 curated interview questions across 10 modules

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: Complete guides in `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/christophbertsch/legacy-ai-ios/issues)
- **Email**: support@legacyai.com

---

**🚀 Ready to preserve human stories and create meaningful AI avatars for future generations!**

*Built with ❤️ using modern technologies and AI*
