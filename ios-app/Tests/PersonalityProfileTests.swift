import XCTest
@testable import LegacyAI

class PersonalityProfileTests: XCTestCase {
    
    func testPersonalityProfileCalculation() {
        // Test data: responses to all 20 questions (1-5 scale)
        let responses = [
            4, 5, 3, 2, 4,  // Questions 1-5
            2, 1, 4, 4, 2,  // Questions 6-10
            5, 4, 5, 3, 3,  // Questions 11-15
            1, 5, 2, 5, 4   // Questions 16-20
        ]
        
        let profile = PersonalityProfile(responses: responses)
        
        // Test that all scores are within valid range (1-5)
        XCTAssertGreaterThanOrEqual(profile.extraversion, 1.0)
        XCTAssertLessThanOrEqual(profile.extraversion, 5.0)
        
        XCTAssertGreaterThanOrEqual(profile.agreeableness, 1.0)
        XCTAssertLessThanOrEqual(profile.agreeableness, 5.0)
        
        XCTAssertGreaterThanOrEqual(profile.conscientiousness, 1.0)
        XCTAssertLessThanOrEqual(profile.conscientiousness, 5.0)
        
        XCTAssertGreaterThanOrEqual(profile.neuroticism, 1.0)
        XCTAssertLessThanOrEqual(profile.neuroticism, 5.0)
        
        XCTAssertGreaterThanOrEqual(profile.openness, 1.0)
        XCTAssertLessThanOrEqual(profile.openness, 5.0)
        
        // Test specific calculations based on Mini-IPIP scoring
        // Extraversion: items 1, 6R, 11, 16R
        let expectedExtraversion = Double(4 + (6-2) + 5 + (6-1)) / 4.0
        XCTAssertEqual(profile.extraversion, expectedExtraversion, accuracy: 0.01)
        
        // Agreeableness: items 2, 7R, 12, 17
        let expectedAgreeableness = Double(5 + (6-1) + 4 + 5) / 4.0
        XCTAssertEqual(profile.agreeableness, expectedAgreeableness, accuracy: 0.01)
        
        // Test that responses are stored correctly
        XCTAssertEqual(profile.responses, responses)
        
        // Test that completion date is recent
        XCTAssertLessThan(Date().timeIntervalSince(profile.completedAt), 1.0)
    }
    
    func testPersonalityProfileExtremeValues() {
        // Test with all minimum values
        let minResponses = Array(repeating: 1, count: 20)
        let minProfile = PersonalityProfile(responses: minResponses)
        
        // All scores should be relatively low due to reverse scoring
        XCTAssertLessThan(minProfile.extraversion, 3.0)
        XCTAssertLessThan(minProfile.agreeableness, 3.0)
        
        // Test with all maximum values
        let maxResponses = Array(repeating: 5, count: 20)
        let maxProfile = PersonalityProfile(responses: maxResponses)
        
        // All scores should be relatively high due to reverse scoring
        XCTAssertGreaterThan(maxProfile.extraversion, 3.0)
        XCTAssertGreaterThan(maxProfile.agreeableness, 3.0)
    }
    
    func testPersonalityProfileCodable() {
        let responses = [4, 5, 3, 2, 4, 2, 1, 4, 4, 2, 5, 4, 5, 3, 3, 1, 5, 2, 5, 4]
        let originalProfile = PersonalityProfile(responses: responses)
        
        // Test encoding
        let encoder = JSONEncoder()
        XCTAssertNoThrow(try encoder.encode(originalProfile))
        
        // Test decoding
        do {
            let data = try encoder.encode(originalProfile)
            let decoder = JSONDecoder()
            let decodedProfile = try decoder.decode(PersonalityProfile.self, from: data)
            
            XCTAssertEqual(decodedProfile.extraversion, originalProfile.extraversion, accuracy: 0.01)
            XCTAssertEqual(decodedProfile.agreeableness, originalProfile.agreeableness, accuracy: 0.01)
            XCTAssertEqual(decodedProfile.conscientiousness, originalProfile.conscientiousness, accuracy: 0.01)
            XCTAssertEqual(decodedProfile.neuroticism, originalProfile.neuroticism, accuracy: 0.01)
            XCTAssertEqual(decodedProfile.openness, originalProfile.openness, accuracy: 0.01)
            XCTAssertEqual(decodedProfile.responses, originalProfile.responses)
        } catch {
            XCTFail("Failed to encode/decode PersonalityProfile: \(error)")
        }
    }
}

class UserTests: XCTestCase {
    
    func testUserInitialization() {
        // Test guest user
        let guestUser = User()
        XCTAssertTrue(guestUser.isGuest)
        XCTAssertNil(guestUser.email)
        XCTAssertNil(guestUser.name)
        XCTAssertNil(guestUser.personalityProfile)
        
        // Test registered user
        let registeredUser = User(email: "test@example.com", name: "Test User", isGuest: false)
        XCTAssertFalse(registeredUser.isGuest)
        XCTAssertEqual(registeredUser.email, "test@example.com")
        XCTAssertEqual(registeredUser.name, "Test User")
    }
    
    func testUserCodable() {
        let user = User(email: "test@example.com", name: "Test User", isGuest: false)
        
        // Test encoding
        let encoder = JSONEncoder()
        XCTAssertNoThrow(try encoder.encode(user))
        
        // Test decoding
        do {
            let data = try encoder.encode(user)
            let decoder = JSONDecoder()
            let decodedUser = try decoder.decode(User.self, from: data)
            
            XCTAssertEqual(decodedUser.id, user.id)
            XCTAssertEqual(decodedUser.email, user.email)
            XCTAssertEqual(decodedUser.name, user.name)
            XCTAssertEqual(decodedUser.isGuest, user.isGuest)
        } catch {
            XCTFail("Failed to encode/decode User: \(error)")
        }
    }
}

class InterviewSessionTests: XCTestCase {
    
    func testSessionInitialization() {
        let userId = UUID()
        let modules = createTestModules()
        let session = InterviewSession(userId: userId, modules: modules)
        
        XCTAssertEqual(session.userId, userId)
        XCTAssertEqual(session.currentModuleIndex, 0)
        XCTAssertEqual(session.currentQuestionIndex, 0)
        XCTAssertFalse(session.isCompleted)
        XCTAssertEqual(session.modules.count, modules.count)
    }
    
    func testSessionProgress() {
        let modules = createTestModules()
        var session = InterviewSession(userId: UUID(), modules: modules)
        
        // Initial progress should be 0
        XCTAssertEqual(session.totalProgress, 0.0, accuracy: 0.01)
        
        // Mark first question as completed
        let recording = createTestRecording()
        session.markCurrentQuestionCompleted(with: recording)
        
        // Progress should increase
        XCTAssertGreaterThan(session.totalProgress, 0.0)
        
        // Move to next question
        session.moveToNextQuestion()
        XCTAssertEqual(session.currentQuestionIndex, 1)
    }
    
    func testSessionCompletion() {
        let modules = [createSingleQuestionModule()]
        var session = InterviewSession(userId: UUID(), modules: modules)
        
        // Complete the only question
        let recording = createTestRecording()
        session.markCurrentQuestionCompleted(with: recording)
        session.moveToNextQuestion()
        
        // Session should be completed
        XCTAssertTrue(session.isCompleted)
        XCTAssertNotNil(session.completedAt)
        XCTAssertEqual(session.totalProgress, 1.0, accuracy: 0.01)
    }
    
    // MARK: - Helper Methods
    
    private func createTestModules() -> [InterviewModule] {
        return [
            InterviewModule(name: "Test Module 1", questions: [
                InterviewQuestion(module: "Test Module 1", questionNumber: 1, question: "Test question 1"),
                InterviewQuestion(module: "Test Module 1", questionNumber: 2, question: "Test question 2")
            ]),
            InterviewModule(name: "Test Module 2", questions: [
                InterviewQuestion(module: "Test Module 2", questionNumber: 1, question: "Test question 3")
            ])
        ]
    }
    
    private func createSingleQuestionModule() -> InterviewModule {
        return InterviewModule(name: "Single Question", questions: [
            InterviewQuestion(module: "Single Question", questionNumber: 1, question: "Only question")
        ])
    }
    
    private func createTestRecording() -> VideoRecording {
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("test.mp4")
        return VideoRecording(
            questionId: UUID(),
            localURL: tempURL,
            duration: 30.0,
            fileSize: 1024
        )
    }
}

class VideoRecordingTests: XCTestCase {
    
    func testVideoRecordingInitialization() {
        let questionId = UUID()
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("test.mp4")
        let recording = VideoRecording(
            questionId: questionId,
            localURL: tempURL,
            duration: 45.5,
            fileSize: 2048
        )
        
        XCTAssertEqual(recording.questionId, questionId)
        XCTAssertEqual(recording.localURL, tempURL)
        XCTAssertEqual(recording.duration, 45.5, accuracy: 0.01)
        XCTAssertEqual(recording.fileSize, 2048)
        XCTAssertEqual(recording.uploadStatus, .pending)
        XCTAssertNil(recording.cloudURL)
        XCTAssertNil(recording.transcript)
        XCTAssertNil(recording.uploadedAt)
    }
    
    func testUploadStatusTransitions() {
        let recording = VideoRecording(
            questionId: UUID(),
            localURL: URL(fileURLWithPath: "/tmp/test.mp4"),
            duration: 30.0,
            fileSize: 1024
        )
        
        // Test all upload status cases
        let allStatuses: [UploadStatus] = [.pending, .uploading, .completed, .failed, .retrying]
        
        for status in allStatuses {
            var mutableRecording = recording
            mutableRecording.uploadStatus = status
            XCTAssertEqual(mutableRecording.uploadStatus, status)
        }
    }
}

class AppSettingsTests: XCTestCase {
    
    func testDefaultSettings() {
        let settings = AppSettings()
        
        XCTAssertFalse(settings.hasCompletedOnboarding)
        XCTAssertFalse(settings.hasCompletedPersonalityTest)
        XCTAssertTrue(settings.allowsBackgroundUploads)
        XCTAssertEqual(settings.videoQuality, .high)
        XCTAssertTrue(settings.autoSaveEnabled)
        XCTAssertFalse(settings.afterDeathModeEnabled)
        XCTAssertFalse(settings.whatsAppConnected)
        XCTAssertTrue(settings.notificationsEnabled)
    }
    
    func testVideoQualityDisplayNames() {
        XCTAssertEqual(AppSettings.VideoQuality.low.displayName, "Low (720p)")
        XCTAssertEqual(AppSettings.VideoQuality.medium.displayName, "Medium (1080p)")
        XCTAssertEqual(AppSettings.VideoQuality.high.displayName, "High (4K)")
    }
    
    func testSettingsCodable() {
        var settings = AppSettings()
        settings.hasCompletedOnboarding = true
        settings.videoQuality = .medium
        settings.afterDeathModeEnabled = true
        
        // Test encoding/decoding
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        
        do {
            let data = try encoder.encode(settings)
            let decodedSettings = try decoder.decode(AppSettings.self, from: data)
            
            XCTAssertEqual(decodedSettings.hasCompletedOnboarding, settings.hasCompletedOnboarding)
            XCTAssertEqual(decodedSettings.videoQuality, settings.videoQuality)
            XCTAssertEqual(decodedSettings.afterDeathModeEnabled, settings.afterDeathModeEnabled)
        } catch {
            XCTFail("Failed to encode/decode AppSettings: \(error)")
        }
    }
}