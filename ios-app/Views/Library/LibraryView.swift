import SwiftUI

struct LibraryView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var searchText = ""
    @State private var selectedFilter: LibraryFilter = .all
    @State private var showingFilterSheet = false
    
    private var filteredRecordings: [VideoRecording] {
        guard let session = appViewModel.currentSession else { return [] }
        
        let allRecordings = session.modules.flatMap { module in
            module.questions.compactMap { question in
                question.recording
            }
        }
        
        var filtered = allRecordings
        
        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { recording in
                // Search in transcript if available
                if let transcript = recording.transcript {
                    return transcript.localizedCaseInsensitiveContains(searchText)
                }
                
                // Search in question text
                if let question = findQuestion(for: recording.questionId, in: session) {
                    return question.question.localizedCaseInsensitiveContains(searchText) ||
                           question.module.localizedCaseInsensitiveContains(searchText)
                }
                
                return false
            }
        }
        
        // Apply category filter
        switch selectedFilter {
        case .all:
            break
        case .module(let moduleName):
            filtered = filtered.filter { recording in
                if let question = findQuestion(for: recording.questionId, in: session) {
                    return question.module == moduleName
                }
                return false
            }
        case .uploaded:
            filtered = filtered.filter { $0.uploadStatus == .completed }
        case .pending:
            filtered = filtered.filter { $0.uploadStatus == .pending || $0.uploadStatus == .uploading }
        }
        
        return filtered.sorted { $0.recordedAt > $1.recordedAt }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Bar
                SearchBar(text: $searchText)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                
                // Filter Bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        FilterChip(
                            title: "All",
                            isSelected: selectedFilter == .all
                        ) {
                            selectedFilter = .all
                        }
                        
                        if let session = appViewModel.currentSession {
                            ForEach(session.modules, id: \.name) { module in
                                FilterChip(
                                    title: module.name,
                                    isSelected: selectedFilter == .module(module.name)
                                ) {
                                    selectedFilter = .module(module.name)
                                }
                            }
                        }
                        
                        FilterChip(
                            title: "Uploaded",
                            isSelected: selectedFilter == .uploaded
                        ) {
                            selectedFilter = .uploaded
                        }
                        
                        FilterChip(
                            title: "Pending",
                            isSelected: selectedFilter == .pending
                        ) {
                            selectedFilter = .pending
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 8)
                
                // Content
                if filteredRecordings.isEmpty {
                    EmptyLibraryView(hasRecordings: appViewModel.currentSession?.modules.contains { !$0.questions.allSatisfy { $0.recording == nil } } ?? false)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredRecordings) { recording in
                                RecordingCard(recording: recording)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Library")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Sort by Date") { }
                        Button("Sort by Module") { }
                        Button("Export All") { }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }
    
    private func findQuestion(for questionId: UUID, in session: InterviewSession) -> InterviewQuestion? {
        for module in session.modules {
            if let question = module.questions.first(where: { $0.id == questionId }) {
                return question
            }
        }
        return nil
    }
}

struct RecordingCard: View {
    let recording: VideoRecording
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var showingPlayer = false
    
    private var question: InterviewQuestion? {
        guard let session = appViewModel.currentSession else { return nil }
        
        for module in session.modules {
            if let question = module.questions.first(where: { $0.id == recording.questionId }) {
                return question
            }
        }
        return nil
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if let question = question {
                        Text(question.module)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                        
                        Text("Question \(question.questionNumber)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Upload Status
                UploadStatusBadge(status: recording.uploadStatus)
            }
            
            // Question Text
            if let question = question {
                Text(question.question)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)
            }
            
            // Transcript Preview
            if let transcript = recording.transcript {
                Text(transcript)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
                    .padding(.top, 4)
            }
            
            // Recording Info
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(formatDuration(recording.duration))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(recording.recordedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Action Buttons
            HStack(spacing: 12) {
                Button {
                    showingPlayer = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "play.circle.fill")
                        Text("Play")
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                }
                
                Spacer()
                
                Menu {
                    Button("Share") { }
                    Button("Export") { }
                    Button("Delete", role: .destructive) { }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(12)
        .sheet(isPresented: $showingPlayer) {
            VideoPlayerSheet(recording: recording)
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

struct VideoPlayerSheet: View {
    let recording: VideoRecording
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                VideoPlayerView(url: recording.localURL)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationTitle("Recording")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct UploadStatusBadge: View {
    let status: UploadStatus
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: statusIcon)
                .font(.caption)
            Text(statusText)
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(statusColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusColor.opacity(0.1))
        .cornerRadius(8)
    }
    
    private var statusIcon: String {
        switch status {
        case .pending: return "clock"
        case .uploading: return "arrow.up.circle"
        case .completed: return "checkmark.circle"
        case .failed: return "exclamationmark.triangle"
        case .retrying: return "arrow.clockwise"
        }
    }
    
    private var statusText: String {
        switch status {
        case .pending: return "Pending"
        case .uploading: return "Uploading"
        case .completed: return "Uploaded"
        case .failed: return "Failed"
        case .retrying: return "Retrying"
        }
    }
    
    private var statusColor: Color {
        switch status {
        case .pending: return .orange
        case .uploading: return .blue
        case .completed: return .green
        case .failed: return .red
        case .retrying: return .purple
        }
    }
}

struct EmptyLibraryView: View {
    let hasRecordings: Bool
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: hasRecordings ? "magnifyingglass" : "folder")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                Text(hasRecordings ? "No Results Found" : "No Recordings Yet")
                    .font(.title2)
                    .fontWeight(.medium)
                
                Text(hasRecordings ? "Try adjusting your search or filters" : "Start your interview to see your recordings here")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            if !hasRecordings {
                NavigationLink(destination: InterviewHomeView()) {
                    Text("Start Interview")
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .frame(width: 200, height: 50)
                        .background(Color.blue)
                        .cornerRadius(25)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            Spacer()
        }
        .padding(.horizontal, 32)
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search recordings...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
            
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(10)
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color.secondary.opacity(0.1))
                .cornerRadius(16)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

enum LibraryFilter: Equatable {
    case all
    case module(String)
    case uploaded
    case pending
}

#Preview {
    LibraryView()
        .environmentObject(AppViewModel())
}