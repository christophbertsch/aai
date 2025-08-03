import SwiftUI

struct InterviewQuestionView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @StateObject private var recordingViewModel = RecordingViewModel()
    @Environment(\.dismiss) private var dismiss
    
    @State private var showingPermissionAlert = false
    @State private var showingExitAlert = false
    
    var body: some View {
        ZStack {
            if recordingViewModel.hasPermissions {
                if recordingViewModel.isReviewing {
                    ReviewVideoView()
                        .environmentObject(recordingViewModel)
                } else {
                    RecordingView()
                        .environmentObject(recordingViewModel)
                }
            } else {
                PermissionRequestView()
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Exit") {
                    showingExitAlert = true
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                if let session = appViewModel.currentSession {
                    Text("\(Int(session.totalProgress * 100))%")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .alert("Exit Interview?", isPresented: $showingExitAlert) {
            Button("Exit", role: .destructive) {
                recordingViewModel.cleanup()
                dismiss()
            }
            Button("Continue", role: .cancel) { }
        } message: {
            Text("Your progress will be saved, but any current recording will be lost.")
        }
        .alert("Camera Permission Required", isPresented: $showingPermissionAlert) {
            Button("Settings") {
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsURL)
                }
            }
            Button("Cancel", role: .cancel) {
                dismiss()
            }
        } message: {
            Text("Legacy.AI needs camera and microphone access to record your interview. Please enable permissions in Settings.")
        }
        .onAppear {
            if !recordingViewModel.hasPermissions {
                recordingViewModel.requestPermissions()
            } else {
                recordingViewModel.setupCaptureSession()
            }
        }
        .onDisappear {
            recordingViewModel.cleanup()
        }
    }
}

struct RecordingView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @EnvironmentObject var recordingViewModel: RecordingViewModel
    
    var currentQuestion: InterviewQuestion? {
        appViewModel.currentSession?.currentQuestion
    }
    
    var currentModule: InterviewModule? {
        appViewModel.currentSession?.currentModule
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Camera Preview
                CameraPreviewView(recordingViewModel: recordingViewModel)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
                
                // Overlay UI
                VStack {
                    // Top Info Bar
                    VStack(spacing: 8) {
                        if let module = currentModule {
                            Text(module.name)
                                .font(.caption)
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(12)
                        }
                        
                        if let question = currentQuestion {
                            Text("Question \(question.questionNumber)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    .padding(.top, 20)
                    
                    Spacer()
                    
                    // Question Text
                    if let question = currentQuestion {
                        VStack(spacing: 16) {
                            Text(question.question)
                                .font(.title2)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color.black.opacity(0.7))
                                        .blur(radius: 1)
                                )
                            
                            // Recording Timer
                            if recordingViewModel.isRecording {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(Color.red)
                                        .frame(width: 8, height: 8)
                                        .opacity(recordingViewModel.isRecording ? 1 : 0)
                                        .animation(.easeInOut(duration: 0.5).repeatForever(), value: recordingViewModel.isRecording)
                                    
                                    Text(formatTime(recordingViewModel.recordingDuration))
                                        .font(.headline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(20)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Recording Controls
                    HStack(spacing: 40) {
                        // Tips Button
                        Button {
                            // Show recording tips
                        } label: {
                            Image(systemName: "lightbulb.circle")
                                .font(.system(size: 40))
                                .foregroundColor(.white.opacity(0.8))
                        }
                        
                        // Record Button
                        Button {
                            if recordingViewModel.isRecording {
                                recordingViewModel.stopRecording()
                            } else {
                                recordingViewModel.startRecording()
                            }
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 80, height: 80)
                                
                                if recordingViewModel.isRecording {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color.red)
                                        .frame(width: 30, height: 30)
                                } else {
                                    Circle()
                                        .fill(Color.red)
                                        .frame(width: 60, height: 60)
                                }
                            }
                        }
                        .scaleEffect(recordingViewModel.isRecording ? 1.1 : 1.0)
                        .animation(.easeInOut(duration: 0.1), value: recordingViewModel.isRecording)
                        
                        // Skip Button
                        Button {
                            // Skip question
                        } label: {
                            Image(systemName: "forward.circle")
                                .font(.system(size: 40))
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    .padding(.bottom, 50)
                }
            }
        }
        .background(Color.black)
        .ignoresSafeArea()
    }
    
    private func formatTime(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct ReviewVideoView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @EnvironmentObject var recordingViewModel: RecordingViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Text("Review Your Answer")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Watch your recording and decide if you'd like to keep it or try again.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 20)
            
            // Video Player
            if let videoURL = recordingViewModel.recordedVideoURL {
                VideoPlayerView(url: videoURL)
                    .frame(height: 300)
                    .cornerRadius(16)
                    .padding(.horizontal, 16)
            }
            
            // Recording Info
            VStack(spacing: 8) {
                HStack {
                    Text("Duration:")
                        .foregroundColor(.secondary)
                    Text(formatTime(recordingViewModel.recordingDuration))
                        .fontWeight(.medium)
                    
                    Spacer()
                }
                
                if let question = appViewModel.currentSession?.currentQuestion {
                    Text(question.question)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, 16)
            
            Spacer()
            
            // Action Buttons
            VStack(spacing: 12) {
                Button("Approve & Continue") {
                    if let recording = recordingViewModel.approveRecording() {
                        appViewModel.completeCurrentQuestion(with: recording)
                        
                        // Check if interview is complete
                        if appViewModel.currentSession?.isCompleted == true {
                            // Show completion view
                            dismiss()
                        } else {
                            // Continue to next question
                            recordingViewModel.setupCaptureSession()
                        }
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                
                Button("Retake") {
                    recordingViewModel.retakeRecording()
                    recordingViewModel.setupCaptureSession()
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
    }
    
    private func formatTime(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct PermissionRequestView: View {
    @EnvironmentObject var recordingViewModel: RecordingViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            Image(systemName: "camera.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.blue)
            
            VStack(spacing: 16) {
                Text("Camera & Microphone Access")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Legacy.AI needs access to your camera and microphone to record your interview responses.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            VStack(spacing: 16) {
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Your recordings are stored securely")
                        .font(.subheadline)
                }
                
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("You control who can access your content")
                        .font(.subheadline)
                }
                
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Permissions can be changed anytime")
                        .font(.subheadline)
                }
            }
            .padding(.horizontal, 32)
            
            Spacer()
            
            VStack(spacing: 12) {
                Button("Grant Permissions") {
                    recordingViewModel.requestPermissions()
                }
                .buttonStyle(PrimaryButtonStyle())
                
                Button("Not Now") {
                    dismiss()
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
    }
}

#Preview {
    InterviewQuestionView()
        .environmentObject(AppViewModel())
}