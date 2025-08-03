import Foundation
import Combine

class UploadManager: ObservableObject {
    static let shared = UploadManager()
    
    @Published var uploadQueue: [VideoRecording] = []
    @Published var currentUpload: VideoRecording?
    @Published var uploadProgress: Double = 0.0
    
    private var cancellables = Set<AnyCancellable>()
    private let maxRetries = 3
    private let retryDelay: TimeInterval = 5.0
    
    private init() {
        startProcessingQueue()
    }
    
    func addToQueue(_ recording: VideoRecording) {
        var updatedRecording = recording
        updatedRecording.uploadStatus = .pending
        uploadQueue.append(updatedRecording)
        
        // Save to local storage for persistence
        saveQueueToStorage()
    }
    
    private func startProcessingQueue() {
        Timer.publish(every: 2.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.processNextUpload()
            }
            .store(in: &cancellables)
    }
    
    private func processNextUpload() {
        guard currentUpload == nil,
              let nextUpload = uploadQueue.first(where: { $0.uploadStatus == .pending || $0.uploadStatus == .retrying }) else {
            return
        }
        
        currentUpload = nextUpload
        uploadVideo(nextUpload)
    }
    
    private func uploadVideo(_ recording: VideoRecording) {
        guard let index = uploadQueue.firstIndex(where: { $0.id == recording.id }) else { return }
        
        uploadQueue[index].uploadStatus = .uploading
        uploadProgress = 0.0
        
        Task {
            do {
                // Simulate chunked upload with progress
                await simulateUploadProgress()
                
                // Actual upload to API
                let cloudURL = try await APIService.shared.uploadVideo(
                    recording,
                    userId: UUID(), // This should come from the current user
                    module: "Unknown", // This should come from the question context
                    questionNumber: 1 // This should come from the question context
                )
                
                await MainActor.run {
                    uploadQueue[index].uploadStatus = .completed
                    uploadQueue[index].cloudURL = cloudURL
                    uploadQueue[index].uploadedAt = Date()
                    currentUpload = nil
                    uploadProgress = 0.0
                    
                    // Remove completed uploads from queue after a delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        self.uploadQueue.removeAll { $0.uploadStatus == .completed }
                        self.saveQueueToStorage()
                    }
                }
                
            } catch {
                await MainActor.run {
                    handleUploadError(for: recording, error: error)
                }
            }
        }
    }
    
    private func simulateUploadProgress() async {
        for progress in stride(from: 0.0, through: 1.0, by: 0.1) {
            await MainActor.run {
                uploadProgress = progress
            }
            try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
        }
    }
    
    private func handleUploadError(for recording: VideoRecording, error: Error) {
        guard let index = uploadQueue.firstIndex(where: { $0.id == recording.id }) else { return }
        
        let currentRetries = uploadQueue[index].uploadStatus == .retrying ? 1 : 0
        
        if currentRetries < maxRetries {
            uploadQueue[index].uploadStatus = .retrying
            
            // Retry after delay
            DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                self.currentUpload = nil
            }
        } else {
            uploadQueue[index].uploadStatus = .failed
            currentUpload = nil
        }
        
        uploadProgress = 0.0
        saveQueueToStorage()
    }
    
    func retryFailedUploads() {
        for index in uploadQueue.indices {
            if uploadQueue[index].uploadStatus == .failed {
                uploadQueue[index].uploadStatus = .pending
            }
        }
        saveQueueToStorage()
    }
    
    func cancelUpload(_ recording: VideoRecording) {
        if let index = uploadQueue.firstIndex(where: { $0.id == recording.id }) {
            uploadQueue.remove(at: index)
            
            if currentUpload?.id == recording.id {
                currentUpload = nil
                uploadProgress = 0.0
            }
        }
        saveQueueToStorage()
    }
    
    // MARK: - Persistence
    
    private func saveQueueToStorage() {
        do {
            let data = try JSONEncoder().encode(uploadQueue)
            UserDefaults.standard.set(data, forKey: "uploadQueue")
        } catch {
            print("Failed to save upload queue: \(error)")
        }
    }
    
    private func loadQueueFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: "uploadQueue") else { return }
        
        do {
            uploadQueue = try JSONDecoder().decode([VideoRecording].self, from: data)
        } catch {
            print("Failed to load upload queue: \(error)")
        }
    }
}

// MARK: - Background Upload Support

extension UploadManager {
    func enableBackgroundUploads() {
        // Configure background task handling
        // This would integrate with iOS background app refresh
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
    }
    
    @objc private func appDidEnterBackground() {
        // Start background task for uploads
        let backgroundTask = UIApplication.shared.beginBackgroundTask {
            // Handle expiration
        }
        
        // Continue processing uploads in background
        DispatchQueue.global(qos: .background).async {
            // Process remaining uploads
            UIApplication.shared.endBackgroundTask(backgroundTask)
        }
    }
}