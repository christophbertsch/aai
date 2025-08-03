import Foundation
import SwiftUI

// MARK: - App Constants

struct AppConstants {
    // MARK: - API Configuration
    static let supabaseURL = "https://your-supabase-url.supabase.co"
    static let supabaseAnonKey = "your-supabase-anon-key"
    
    // MARK: - Storage
    static let videoBucketName = "legacy-videos"
    static let maxVideoFileSize: Int64 = 500 * 1024 * 1024 // 500MB
    static let maxVideoDuration: TimeInterval = 600 // 10 minutes
    
    // MARK: - Recording Settings
    static let defaultVideoQuality = "high"
    static let supportedVideoFormats = ["mp4", "mov"]
    static let maxRetryAttempts = 3
    static let retryDelay: TimeInterval = 5.0
    
    // MARK: - UI Constants
    static let cornerRadius: CGFloat = 12
    static let buttonHeight: CGFloat = 50
    static let cardPadding: CGFloat = 16
    static let sectionSpacing: CGFloat = 24
    
    // MARK: - Animation Durations
    static let shortAnimation: TimeInterval = 0.2
    static let mediumAnimation: TimeInterval = 0.3
    static let longAnimation: TimeInterval = 0.5
    
    // MARK: - Personality Test
    static let personalityQuestionCount = 20
    static let likertScaleRange = 1...5
    
    // MARK: - Interview
    static let estimatedTimePerQuestion: TimeInterval = 180 // 3 minutes
    static let maxQuestionsPerSession = 100
    
    // MARK: - Notifications
    static let uploadCompleteNotification = "UploadCompleteNotification"
    static let uploadFailedNotification = "UploadFailedNotification"
    static let sessionSavedNotification = "SessionSavedNotification"
}

// MARK: - User Defaults Keys

struct UserDefaultsKeys {
    static let currentUser = "currentUser"
    static let currentSession = "currentSession"
    static let appSettings = "appSettings"
    static let uploadQueue = "uploadQueue"
    static let hasCompletedOnboarding = "hasCompletedOnboarding"
    static let hasCompletedPersonalityTest = "hasCompletedPersonalityTest"
    static let lastAppVersion = "lastAppVersion"
}

// MARK: - File Paths

struct FilePaths {
    static let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    static let videosDirectory = documentsDirectory.appendingPathComponent("Videos")
    static let tempDirectory = FileManager.default.temporaryDirectory
    static let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
}

// MARK: - Error Messages

struct ErrorMessages {
    static let networkError = "Network connection error. Please check your internet connection and try again."
    static let uploadError = "Failed to upload video. Please try again later."
    static let authenticationError = "Authentication failed. Please check your credentials."
    static let permissionError = "Camera and microphone permissions are required to record videos."
    static let storageError = "Not enough storage space available."
    static let videoTooLarge = "Video file is too large. Please record a shorter video."
    static let invalidVideoFormat = "Invalid video format. Please use MP4 or MOV format."
    static let sessionExpired = "Your session has expired. Please sign in again."
    static let serverError = "Server error. Please try again later."
    static let unknownError = "An unexpected error occurred. Please try again."
}

// MARK: - Success Messages

struct SuccessMessages {
    static let videoUploaded = "Video uploaded successfully!"
    static let sessionSaved = "Session progress saved."
    static let personalityTestCompleted = "Personality assessment completed!"
    static let accountCreated = "Account created successfully!"
    static let signInSuccessful = "Welcome back!"
    static let settingsUpdated = "Settings updated successfully."
    static let dataExported = "Data exported successfully."
    static let cacheCleared = "Cache cleared successfully."
}

// MARK: - Color Scheme

struct AppColors {
    static let primary = Color.blue
    static let secondary = Color.purple
    static let accent = Color.green
    static let warning = Color.orange
    static let error = Color.red
    static let success = Color.green
    
    static let backgroundPrimary = Color(.systemBackground)
    static let backgroundSecondary = Color(.secondarySystemBackground)
    static let backgroundTertiary = Color(.tertiarySystemBackground)
    
    static let textPrimary = Color(.label)
    static let textSecondary = Color(.secondaryLabel)
    static let textTertiary = Color(.tertiaryLabel)
    
    static let cardBackground = Color(.systemBackground)
    static let cardBorder = Color(.separator)
}

// MARK: - Typography

struct AppFonts {
    static let largeTitle = Font.largeTitle.weight(.bold)
    static let title = Font.title.weight(.semibold)
    static let title2 = Font.title2.weight(.medium)
    static let title3 = Font.title3.weight(.medium)
    static let headline = Font.headline.weight(.medium)
    static let body = Font.body
    static let callout = Font.callout
    static let subheadline = Font.subheadline
    static let footnote = Font.footnote
    static let caption = Font.caption
    static let caption2 = Font.caption2
}

// MARK: - Spacing

struct AppSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - Icon Names

struct AppIcons {
    // Tab Bar Icons
    static let interview = "video.circle"
    static let library = "folder.circle"
    static let settings = "gear.circle"
    
    // Navigation Icons
    static let back = "chevron.left"
    static let forward = "chevron.right"
    static let close = "xmark"
    static let menu = "ellipsis.circle"
    
    // Recording Icons
    static let record = "record.circle"
    static let stop = "stop.circle"
    static let play = "play.circle"
    static let pause = "pause.circle"
    static let camera = "camera.circle"
    static let microphone = "mic.circle"
    
    // Status Icons
    static let success = "checkmark.circle.fill"
    static let error = "exclamationmark.triangle.fill"
    static let warning = "exclamationmark.circle.fill"
    static let info = "info.circle.fill"
    static let loading = "arrow.clockwise.circle"
    
    // Upload Icons
    static let upload = "icloud.and.arrow.up"
    static let download = "icloud.and.arrow.down"
    static let sync = "arrow.clockwise.icloud"
    
    // User Icons
    static let profile = "person.circle"
    static let guest = "person.crop.circle.dashed"
    static let signOut = "rectangle.portrait.and.arrow.right"
    
    // Feature Icons
    static let personality = "brain.head.profile"
    static let privacy = "lock.shield"
    static let help = "questionmark.circle"
    static let about = "info.circle"
}

// MARK: - Accessibility Identifiers

struct AccessibilityIdentifiers {
    // Onboarding
    static let onboardingNextButton = "onboarding_next_button"
    static let onboardingSkipButton = "onboarding_skip_button"
    static let signUpButton = "sign_up_button"
    static let signInButton = "sign_in_button"
    static let guestButton = "continue_as_guest_button"
    
    // Personality Test
    static let personalityQuestionText = "personality_question_text"
    static let personalityScaleButton = "personality_scale_button"
    static let personalityNextButton = "personality_next_button"
    static let personalityPreviousButton = "personality_previous_button"
    
    // Interview
    static let recordButton = "record_button"
    static let stopButton = "stop_button"
    static let approveButton = "approve_button"
    static let retakeButton = "retake_button"
    static let questionText = "question_text"
    
    // Library
    static let searchBar = "library_search_bar"
    static let filterChip = "library_filter_chip"
    static let recordingCard = "recording_card"
    static let playButton = "play_button"
    
    // Settings
    static let profileCard = "profile_card"
    static let settingsRow = "settings_row"
    static let signOutButton = "sign_out_button"
    static let clearDataButton = "clear_data_button"
}

// MARK: - Analytics Events

struct AnalyticsEvents {
    static let appLaunched = "app_launched"
    static let onboardingCompleted = "onboarding_completed"
    static let userSignedUp = "user_signed_up"
    static let userSignedIn = "user_signed_in"
    static let guestModeStarted = "guest_mode_started"
    static let personalityTestStarted = "personality_test_started"
    static let personalityTestCompleted = "personality_test_completed"
    static let interviewStarted = "interview_started"
    static let questionRecorded = "question_recorded"
    static let videoUploaded = "video_uploaded"
    static let uploadFailed = "upload_failed"
    static let sessionCompleted = "session_completed"
    static let libraryViewed = "library_viewed"
    static let videoPlayed = "video_played"
    static let settingsViewed = "settings_viewed"
    static let userSignedOut = "user_signed_out"
    static let dataCleared = "data_cleared"
}