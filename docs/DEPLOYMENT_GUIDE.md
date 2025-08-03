# Legacy.AI - Deployment Guide

## 🚀 Production Deployment Instructions

This guide covers deploying both the iOS and React web versions of Legacy.AI to production environments.

## 📱 iOS Application Deployment

### Prerequisites
- Xcode 15.0+
- Apple Developer Account ($99/year)
- iOS device for testing
- Supabase project configured

### 1. Xcode Project Setup
```bash
# Open the iOS project
cd /workspace/legacy-ai-ios
open LegacyAI.xcodeproj
```

### 2. Configure App Store Connect
1. **Create App Record**:
   - Log into App Store Connect
   - Create new app: "Legacy.AI"
   - Bundle ID: `com.legacyai.app`
   - Category: Lifestyle/Productivity

2. **App Information**:
   - Name: Legacy.AI
   - Subtitle: "Preserve Your Legacy"
   - Description: "Record video interviews to preserve your life stories, wisdom, and voice for future generations."
   - Keywords: legacy, interview, family, stories, AI, video

### 3. Build Configuration
```swift
// In Xcode, set these build settings:
// - Deployment Target: iOS 15.0
// - Bundle Identifier: com.legacyai.app
// - Version: 1.0.0
// - Build: 1
```

### 4. Environment Configuration
```swift
// Update Constants.swift with production values
struct Constants {
    static let supabaseURL = "YOUR_PRODUCTION_SUPABASE_URL"
    static let supabaseAnonKey = "YOUR_PRODUCTION_SUPABASE_ANON_KEY"
    static let apiBaseURL = "https://api.legacyai.com"
}
```

### 5. App Store Submission
1. Archive the app in Xcode
2. Upload to App Store Connect
3. Submit for review
4. Estimated review time: 1-7 days

## 🌐 React Web Application Deployment

### Option 1: Vercel Deployment (Recommended)

#### Prerequisites
- Vercel account (free tier available)
- GitHub repository
- Supabase project

#### Steps
1. **Push to GitHub**:
```bash
cd /workspace/legacy-ai-web
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/legacy-ai-web.git
git push -u origin main
```

2. **Deploy to Vercel**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project: No
# - Project name: legacy-ai-web
# - Directory: ./
# - Build command: npm run build
# - Output directory: dist
```

3. **Environment Variables**:
```bash
# Set in Vercel dashboard or CLI
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_BASE_URL
```

### Option 2: Netlify Deployment

#### Steps
1. **Build the project**:
```bash
cd /workspace/legacy-ai-web
npm run build
```

2. **Deploy to Netlify**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

3. **Configure Environment**:
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add Supabase credentials

### Option 3: AWS S3 + CloudFront

#### Steps
1. **Build for production**:
```bash
npm run build
```

2. **Upload to S3**:
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. **Configure CloudFront**:
   - Create distribution pointing to S3 bucket
   - Set up custom domain
   - Configure SSL certificate

## 🔧 Backend Infrastructure Setup

### Supabase Configuration

#### 1. Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  personality_profile JSONB,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Interview sessions
CREATE TABLE interview_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  module_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  video_url TEXT,
  transcript TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Personality test results
CREATE TABLE personality_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  responses JSONB NOT NULL,
  big_five_scores JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Storage Buckets
```sql
-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', false);

-- Set up RLS policies
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own videos" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
```

#### 3. API Functions
```sql
-- Function to process video uploads
CREATE OR REPLACE FUNCTION process_video_upload(
  p_user_id UUID,
  p_module_id TEXT,
  p_question_id TEXT,
  p_video_url TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO interview_sessions (user_id, module_id, question_id, video_url, metadata)
  VALUES (p_user_id, p_module_id, p_question_id, p_video_url, p_metadata)
  RETURNING id INTO session_id;
  
  -- Trigger background processing
  PERFORM pg_notify('video_processing', json_build_object(
    'session_id', session_id,
    'video_url', p_video_url
  )::text);
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql;
```

## 🔐 Security Configuration

### iOS Security
```swift
// Network Security Config
// Add to Info.plist for production
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacyai.com</key>
        <dict>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <false/>
        </dict>
    </dict>
</dict>
```

### React Security Headers
```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

## 📊 Performance Optimization

### iOS Optimizations
1. **Video Compression**:
   - Use H.264 encoding for compatibility
   - Implement adaptive bitrate based on network
   - Background upload with retry logic

2. **Memory Management**:
   - Proper video memory cleanup
   - Lazy loading of interview modules
   - Efficient CoreData queries

### React Optimizations
1. **Bundle Optimization**:
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  }
})
```

2. **Code Splitting**:
```typescript
// Lazy load components
const PersonalityTest = lazy(() => import('./components/PersonalityTest'));
const VideoRecorder = lazy(() => import('./components/VideoRecorder'));
```

## 🔍 Monitoring & Analytics

### Error Tracking
```typescript
// Add Sentry for error tracking
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV
});
```

### Performance Monitoring
```swift
// iOS: Add Firebase Analytics
import FirebaseAnalytics

Analytics.logEvent("video_recorded", parameters: [
  "module": moduleId,
  "question": questionId,
  "duration": videoDuration
])
```

## 🧪 Testing in Production

### iOS Testing Checklist
- [ ] TestFlight beta testing with 10+ users
- [ ] Video upload/download functionality
- [ ] Personality test calculations
- [ ] Background app behavior
- [ ] Memory usage under extended recording
- [ ] Network connectivity edge cases

### React Testing Checklist
- [ ] Cross-browser compatibility (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness on various devices
- [ ] Camera access on different browsers
- [ ] Upload progress and error handling
- [ ] Offline functionality
- [ ] Performance under load

## 📈 Launch Strategy

### Phase 1: Soft Launch (Week 1-2)
- Deploy to staging environments
- Internal team testing
- Fix critical bugs

### Phase 2: Beta Testing (Week 3-4)
- iOS TestFlight with 50 beta users
- React web app with limited access
- Collect user feedback

### Phase 3: Public Launch (Week 5+)
- App Store submission
- Public web app launch
- Marketing campaign
- User onboarding optimization

## 🔧 Maintenance & Updates

### Regular Tasks
1. **Weekly**:
   - Monitor error rates
   - Check upload success rates
   - Review user feedback

2. **Monthly**:
   - Update dependencies
   - Performance optimization
   - Feature usage analytics

3. **Quarterly**:
   - Major feature releases
   - iOS/React version updates
   - Security audits

## 📞 Support & Documentation

### User Support
- In-app help documentation
- Email support: support@legacyai.com
- FAQ section on website
- Video tutorials for complex features

### Developer Documentation
- API documentation with Swagger
- SDK documentation for integrations
- Deployment runbooks
- Troubleshooting guides

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Security headers implemented
- [ ] Performance optimized
- [ ] Error tracking enabled

### iOS Deployment
- [ ] App Store Connect configured
- [ ] Certificates and provisioning profiles
- [ ] App Store review guidelines compliance
- [ ] TestFlight beta testing completed

### React Deployment
- [ ] Build optimization verified
- [ ] CDN configuration
- [ ] Domain and SSL setup
- [ ] Environment variables secured
- [ ] Performance monitoring enabled

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check upload functionality
- [ ] Verify user registration flow
- [ ] Test personality questionnaire
- [ ] Validate video recording pipeline

---

**🎉 Both applications are ready for production deployment!**