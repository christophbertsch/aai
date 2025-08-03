import Foundation

class LocalStorageService: ObservableObject {
    static let shared = LocalStorageService()
    
    private let userDefaults = UserDefaults.standard
    private let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    
    private init() {}
    
    // MARK: - User Management
    
    func saveUser(_ user: User) {
        do {
            let data = try JSONEncoder().encode(user)
            userDefaults.set(data, forKey: "currentUser")
        } catch {
            print("Failed to save user: \(error)")
        }
    }
    
    func loadUser() -> User? {
        guard let data = userDefaults.data(forKey: "currentUser") else { return nil }
        
        do {
            return try JSONDecoder().decode(User.self, from: data)
        } catch {
            print("Failed to load user: \(error)")
            return nil
        }
    }
    
    func clearUser() {
        userDefaults.removeObject(forKey: "currentUser")
    }
    
    // MARK: - Session Management
    
    func saveSession(_ session: InterviewSession) {
        do {
            let data = try JSONEncoder().encode(session)
            userDefaults.set(data, forKey: "currentSession")
        } catch {
            print("Failed to save session: \(error)")
        }
    }
    
    func loadSession() -> InterviewSession? {
        guard let data = userDefaults.data(forKey: "currentSession") else { return nil }
        
        do {
            return try JSONDecoder().decode(InterviewSession.self, from: data)
        } catch {
            print("Failed to load session: \(error)")
            return nil
        }
    }
    
    func clearSession() {
        userDefaults.removeObject(forKey: "currentSession")
    }
    
    // MARK: - Settings Management
    
    func saveSettings(_ settings: AppSettings) {
        do {
            let data = try JSONEncoder().encode(settings)
            userDefaults.set(data, forKey: "appSettings")
        } catch {
            print("Failed to save settings: \(error)")
        }
    }
    
    func loadSettings() -> AppSettings {
        guard let data = userDefaults.data(forKey: "appSettings") else {
            return AppSettings()
        }
        
        do {
            return try JSONDecoder().decode(AppSettings.self, from: data)
        } catch {
            print("Failed to load settings: \(error)")
            return AppSettings()
        }
    }
    
    // MARK: - Video File Management
    
    func saveVideoFile(_ data: Data, for recordingId: UUID) -> URL? {
        let fileName = "\(recordingId.uuidString).mp4"
        let fileURL = documentsDirectory.appendingPathComponent("Videos").appendingPathComponent(fileName)
        
        // Create Videos directory if it doesn't exist
        let videosDirectory = documentsDirectory.appendingPathComponent("Videos")
        if !FileManager.default.fileExists(atPath: videosDirectory.path) {
            do {
                try FileManager.default.createDirectory(at: videosDirectory, withIntermediateDirectories: true)
            } catch {
                print("Failed to create videos directory: \(error)")
                return nil
            }
        }
        
        do {
            try data.write(to: fileURL)
            return fileURL
        } catch {
            print("Failed to save video file: \(error)")
            return nil
        }
    }
    
    func deleteVideoFile(at url: URL) {
        do {
            try FileManager.default.removeItem(at: url)
        } catch {
            print("Failed to delete video file: \(error)")
        }
    }
    
    func getVideoFileSize(at url: URL) -> Int64 {
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            return attributes[.size] as? Int64 ?? 0
        } catch {
            print("Failed to get file size: \(error)")
            return 0
        }
    }
    
    // MARK: - Questions Management
    
    func loadInterviewQuestions() -> [InterviewModule] {
        guard let url = Bundle.main.url(forResource: "legacy_ai_first_100_questions", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            print("Failed to load questions file")
            return []
        }
        
        do {
            let questions = try JSONDecoder().decode([InterviewQuestion].self, from: data)
            return groupQuestionsIntoModules(questions)
        } catch {
            print("Failed to decode questions: \(error)")
            return []
        }
    }
    
    private func groupQuestionsIntoModules(_ questions: [InterviewQuestion]) -> [InterviewModule] {
        let groupedQuestions = Dictionary(grouping: questions) { $0.module }
        
        return groupedQuestions.map { (moduleName, moduleQuestions) in
            InterviewModule(name: moduleName, questions: moduleQuestions.sorted { $0.questionNumber < $1.questionNumber })
        }.sorted { $0.name < $1.name }
    }
    
    // MARK: - Cache Management
    
    func clearAllData() {
        // Clear UserDefaults
        let keys = ["currentUser", "currentSession", "appSettings", "uploadQueue"]
        keys.forEach { userDefaults.removeObject(forKey: $0) }
        
        // Clear video files
        let videosDirectory = documentsDirectory.appendingPathComponent("Videos")
        if FileManager.default.fileExists(atPath: videosDirectory.path) {
            do {
                try FileManager.default.removeItem(at: videosDirectory)
            } catch {
                print("Failed to clear video files: \(error)")
            }
        }
    }
    
    func getCacheSize() -> Int64 {
        let videosDirectory = documentsDirectory.appendingPathComponent("Videos")
        
        guard let enumerator = FileManager.default.enumerator(at: videosDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        
        var totalSize: Int64 = 0
        
        for case let fileURL as URL in enumerator {
            do {
                let resourceValues = try fileURL.resourceValues(forKeys: [.fileSizeKey])
                totalSize += Int64(resourceValues.fileSize ?? 0)
            } catch {
                continue
            }
        }
        
        return totalSize
    }
}