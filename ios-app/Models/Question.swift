import Foundation

struct InterviewModule: Codable, Identifiable {
    let id = UUID()
    let name: String
    let questions: [InterviewQuestion]
    var completedQuestions: Int {
        questions.filter { $0.isCompleted }.count
    }
    var progress: Double {
        guard !questions.isEmpty else { return 0 }
        return Double(completedQuestions) / Double(questions.count)
    }
}

struct InterviewQuestion: Codable, Identifiable {
    let id = UUID()
    let module: String
    let questionNumber: Int
    let question: String
    var isCompleted: Bool = false
    var recording: VideoRecording?
    
    private enum CodingKeys: String, CodingKey {
        case module, questionNumber = "question_number", question
    }
}

struct VideoRecording: Codable, Identifiable {
    let id: UUID
    let questionId: UUID
    let localURL: URL
    var cloudURL: URL?
    let duration: TimeInterval
    let fileSize: Int64
    var transcript: String?
    var uploadStatus: UploadStatus
    let recordedAt: Date
    var uploadedAt: Date?
    
    init(questionId: UUID, localURL: URL, duration: TimeInterval, fileSize: Int64) {
        self.id = UUID()
        self.questionId = questionId
        self.localURL = localURL
        self.duration = duration
        self.fileSize = fileSize
        self.uploadStatus = .pending
        self.recordedAt = Date()
    }
}

enum UploadStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case uploading = "uploading"
    case completed = "completed"
    case failed = "failed"
    case retrying = "retrying"
}

struct PersonalityQuestion: Identifiable {
    let id = UUID()
    let number: Int
    let text: String
    var response: Int?
    
    static let questions = [
        PersonalityQuestion(number: 1, text: "I enjoy being the center of attention in social settings."),
        PersonalityQuestion(number: 2, text: "I care deeply about other people's feelings."),
        PersonalityQuestion(number: 3, text: "I take care of tasks promptly and efficiently."),
        PersonalityQuestion(number: 4, text: "I often experience changes in my mood."),
        PersonalityQuestion(number: 5, text: "I enjoy reflecting on ideas and imagining possibilities."),
        PersonalityQuestion(number: 6, text: "I tend to be quiet and reserved."),
        PersonalityQuestion(number: 7, text: "I find it hard to connect with other people's struggles."),
        PersonalityQuestion(number: 8, text: "I can be forgetful about keeping things in order."),
        PersonalityQuestion(number: 9, text: "I generally stay calm, even in stressful situations."),
        PersonalityQuestion(number: 10, text: "I don't enjoy discussing complex or abstract ideas."),
        PersonalityQuestion(number: 11, text: "I enjoy meeting and chatting with new people."),
        PersonalityQuestion(number: 12, text: "I feel emotionally moved by what others go through."),
        PersonalityQuestion(number: 13, text: "I like things to be organized and in their place."),
        PersonalityQuestion(number: 14, text: "I get emotionally unsettled more easily than others."),
        PersonalityQuestion(number: 15, text: "I find abstract thinking to be challenging."),
        PersonalityQuestion(number: 16, text: "I prefer to stay in the background in group situations."),
        PersonalityQuestion(number: 17, text: "I help others feel comfortable in social situations."),
        PersonalityQuestion(number: 18, text: "I sometimes neglect my responsibilities."),
        PersonalityQuestion(number: 19, text: "I rarely feel down or discouraged."),
        PersonalityQuestion(number: 20, text: "I have a lot of ideas and creative thoughts.")
    ]
}