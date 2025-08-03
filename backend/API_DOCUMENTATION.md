# Legacy.AI Backend API Documentation

Complete API reference for the Legacy.AI backend system.

## 🔗 Base URL

```
Production: https://api.legacyai.com
Development: http://localhost:3000
```

## 🔐 Authentication

All API endpoints (except health checks) require authentication using Bearer tokens.

```http
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

Tokens are obtained through Supabase authentication:

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session?.access_token;
```

## 📋 API Endpoints

### Health Check

#### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## 👤 User Management

### GET /api/user/profile
Get user profile and statistics.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00.000Z",
    "subscription_tier": "premium",
    "total_recording_minutes": 120,
    "settings": {}
  },
  "personality_profile": {
    "extraversion": 0.75,
    "agreeableness": 0.85,
    "conscientiousness": 0.92,
    "neuroticism": 0.21,
    "openness": 0.77,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "statistics": {
    "total_videos": 25,
    "approved_videos": 20,
    "pending_videos": 3,
    "total_duration": 7200
  },
  "voice_model": {
    "status": "ready",
    "is_ready": true,
    "quality_score": 0.89
  }
}
```

### PUT /api/user/profile
Update user profile.

**Request Body:**
```json
{
  "name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "settings": {
    "notifications": true,
    "privacy_mode": false
  }
}
```

### POST /api/user/personality
Save personality profile from Mini-IPIP test.

**Request Body:**
```json
{
  "responses": [4, 2, 5, 1, 3, 2, 4, 5, 2, 3, 4, 1, 5, 2, 3, 4, 2, 5, 1, 4],
  "extraversion": 0.75,
  "agreeableness": 0.85,
  "conscientiousness": 0.92,
  "neuroticism": 0.21,
  "openness": 0.77
}
```

### POST /api/user/session
Create new interview session.

**Request Body:**
```json
{
  "package_type": "premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interview session created successfully",
  "session": {
    "id": "uuid",
    "package_type": "premium",
    "total_questions": 300,
    "completed_questions": 0,
    "started_at": "2024-01-15T10:30:00.000Z",
    "status": "active"
  }
}
```

---

## 📹 Video Management

### POST /api/upload/video
Upload and process video interview.

**Request:**
- Content-Type: `multipart/form-data`
- File field: `video`

**Form Data:**
```json
{
  "questionId": "uuid",
  "sessionId": "uuid",
  "metadata": {
    "duration": 120,
    "resolution": "1080p",
    "deviceInfo": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "videoId": "uuid",
  "message": "Video uploaded successfully and queued for processing",
  "processingStatus": "pending"
}
```

### GET /api/upload/status/:videoId
Check video processing status.

**Response:**
```json
{
  "videoId": "uuid",
  "status": "completed",
  "duration": 120,
  "thumbnailUrl": "https://...",
  "uploadedAt": "2024-01-15T10:30:00.000Z",
  "transcript": {
    "id": "uuid",
    "text": "This is the transcribed text...",
    "confidence_score": 0.95,
    "language": "en"
  },
  "memory": {
    "id": "uuid",
    "content_summary": "Brief summary of the content...",
    "sentiment": 0.8,
    "topics": ["family", "childhood", "memories"]
  }
}
```

### POST /api/upload/approve/:videoId
Approve video for final processing.

**Response:**
```json
{
  "success": true,
  "message": "Video approved successfully",
  "videoId": "uuid",
  "approvedAt": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/video
Get user's videos with filtering and pagination.

**Query Parameters:**
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset (default: 0)
- `status` (string): Filter by processing status
- `approved` (boolean): Filter by approval status
- `session_id` (uuid): Filter by session

**Response:**
```json
{
  "videos": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "question_id": "uuid",
      "thumbnail_url": "https://...",
      "duration": 120,
      "processing_status": "completed",
      "approved_at": "2024-01-15T10:30:00.000Z",
      "questions": {
        "module": "family",
        "text": "Tell me about your parents...",
        "tags": ["family", "parents"]
      },
      "transcripts": [
        {
          "text": "My parents were...",
          "confidence_score": 0.95
        }
      ]
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45,
    "has_more": true
  }
}
```

### GET /api/video/:videoId/download
Get signed URL for video download.

**Response:**
```json
{
  "download_url": "https://signed-url...",
  "expires_at": "2024-01-15T11:30:00.000Z"
}
```

---

## 🤖 AI Persona & Conversations

### POST /api/persona/query
Main conversational AI endpoint.

**Request Body:**
```json
{
  "query": "What did you believe about love?",
  "persona_settings": {
    "voice": true,
    "personality": {
      "extraversion": 0.75,
      "agreeableness": 0.85,
      "conscientiousness": 0.92,
      "neuroticism": 0.21,
      "openness": 0.77
    },
    "response_length": "moderate",
    "include_memories": true,
    "memory_limit": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Love, to me, was always about...",
  "voice_response_url": "https://signed-url-to-audio...",
  "metadata": {
    "memories_used": 5,
    "personality_influence": {
      "tone": "enthusiastic",
      "detail_level": "detailed",
      "emotional_expression": "confident"
    },
    "processing_time_ms": 2500,
    "conversation_id": "uuid"
  },
  "memories_context": [
    {
      "summary": "Discussion about first love...",
      "topics": ["love", "relationships", "youth"],
      "sentiment": 0.8,
      "relevance_score": 0.92
    }
  ]
}
```

### GET /api/persona/voice-status
Check voice model status and training progress.

**Response:**
```json
{
  "voice_model": {
    "id": "uuid",
    "status": "ready",
    "engine": "elevenlabs",
    "is_ready": true,
    "quality_score": 0.89,
    "training_started_at": "2024-01-15T09:00:00.000Z",
    "training_completed_at": "2024-01-15T09:15:00.000Z"
  },
  "voice_samples": {
    "total_count": 25,
    "suitable_count": 20,
    "total_minutes": 12.5,
    "average_quality": 0.85,
    "min_required_minutes": 5,
    "ready_for_training": true
  },
  "can_generate_voice": true
}
```

### POST /api/persona/retrain-voice
Trigger voice model retraining.

**Response:**
```json
{
  "success": true,
  "message": "Voice model retraining started",
  "estimated_completion_time": "10-30 minutes"
}
```

---

## 🧠 Memory & Search

### GET /api/memory
Get user's processed memories.

**Query Parameters:**
- `limit` (number): Results per page
- `offset` (number): Pagination offset
- `topic` (string): Filter by topic
- `sentiment_min` (number): Minimum sentiment (-1 to 1)
- `sentiment_max` (number): Maximum sentiment (-1 to 1)

**Response:**
```json
{
  "memories": [
    {
      "id": "uuid",
      "content_summary": "Discussion about childhood...",
      "sentiment": 0.8,
      "emotion_scores": {
        "joy": 0.7,
        "sadness": 0.1,
        "anger": 0.05
      },
      "topics": ["childhood", "family", "happiness"],
      "tags": ["personal", "formative"],
      "importance_score": 0.9,
      "created_at": "2024-01-15T10:30:00.000Z",
      "questions": {
        "module": "origins",
        "text": "What are your earliest memories?"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}
```

### POST /api/memory/search
Semantic search through memories.

**Request Body:**
```json
{
  "query": "childhood happiness",
  "limit": 10,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "query": "childhood happiness",
  "results": [
    {
      "id": "uuid",
      "content_summary": "Memories of playing in the garden...",
      "sentiment": 0.9,
      "topics": ["childhood", "play", "garden"],
      "relevance_score": 0.95,
      "highlighted_content": "I remember the <mark>happiness</mark> of my <mark>childhood</mark>..."
    }
  ],
  "total_results": 8,
  "search_threshold": 0.7
}
```

### PUT /api/memory/:memoryId/importance
Update memory importance score.

**Request Body:**
```json
{
  "importance_score": 0.95
}
```

---

## 🎤 Voice & Speech

### GET /api/voice/models
Get user's voice models.

**Response:**
```json
{
  "voice_models": [
    {
      "id": "uuid",
      "engine_name": "elevenlabs",
      "status": "ready",
      "is_ready": true,
      "quality_score": 0.89,
      "minutes_collected": 12.5,
      "created_at": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

### POST /api/voice/generate
Generate speech from text using user's voice model.

**Request Body:**
```json
{
  "text": "Hello, this is a test of my voice clone.",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Speech generated successfully",
  "audio_url": "https://signed-url-to-audio...",
  "expires_at": "2024-01-15T11:30:00.000Z",
  "text_length": 42,
  "voice_model": {
    "engine": "elevenlabs",
    "quality_score": 0.89
  }
}
```

### POST /api/voice/train
Start voice model training.

**Request Body:**
```json
{
  "engine": "elevenlabs"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Voice training started",
  "voice_model": {
    "id": "uuid",
    "engine": "elevenlabs",
    "status": "training",
    "minutes_collected": 12.5
  },
  "estimated_completion_time": "10-30 minutes"
}
```

---

## 📝 Transcripts

### GET /api/transcript
Get user's transcripts with search.

**Query Parameters:**
- `limit` (number): Results per page
- `offset` (number): Pagination offset
- `search` (string): Full-text search query

**Response:**
```json
{
  "transcripts": [
    {
      "id": "uuid",
      "video_id": "uuid",
      "text": "This is the full transcript...",
      "language": "en",
      "confidence_score": 0.95,
      "created_at": "2024-01-15T10:30:00.000Z",
      "videos": {
        "duration": 120,
        "thumbnail_url": "https://...",
        "questions": {
          "module": "family",
          "text": "Tell me about your parents..."
        }
      }
    }
  ]
}
```

### PUT /api/transcript/:transcriptId
Update transcript text (manual correction).

**Request Body:**
```json
{
  "text": "Corrected transcript text..."
}
```

### POST /api/transcript/:transcriptId/regenerate
Regenerate transcript using AI.

**Response:**
```json
{
  "success": true,
  "message": "Transcript regeneration started",
  "transcript_id": "uuid",
  "estimated_completion_time": "2-5 minutes"
}
```

---

## 📊 Statistics & Analytics

### GET /api/video/statistics/overview
Get video statistics overview.

**Response:**
```json
{
  "videos": {
    "total": 45,
    "approved": 40,
    "pending": 3,
    "processing": 1,
    "completed": 41,
    "failed": 1,
    "total_duration": 5400
  },
  "sessions": {
    "total": 2,
    "active": 1,
    "completed": 1,
    "total_progress": 45,
    "total_questions": 100
  },
  "overall_progress": 45.0
}
```

### GET /api/memory/statistics
Get memory and content analysis statistics.

**Response:**
```json
{
  "total_memories": 40,
  "average_sentiment": 0.65,
  "emotion_distribution": {
    "joy": 0.4,
    "sadness": 0.15,
    "anger": 0.05,
    "fear": 0.1,
    "surprise": 0.2,
    "disgust": 0.1
  },
  "top_topics": [
    { "topic": "family", "count": 15 },
    { "topic": "childhood", "count": 12 },
    { "topic": "work", "count": 8 }
  ],
  "importance_distribution": {
    "low": 10,
    "medium": 20,
    "high": 10
  }
}
```

---

## ❌ Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/endpoint",
  "method": "POST"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Rate Limiting

API endpoints are rate limited:

- **General endpoints**: 100 requests per 15 minutes
- **Upload endpoints**: 50 requests per hour
- **AI query endpoints**: 10 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

---

## 🔧 Development & Testing

### Testing Endpoints

Use the health check endpoints to verify system status:

```bash
# Basic health check
curl http://localhost:3000/health

# Test authentication
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/user/profile

# Test file upload
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test-video.mp4" \
  -F "questionId=uuid" \
  -F "sessionId=uuid" \
  http://localhost:3000/api/upload/video
```

### Webhook Events

The system can send webhook notifications for:

- Video processing completion
- Voice model training completion
- Transcript generation completion
- Memory indexing completion

Configure webhook URL in environment variables:
```bash
WEBHOOK_URL=https://your-app.com/webhooks/legacy-ai
WEBHOOK_SECRET=your-webhook-secret
```

---

## 📚 SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Authenticate
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = authData.session?.access_token;

// Upload video
const formData = new FormData();
formData.append('video', videoFile);
formData.append('questionId', questionId);
formData.append('sessionId', sessionId);

const response = await fetch('https://api.legacyai.com/api/upload/video', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Query AI persona
const aiResponse = await fetch('https://api.legacyai.com/api/persona/query', {
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

### Python

```python
import requests
import json

# Authenticate with Supabase
auth_response = requests.post(
    'https://your-project.supabase.co/auth/v1/token?grant_type=password',
    json={
        'email': 'user@example.com',
        'password': 'password'
    },
    headers={'apikey': 'your-anon-key'}
)

token = auth_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Upload video
with open('video.mp4', 'rb') as video_file:
    files = {'video': video_file}
    data = {
        'questionId': 'uuid',
        'sessionId': 'uuid'
    }
    
    response = requests.post(
        'https://api.legacyai.com/api/upload/video',
        headers=headers,
        files=files,
        data=data
    )

# Query AI persona
ai_response = requests.post(
    'https://api.legacyai.com/api/persona/query',
    headers={**headers, 'Content-Type': 'application/json'},
    json={
        'query': 'What was your favorite childhood memory?',
        'persona_settings': {
            'voice': False,
            'personality': personality_profile,
            'include_memories': True
        }
    }
)
```

---

This API documentation covers all major endpoints and functionality of the Legacy.AI backend system. For additional support or questions, please contact the development team.