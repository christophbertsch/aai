import Foundation
import Combine

class AppViewModel: ObservableObject {
    @Published var currentUser: User?
    @Published var appSettings: AppSettings
    @Published var currentSession: InterviewSession?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let localStorageService = LocalStorageService.shared
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        self.appSettings = localStorageService.loadSettings()
        self.currentUser = localStorageService.loadUser()
        self.currentSession = localStorageService.loadSession()
        
        setupBindings()
    }
    
    private func setupBindings() {
        // Auto-save settings when they change
        $appSettings
            .dropFirst()
            .sink { [weak self] settings in
                self?.localStorageService.saveSettings(settings)
            }
            .store(in: &cancellables)
        
        // Auto-save user when they change
        $currentUser
            .dropFirst()
            .sink { [weak self] user in
                if let user = user {
                    self?.localStorageService.saveUser(user)
                } else {
                    self?.localStorageService.clearUser()
                }
            }
            .store(in: &cancellables)
        
        // Auto-save session when it changes
        $currentSession
            .dropFirst()
            .sink { [weak self] session in
                if let session = session {
                    self?.localStorageService.saveSession(session)
                } else {
                    self?.localStorageService.clearSession()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Authentication
    
    func signUp(email: String, password: String) async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let user = try await apiService.signUp(email: email, password: password)
            await MainActor.run {
                self.currentUser = user
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
    
    func signIn(email: String, password: String) async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let user = try await apiService.signIn(email: email, password: password)
            await MainActor.run {
                self.currentUser = user
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
    
    func continueAsGuest() {
        currentUser = User(isGuest: true)
    }
    
    func signOut() {
        currentUser = nil
        currentSession = nil
        localStorageService.clearUser()
        localStorageService.clearSession()
    }
    
    // MARK: - Onboarding
    
    func completeOnboarding() {
        appSettings.hasCompletedOnboarding = true
    }
    
    func completePersonalityTest(responses: [Int]) {
        guard let user = currentUser else { return }
        
        let profile = PersonalityProfile(responses: responses)
        var updatedUser = user
        updatedUser.personalityProfile = profile
        
        currentUser = updatedUser
        appSettings.hasCompletedPersonalityTest = true
        
        // Save to server
        Task {
            do {
                try await apiService.savePersonalityProfile(profile, for: user.id)
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to save personality profile: \(error.localizedDescription)"
                }
            }
        }
    }
    
    // MARK: - Interview Session
    
    func startNewSession() {
        guard let user = currentUser else { return }
        
        let modules = localStorageService.loadInterviewQuestions()
        let session = InterviewSession(userId: user.id, modules: modules)
        currentSession = session
    }
    
    func resumeSession() -> Bool {
        return currentSession != nil
    }
    
    func completeCurrentQuestion(with recording: VideoRecording) {
        guard var session = currentSession else { return }
        
        session.markCurrentQuestionCompleted(with: recording)
        session.moveToNextQuestion()
        
        currentSession = session
        
        // Add to upload queue
        UploadManager.shared.addToQueue(recording)
    }
    
    // MARK: - Settings
    
    func updateSettings(_ newSettings: AppSettings) {
        appSettings = newSettings
    }
    
    func enableAfterDeathMode() {
        appSettings.afterDeathModeEnabled = true
    }
    
    func connectWhatsApp() {
        appSettings.whatsAppConnected = true
    }
    
    // MARK: - Data Management
    
    func clearAllData() {
        localStorageService.clearAllData()
        currentUser = nil
        currentSession = nil
        appSettings = AppSettings()
    }
    
    func getCacheSize() -> String {
        let bytes = localStorageService.getCacheSize()
        return ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
    }
}

// MARK: - Computed Properties

extension AppViewModel {
    var shouldShowOnboarding: Bool {
        !appSettings.hasCompletedOnboarding
    }
    
    var shouldShowPersonalityTest: Bool {
        appSettings.hasCompletedOnboarding && !appSettings.hasCompletedPersonalityTest && currentUser != nil
    }
    
    var canStartInterview: Bool {
        currentUser != nil && appSettings.hasCompletedOnboarding
    }
    
    var hasActiveSession: Bool {
        currentSession != nil && !(currentSession?.isCompleted ?? true)
    }
}