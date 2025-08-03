# Legacy.AI Backend Deployment Guide

This guide covers deploying the Legacy.AI backend to production environments.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Supabase project
- Redis instance
- Qdrant vector database

### Environment Setup

1. **Clone and setup**:
```bash
git clone <repository>
cd legacy-ai-backend
cp .env.example .env
```

2. **Configure environment variables**:
```bash
# Edit .env with your configuration
nano .env
```

3. **Install dependencies**:
```bash
npm install
```

4. **Deploy database schema**:
```bash
# If using Supabase CLI
supabase db push

# Or run the SQL migration manually in Supabase dashboard
```

## 🐳 Docker Deployment

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production
```bash
# Build and start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale the application
docker-compose up -d --scale app=3
```

## ☁️ Cloud Deployment Options

### 1. Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

**Railway Configuration**:
- Add all environment variables in Railway dashboard
- Enable Redis and PostgreSQL add-ons
- Set up custom domain

### 2. Render

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables
5. Add Redis and PostgreSQL services

### 3. AWS ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker build -t legacy-ai-backend .
docker tag legacy-ai-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/legacy-ai-backend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/legacy-ai-backend:latest
```

**ECS Task Definition**:
```json
{
  "family": "legacy-ai-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "legacy-ai-backend",
      "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/legacy-ai-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account>:secret:legacy-ai/supabase-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/legacy-ai-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 4. Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/legacy-ai-backend
gcloud run deploy --image gcr.io/PROJECT-ID/legacy-ai-backend --platform managed
```

## 🗄️ Database Setup

### Supabase Configuration

1. **Create project** at [supabase.com](https://supabase.com)

2. **Run migrations**:
```sql
-- Copy and paste the content from supabase/migrations/001_initial_schema.sql
-- into the Supabase SQL editor
```

3. **Configure RLS policies** (already included in migration)

4. **Set up storage buckets**:
   - `videos` - for video files
   - `voice-samples` - for audio samples
   - `thumbnails` - for video thumbnails
   - `voice-responses` - for generated speech

5. **Configure authentication**:
   - Enable email/password auth
   - Configure OAuth providers (optional)
   - Set up email templates

### Qdrant Setup

#### Self-hosted
```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant

# Using Docker Compose (included in docker-compose.yml)
docker-compose up qdrant
```

#### Qdrant Cloud
1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create cluster
3. Get API key and URL
4. Update `QDRANT_URL` and `QDRANT_API_KEY` in .env

## 🔧 Configuration

### Required Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Redis
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
DEEPGRAM_API_KEY=your-deepgram-key

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-key

# Server
PORT=3000
NODE_ENV=production
JWT_SECRET=your-jwt-secret

# File Limits
MAX_FILE_SIZE=500MB
MAX_VIDEO_DURATION=600

# Processing
VOICE_SAMPLE_MIN_DURATION=10
VOICE_SAMPLE_MAX_DURATION=30
MIN_VOICE_TRAINING_MINUTES=5
```

### Optional Configuration

```bash
# External Services
RESPEECHER_API_KEY=your-respeecher-key
COQUI_API_KEY=your-coqui-key

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Temporary Directory
TEMP_DIR=/tmp
```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL certificate**:
```bash
# Using Let's Encrypt
certbot certonly --standalone -d api.legacyai.com
```

2. **Configure Nginx** (nginx.conf):
```nginx
server {
    listen 443 ssl http2;
    server_name api.legacyai.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### API Security

- All endpoints require authentication
- Rate limiting enabled
- CORS configured for specific origins
- Input validation on all routes
- SQL injection protection via parameterized queries

## 📊 Monitoring & Logging

### Health Checks

The application provides several health check endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `GET /health/db` - Database connectivity
- `GET /health/redis` - Redis connectivity
- `GET /health/qdrant` - Qdrant connectivity

### Logging

Logs are written to:
- `logs/app.log` - Application logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Monitoring Setup

#### Prometheus Metrics (Optional)

```bash
# Add to package.json
npm install prom-client

# Add metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

#### Log Aggregation

```bash
# Using ELK Stack
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" elasticsearch:7.14.0
docker run -d --name logstash -p 5000:5000 logstash:7.14.0
docker run -d --name kibana -p 5601:5601 kibana:7.14.0
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check Supabase URL and keys
   curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" $SUPABASE_URL/rest/v1/
   ```

2. **Redis Connection Failed**
   ```bash
   # Test Redis connection
   redis-cli ping
   ```

3. **Qdrant Connection Failed**
   ```bash
   # Test Qdrant connection
   curl http://localhost:6333/collections
   ```

4. **File Upload Issues**
   ```bash
   # Check disk space
   df -h
   
   # Check file permissions
   ls -la /tmp
   ```

5. **Memory Issues**
   ```bash
   # Monitor memory usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Run with debug output
npm run dev
```

### Performance Optimization

1. **Database Optimization**:
   - Enable connection pooling
   - Add database indexes
   - Use read replicas for queries

2. **Caching**:
   - Redis for session storage
   - CDN for static assets
   - Application-level caching

3. **Scaling**:
   - Horizontal scaling with load balancer
   - Separate job processing workers
   - Database sharding for large datasets

## 📋 Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificates obtained
- [ ] Firewall rules configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Deployment

- [ ] Application deployed
- [ ] Health checks passing
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Qdrant connectivity verified
- [ ] File upload/download working
- [ ] AI services responding

### Post-deployment

- [ ] Load testing completed
- [ ] Monitoring alerts configured
- [ ] Backup verification
- [ ] Documentation updated
- [ ] Team notified

## 🔄 Updates & Maintenance

### Rolling Updates

```bash
# Zero-downtime deployment
docker-compose up -d --scale app=2
docker-compose up -d --no-deps app
docker-compose up -d --scale app=1
```

### Database Migrations

```bash
# Create new migration
supabase migration new add_new_feature

# Apply migration
supabase db push
```

### Backup Strategy

```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Qdrant backup
curl -X POST "http://localhost:6333/collections/legacy_memories/snapshots"

# File storage backup (if using local storage)
tar -czf storage_backup_$(date +%Y%m%d).tar.gz /path/to/storage
```

---

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f app`
2. Verify configuration: `npm run config:check`
3. Test connectivity: `npm run health:check`
4. Contact support: support@legacyai.com