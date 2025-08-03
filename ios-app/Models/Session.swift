import Foundation

struct InterviewSession: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var currentModuleIndex: Int
    var currentQuestionIndex: Int
    var modules: [InterviewModule]
    var isCompleted: Bool
    let startedAt: Date
    var lastActiveAt: Date
    var completedAt: Date?
    
    var currentModule: InterviewModule? {
        guard currentModuleIndex < modules.count else { return nil }
        return modules[currentModuleIndex]
    }
    
    var currentQuestion: InterviewQuestion? {
        guard let module = currentModule,
              currentQuestionIndex < module.questions.count else { return nil }
        return module.questions[currentQuestionIndex]
    }
    
    var totalProgress: Double {
        let totalQuestions = modules.reduce(0) { $0 + $1.questions.count }
        let completedQuestions = modules.reduce(0) { $0 + $1.completedQuestions }
        guard totalQuestions > 0 else { return 0 }
        return Double(completedQuestions) / Double(totalQuestions)
    }
    
    init(userId: UUID, modules: [InterviewModule]) {
        self.id = UUID()
        self.userId = userId
        self.currentModuleIndex = 0
        self.currentQuestionIndex = 0
        self.modules = modules
        self.isCompleted = false
        self.startedAt = Date()
        self.lastActiveAt = Date()
    }
    
    mutating func moveToNextQuestion() {
        guard let currentModule = currentModule else { return }
        
        if currentQuestionIndex < currentModule.questions.count - 1 {
            currentQuestionIndex += 1
        } else if currentModuleIndex < modules.count - 1 {
            currentModuleIndex += 1
            currentQuestionIndex = 0
        } else {
            isCompleted = true
            completedAt = Date()
        }
        
        lastActiveAt = Date()
    }
    
    mutating func markCurrentQuestionCompleted(with recording: VideoRecording) {
        guard currentModuleIndex < modules.count,
              currentQuestionIndex < modules[currentModuleIndex].questions.count else { return }
        
        modules[currentModuleIndex].questions[currentQuestionIndex].isCompleted = true
        modules[currentModuleIndex].questions[currentQuestionIndex].recording = recording
        lastActiveAt = Date()
    }
}

struct AppSettings: Codable {
    var hasCompletedOnboarding: Bool = false
    var hasCompletedPersonalityTest: Bool = false
    var allowsBackgroundUploads: Bool = true
    var videoQuality: VideoQuality = .high
    var autoSaveEnabled: Bool = true
    var afterDeathModeEnabled: Bool = false
    var whatsAppConnected: Bool = false
    var notificationsEnabled: Bool = true
    
    enum VideoQuality: String, Codable, CaseIterable {
        case low = "low"
        case medium = "medium"
        case high = "high"
        
        var displayName: String {
            switch self {
            case .low: return "Low (720p)"
            case .medium: return "Medium (1080p)"
            case .high: return "High (4K)"
            }
        }
    }
}