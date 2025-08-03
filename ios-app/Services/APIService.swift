import Foundation
import Combine

class APIService: ObservableObject {
    static let shared = APIService()
    
    private let baseURL = "https://your-supabase-url.supabase.co"
    private let apiKey = "your-supabase-anon-key"
    
    private var cancellables = Set<AnyCancellable>()
    
    private init() {}
    
    // MARK: - Authentication
    
    func signUp(email: String, password: String) async throws -> User {
        let url = URL(string: "\(baseURL)/auth/v1/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body = [
            "email": email,
            "password": password
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.authenticationFailed
        }
        
        // Parse response and create User object
        // This is a simplified implementation
        return User(email: email, isGuest: false)
    }
    
    func signIn(email: String, password: String) async throws -> User {
        let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body = [
            "email": email,
            "password": password
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.authenticationFailed
        }
        
        return User(email: email, isGuest: false)
    }
    
    // MARK: - User Profile
    
    func savePersonalityProfile(_ profile: PersonalityProfile, for userId: UUID) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/personality_profiles")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body = [
            "user_id": userId.uuidString,
            "extraversion": profile.extraversion,
            "agreeableness": profile.agreeableness,
            "conscientiousness": profile.conscientiousness,
            "neuroticism": profile.neuroticism,
            "openness": profile.openness,
            "responses": profile.responses,
            "completed_at": ISO8601DateFormatter().string(from: profile.completedAt)
        ] as [String: Any]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw APIError.uploadFailed
        }
    }
    
    // MARK: - Video Upload
    
    func uploadVideo(_ recording: VideoRecording, userId: UUID, module: String, questionNumber: Int) async throws -> URL {
        // First, upload the video file to Supabase Storage
        let videoURL = try await uploadVideoFile(recording.localURL, userId: userId)
        
        // Then, save the metadata to the database
        try await saveVideoMetadata(
            recording: recording,
            cloudURL: videoURL,
            userId: userId,
            module: module,
            questionNumber: questionNumber
        )
        
        return videoURL
    }
    
    private func uploadVideoFile(_ localURL: URL, userId: UUID) async throws -> URL {
        let fileName = "\(userId.uuidString)/\(UUID().uuidString).mp4"
        let url = URL(string: "\(baseURL)/storage/v1/object/legacy-videos/\(fileName)")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("video/mp4", forHTTPHeaderField: "Content-Type")
        
        let videoData = try Data(contentsOf: localURL)
        request.httpBody = videoData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.uploadFailed
        }
        
        // Return the public URL
        return URL(string: "\(baseURL)/storage/v1/object/public/legacy-videos/\(fileName)")!
    }
    
    private func saveVideoMetadata(recording: VideoRecording, cloudURL: URL, userId: UUID, module: String, questionNumber: Int) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/video_recordings")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body = [
            "id": recording.id.uuidString,
            "user_id": userId.uuidString,
            "question_id": recording.questionId.uuidString,
            "module": module,
            "question_number": questionNumber,
            "cloud_url": cloudURL.absoluteString,
            "duration": recording.duration,
            "file_size": recording.fileSize,
            "recorded_at": ISO8601DateFormatter().string(from: recording.recordedAt),
            "uploaded_at": ISO8601DateFormatter().string(from: Date())
        ] as [String: Any]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw APIError.uploadFailed
        }
    }
}

enum APIError: Error, LocalizedError {
    case authenticationFailed
    case uploadFailed
    case networkError
    case invalidResponse
    
    var errorDescription: String? {
        switch self {
        case .authenticationFailed:
            return "Authentication failed. Please check your credentials."
        case .uploadFailed:
            return "Failed to upload video. Please try again."
        case .networkError:
            return "Network error. Please check your connection."
        case .invalidResponse:
            return "Invalid response from server."
        }
    }
}