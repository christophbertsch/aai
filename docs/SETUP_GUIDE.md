# Legacy.AI iOS App - Complete Setup Guide

This guide provides comprehensive instructions for setting up and running the Legacy.AI iOS application.

## 🏗️ Project Structure

```
LegacyAI/
├── LegacyAIApp.swift              # Main app entry point
├── Models/                        # Data models
│   ├── User.swift                 # User and personality profile models
│   ├── Question.swift             # Interview questions and modules
│   └── Session.swift              # Interview session management
├── Views/                         # SwiftUI views
│   ├── Onboarding/
│   │   ├── OnboardingView.swift   # Multi-page onboarding
│   │   └── AuthenticationView.swift # Sign up/in flow
│   ├── PersonalityTest/
│   │   └── PersonalityTestView.swift # Mini-IPIP questionnaire
│   ├── Interview/
│   │   ├── InterviewHomeView.swift    # Interview dashboard
│   │   ├── InterviewQuestionView.swift # Recording interface
│   │   └── CameraPreviewView.swift    # Camera preview component
│   ├── Library/
│   │   └── LibraryView.swift      # Video library and search
│   └── Settings/
│       └── SettingsView.swift     # App settings and preferences
├── ViewModels/                    # Business logic
│   ├── AppViewModel.swift         # Main app state management
│   └── RecordingViewModel.swift   # Camera and recording logic
├── Services/                      # External services
│   ├── APIService.swift           # Supabase API integration
│   ├── UploadManager.swift        # Background upload handling
│   └── LocalStorageService.swift  # Local data persistence
├── Utilities/                     # Helper functions
│   ├── Extensions.swift           # Swift extensions
│   └── Constants.swift            # App constants and configuration
└── Resources/
    └── legacy_ai_first_100_questions.json # Interview questions
```

## 🔧 Setup Instructions

### 1. Prerequisites
- macOS 13.0+ (Ventura)
- Xcode 14.0+
- iOS 15.0+ target device or simulator
- Active Apple Developer account (for device testing)
- Supabase account (free tier available)

### 2. Clone and Setup Project
```bash
# Clone the repository
git clone https://github.com/your-username/legacy-ai-ios.git
cd legacy-ai-ios

# Create Xcode project file (if needed)
# The project structure is already set up in the LegacyAI folder
```

### 3. Configure Supabase Backend

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

#### Update API Configuration
Edit `LegacyAI/Services/APIService.swift`:
```swift
private let baseURL = "https://your-project-id.supabase.co"
private let apiKey = "your-anon-key-here"
```

#### Database Schema Setup
Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Personality profiles table
CREATE TABLE personality_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    extraversion DECIMAL NOT NULL,
    agreeableness DECIMAL NOT NULL,
    conscientiousness DECIMAL NOT NULL,
    neuroticism DECIMAL NOT NULL,
    openness DECIMAL NOT NULL,
    responses INTEGER[] NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video recordings table
CREATE TABLE video_recordings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    module TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    cloud_url TEXT NOT NULL,
    duration DECIMAL NOT NULL,
    file_size BIGINT NOT NULL,
    transcript TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('legacy-videos', 'legacy-videos', false);

-- Enable Row Level Security
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personality_profiles
CREATE POLICY "Users can insert their own personality profile" ON personality_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own personality profile" ON personality_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own personality profile" ON personality_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for video_recordings
CREATE POLICY "Users can insert their own video recordings" ON video_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own video recordings" ON video_recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own video recordings" ON video_recordings
    FOR UPDATE USING (auth.uid() = user_id);

-- Storage policies for legacy-videos bucket
CREATE POLICY "Users can upload their own videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'legacy-videos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own videos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'legacy-videos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own videos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'legacy-videos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own videos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'legacy-videos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );
```

### 4. Xcode Project Setup

#### Create Xcode Project
1. Open Xcode
2. Create new iOS App project
3. Name: "LegacyAI"
4. Bundle Identifier: "com.yourcompany.legacyai"
5. Language: Swift
6. Interface: SwiftUI
7. Use Core Data: No

#### Add Files to Project
1. Delete the default ContentView.swift and other generated files
2. Add all files from the LegacyAI folder to your Xcode project
3. Ensure all Swift files are added to the target
4. Add the JSON file to the bundle resources

#### Configure Info.plist
Replace your Info.plist with the provided one, or add these key permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>Legacy.AI needs camera access to record your video interviews and preserve your stories for future generations.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Legacy.AI needs microphone access to record audio for your video interviews and create your AI voice clone.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Legacy.AI may access your photo library to save recorded videos locally for backup purposes.</string>

<key>UIBackgroundModes</key>
<array>
    <string>background-processing</string>
    <string>background-fetch</string>
</array>
```

### 5. Build and Run

#### First Build
1. Select your development team in project settings
2. Choose a unique bundle identifier
3. Select target device or simulator (iOS 15.0+)
4. Build and run (⌘+R)

#### Testing on Device
1. Connect iOS device via USB
2. Trust the developer certificate on device
3. Enable Developer Mode in Settings > Privacy & Security
4. Build and run on device for camera functionality

## 🎯 Key Features Implemented

### 1. Onboarding Flow
- Multi-page introduction with smooth animations
- User authentication (sign up/sign in/guest mode)
- Personality test integration

### 2. Personality Assessment
- 20-question Mini-IPIP questionnaire
- Big Five personality trait calculation
- Results visualization and storage

### 3. Video Interview System
- Structured questions across life modules
- Front-facing camera recording
- Review and approval workflow
- Session persistence and resume capability

### 4. Upload Management
- Background upload queue
- Retry logic for failed uploads
- Progress tracking and status updates
- Chunked upload support for large files

### 5. Library and Search
- Video library with search functionality
- Filter by module, status, and date
- Full-screen video playback
- Metadata display and management

### 6. Settings and Privacy
- Comprehensive settings management
- Privacy controls and data management
- Upload preferences and video quality settings
- Account management and data export

## 🔒 Security Features

### Data Protection
- All API calls use HTTPS
- Row Level Security (RLS) in Supabase
- User-specific data isolation
- Secure token-based authentication

### Privacy Controls
- Camera/microphone permission handling
- Local data encryption
- User consent for data processing
- After-death mode for posthumous access

### Upload Security
- Secure multipart uploads
- File validation and size limits
- Virus scanning (server-side)
- Encrypted storage in Supabase

## 🧪 Testing

### Unit Tests
Create test files for:
- Model validation (User, PersonalityProfile)
- Business logic (AppViewModel, RecordingViewModel)
- API service functionality
- Local storage operations

### UI Tests
Test critical user flows:
- Onboarding completion
- Personality test completion
- Video recording and approval
- Library search and playback
- Settings management

### Manual Testing Checklist
- [ ] App launches successfully
- [ ] Onboarding flow completes
- [ ] Camera permissions granted
- [ ] Video recording works
- [ ] Upload queue processes files
- [ ] Library displays recordings
- [ ] Settings save correctly
- [ ] App handles network errors gracefully

## 🚀 Deployment

### TestFlight Distribution
1. Archive the app in Xcode
2. Upload to App Store Connect
3. Add internal/external testers
4. Distribute beta builds

### App Store Submission
1. Complete App Store metadata
2. Add screenshots and descriptions
3. Set pricing and availability
4. Submit for review

## 🛠️ Troubleshooting

### Common Issues

#### Build Errors
- Ensure all files are added to target
- Check bundle identifier uniqueness
- Verify development team selection
- Update Xcode if needed

#### Camera Not Working
- Test on physical device (simulator has limitations)
- Check camera permissions in Settings
- Verify Info.plist usage descriptions
- Restart app after granting permissions

#### Upload Failures
- Check Supabase configuration
- Verify API keys and URLs
- Test network connectivity
- Check file size limits

#### Database Errors
- Verify RLS policies are correct
- Check user authentication status
- Ensure tables exist with correct schema
- Test with Supabase dashboard

### Debug Tips
- Use Xcode debugger and breakpoints
- Check console logs for errors
- Test with different network conditions
- Verify Supabase logs and metrics

## 📞 Support

For technical issues:
1. Check this setup guide
2. Review Xcode console logs
3. Test Supabase connection
4. Create GitHub issue with details

## 🗺️ Next Steps

After successful setup:
1. Customize branding and colors
2. Add analytics tracking
3. Implement push notifications
4. Add advanced AI features
5. Optimize for iPad
6. Add accessibility features

---

**Legacy.AI** - Your complete iOS legacy interview application is now ready! 🎥✨