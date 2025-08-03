import Foundation
import AVFoundation
import Combine

class RecordingViewModel: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var isReviewing = false
    @Published var recordingDuration: TimeInterval = 0
    @Published var recordedVideoURL: URL?
    @Published var hasPermissions = false
    @Published var errorMessage: String?
    
    private var captureSession: AVCaptureSession?
    private var videoOutput: AVCaptureMovieFileOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var recordingTimer: Timer?
    private var recordingStartTime: Date?
    
    private var cancellables = Set<AnyCancellable>()
    
    override init() {
        super.init()
        checkPermissions()
    }
    
    // MARK: - Permissions
    
    private func checkPermissions() {
        let cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
        let microphoneStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        
        hasPermissions = cameraStatus == .authorized && microphoneStatus == .authorized
        
        if cameraStatus == .notDetermined || microphoneStatus == .notDetermined {
            requestPermissions()
        }
    }
    
    func requestPermissions() {
        Task {
            let cameraGranted = await AVCaptureDevice.requestAccess(for: .video)
            let microphoneGranted = await AVCaptureDevice.requestAccess(for: .audio)
            
            await MainActor.run {
                self.hasPermissions = cameraGranted && microphoneGranted
                if self.hasPermissions {
                    self.setupCaptureSession()
                } else {
                    self.errorMessage = "Camera and microphone permissions are required to record your legacy video."
                }
            }
        }
    }
    
    // MARK: - Camera Setup
    
    func setupCaptureSession() {
        guard hasPermissions else { return }
        
        captureSession = AVCaptureSession()
        guard let captureSession = captureSession else { return }
        
        captureSession.beginConfiguration()
        
        // Configure for high quality video
        if captureSession.canSetSessionPreset(.high) {
            captureSession.sessionPreset = .high
        }
        
        // Add video input (front camera)
        guard let frontCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let videoInput = try? AVCaptureDeviceInput(device: frontCamera),
              captureSession.canAddInput(videoInput) else {
            errorMessage = "Failed to setup front camera"
            return
        }
        
        captureSession.addInput(videoInput)
        
        // Add audio input
        guard let audioDevice = AVCaptureDevice.default(for: .audio),
              let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
              captureSession.canAddInput(audioInput) else {
            errorMessage = "Failed to setup microphone"
            return
        }
        
        captureSession.addInput(audioInput)
        
        // Add video output
        videoOutput = AVCaptureMovieFileOutput()
        guard let videoOutput = videoOutput,
              captureSession.canAddOutput(videoOutput) else {
            errorMessage = "Failed to setup video output"
            return
        }
        
        captureSession.addOutput(videoOutput)
        
        // Configure video stabilization if available
        if let connection = videoOutput.connection(with: .video) {
            if connection.isVideoStabilizationSupported {
                connection.preferredVideoStabilizationMode = .auto
            }
        }
        
        captureSession.commitConfiguration()
        
        // Start the session
        DispatchQueue.global(qos: .userInitiated).async {
            captureSession.startRunning()
        }
    }
    
    func getPreviewLayer() -> AVCaptureVideoPreviewLayer? {
        guard let captureSession = captureSession else { return nil }
        
        if previewLayer == nil {
            previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
            previewLayer?.videoGravity = .resizeAspectFill
        }
        
        return previewLayer
    }
    
    // MARK: - Recording Controls
    
    func startRecording() {
        guard let videoOutput = videoOutput,
              !videoOutput.isRecording else { return }
        
        // Create temporary file URL
        let tempDirectory = FileManager.default.temporaryDirectory
        let fileName = "temp_recording_\(UUID().uuidString).mp4"
        let tempURL = tempDirectory.appendingPathComponent(fileName)
        
        // Start recording
        videoOutput.startRecording(to: tempURL, recordingDelegate: self)
        
        isRecording = true
        recordingStartTime = Date()
        
        // Start timer for duration tracking
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.recordingStartTime else { return }
            self.recordingDuration = Date().timeIntervalSince(startTime)
        }
    }
    
    func stopRecording() {
        guard let videoOutput = videoOutput,
              videoOutput.isRecording else { return }
        
        videoOutput.stopRecording()
        recordingTimer?.invalidate()
        recordingTimer = nil
    }
    
    func retakeRecording() {
        // Clean up previous recording
        if let url = recordedVideoURL {
            try? FileManager.default.removeItem(at: url)
        }
        
        recordedVideoURL = nil
        isReviewing = false
        recordingDuration = 0
        errorMessage = nil
    }
    
    func approveRecording() -> VideoRecording? {
        guard let url = recordedVideoURL else { return nil }
        
        // Move file to permanent location
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let videosDirectory = documentsDirectory.appendingPathComponent("Videos")
        
        // Create directory if needed
        if !FileManager.default.fileExists(atPath: videosDirectory.path) {
            try? FileManager.default.createDirectory(at: videosDirectory, withIntermediateDirectories: true)
        }
        
        let permanentURL = videosDirectory.appendingPathComponent("\(UUID().uuidString).mp4")
        
        do {
            try FileManager.default.moveItem(at: url, to: permanentURL)
            
            let fileSize = getFileSize(at: permanentURL)
            let recording = VideoRecording(
                questionId: UUID(), // This should be passed from the question context
                localURL: permanentURL,
                duration: recordingDuration,
                fileSize: fileSize
            )
            
            // Reset state
            recordedVideoURL = nil
            isReviewing = false
            recordingDuration = 0
            
            return recording
            
        } catch {
            errorMessage = "Failed to save recording: \(error.localizedDescription)"
            return nil
        }
    }
    
    private func getFileSize(at url: URL) -> Int64 {
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            return attributes[.size] as? Int64 ?? 0
        } catch {
            return 0
        }
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        captureSession?.stopRunning()
        recordingTimer?.invalidate()
        
        if let url = recordedVideoURL {
            try? FileManager.default.removeItem(at: url)
        }
    }
}

// MARK: - AVCaptureFileOutputRecordingDelegate

extension RecordingViewModel: AVCaptureFileOutputRecordingDelegate {
    func fileOutput(_ output: AVCaptureFileOutput, didStartRecordingTo fileURL: URL, from connections: [AVCaptureConnection]) {
        // Recording started successfully
    }
    
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        DispatchQueue.main.async {
            self.isRecording = false
            
            if let error = error {
                self.errorMessage = "Recording failed: \(error.localizedDescription)"
                // Clean up failed recording
                try? FileManager.default.removeItem(at: outputFileURL)
            } else {
                self.recordedVideoURL = outputFileURL
                self.isReviewing = true
            }
        }
    }
}

// MARK: - Video Quality Settings

extension RecordingViewModel {
    func configureVideoQuality(_ quality: AppSettings.VideoQuality) {
        guard let captureSession = captureSession else { return }
        
        captureSession.beginConfiguration()
        
        switch quality {
        case .low:
            if captureSession.canSetSessionPreset(.medium) {
                captureSession.sessionPreset = .medium
            }
        case .medium:
            if captureSession.canSetSessionPreset(.high) {
                captureSession.sessionPreset = .high
            }
        case .high:
            if captureSession.canSetSessionPreset(.hd1920x1080) {
                captureSession.sessionPreset = .hd1920x1080
            } else if captureSession.canSetSessionPreset(.high) {
                captureSession.sessionPreset = .high
            }
        }
        
        captureSession.commitConfiguration()
    }
}