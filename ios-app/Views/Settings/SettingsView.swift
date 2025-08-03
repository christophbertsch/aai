import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @EnvironmentObject var uploadManager: UploadManager
    @State private var showingSignOutAlert = false
    @State private var showingClearDataAlert = false
    @State private var showingPersonalityTest = false
    
    var body: some View {
        NavigationView {
            List {
                // Profile Section
                Section {
                    ProfileCard()
                } header: {
                    Text("Profile")
                }
                
                // Interview Settings
                Section {
                    NavigationLink(destination: InterviewSettingsView()) {
                        SettingsRow(
                            icon: "video.circle.fill",
                            title: "Interview Settings",
                            subtitle: "Video quality, auto-save preferences"
                        )
                    }
                    
                    NavigationLink(destination: UploadSettingsView()) {
                        SettingsRow(
                            icon: "icloud.and.arrow.up",
                            title: "Upload Settings",
                            subtitle: "Background uploads, retry settings"
                        )
                    }
                } header: {
                    Text("Recording")
                }
                
                // Privacy & Security
                Section {
                    NavigationLink(destination: PrivacySettingsView()) {
                        SettingsRow(
                            icon: "lock.shield.fill",
                            title: "Privacy & Security",
                            subtitle: "Access permissions, after-death mode"
                        )
                    }
                    
                    NavigationLink(destination: DataManagementView()) {
                        SettingsRow(
                            icon: "externaldrive.fill",
                            title: "Data Management",
                            subtitle: "Storage, export, backup options"
                        )
                    }
                } header: {
                    Text("Privacy")
                }
                
                // Personality
                Section {
                    Button {
                        showingPersonalityTest = true
                    } label: {
                        SettingsRow(
                            icon: "brain.head.profile",
                            title: "Personality Assessment",
                            subtitle: appViewModel.currentUser?.personalityProfile != nil ? "Retake assessment" : "Take assessment"
                        )
                    }
                    .foregroundColor(.primary)
                    
                    if appViewModel.currentUser?.personalityProfile != nil {
                        NavigationLink(destination: PersonalityResultsDetailView()) {
                            SettingsRow(
                                icon: "chart.bar.fill",
                                title: "View Personality Profile",
                                subtitle: "See your Big Five results"
                            )
                        }
                    }
                } header: {
                    Text("Personality")
                }
                
                // Support
                Section {
                    NavigationLink(destination: HelpView()) {
                        SettingsRow(
                            icon: "questionmark.circle.fill",
                            title: "Help & Support",
                            subtitle: "FAQs, contact support"
                        )
                    }
                    
                    NavigationLink(destination: AboutView()) {
                        SettingsRow(
                            icon: "info.circle.fill",
                            title: "About Legacy.AI",
                            subtitle: "Version, terms, privacy policy"
                        )
                    }
                } header: {
                    Text("Support")
                }
                
                // Account Actions
                Section {
                    if !appViewModel.currentUser?.isGuest ?? true {
                        Button("Sign Out") {
                            showingSignOutAlert = true
                        }
                        .foregroundColor(.red)
                    }
                    
                    Button("Clear All Data") {
                        showingClearDataAlert = true
                    }
                    .foregroundColor(.red)
                } header: {
                    Text("Account")
                }
                
                // Upload Queue Status
                if !uploadManager.uploadQueue.isEmpty {
                    Section {
                        UploadQueueView()
                    } header: {
                        Text("Upload Queue")
                    }
                }
            }
            .navigationTitle("Settings")
        }
        .alert("Sign Out?", isPresented: $showingSignOutAlert) {
            Button("Sign Out", role: .destructive) {
                appViewModel.signOut()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("You'll need to sign in again to access your account.")
        }
        .alert("Clear All Data?", isPresented: $showingClearDataAlert) {
            Button("Clear Data", role: .destructive) {
                appViewModel.clearAllData()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will permanently delete all your recordings and data. This action cannot be undone.")
        }
        .sheet(isPresented: $showingPersonalityTest) {
            PersonalityTestView()
        }
    }
}

struct ProfileCard: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        HStack(spacing: 16) {
            // Avatar
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 60, height: 60)
                .overlay(
                    Text(initials)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
            
            // User Info
            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.headline)
                    .fontWeight(.medium)
                
                Text(accountType)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                if let session = appViewModel.currentSession {
                    Text("\(Int(session.totalProgress * 100))% complete")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
    }
    
    private var displayName: String {
        if let user = appViewModel.currentUser {
            return user.name ?? user.email ?? "Guest User"
        }
        return "Guest User"
    }
    
    private var accountType: String {
        if let user = appViewModel.currentUser {
            return user.isGuest ? "Guest Account" : "Legacy.AI Member"
        }
        return "Guest Account"
    }
    
    private var initials: String {
        if let user = appViewModel.currentUser,
           let name = user.name ?? user.email {
            let components = name.components(separatedBy: " ")
            if components.count >= 2 {
                return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
            } else {
                return String(name.prefix(2)).uppercased()
            }
        }
        return "GU"
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let subtitle: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.blue)
                .frame(width: 24, height: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct UploadQueueView: View {
    @EnvironmentObject var uploadManager: UploadManager
    
    var body: some View {
        VStack(spacing: 12) {
            ForEach(uploadManager.uploadQueue.prefix(3)) { recording in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Recording \(recording.id.uuidString.prefix(8))...")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        Text(recording.uploadStatus.rawValue.capitalized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    if recording.uploadStatus == .uploading {
                        ProgressView(value: uploadManager.uploadProgress)
                            .frame(width: 50)
                    } else {
                        UploadStatusBadge(status: recording.uploadStatus)
                    }
                }
            }
            
            if uploadManager.uploadQueue.count > 3 {
                Text("+ \(uploadManager.uploadQueue.count - 3) more")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if uploadManager.uploadQueue.contains(where: { $0.uploadStatus == .failed }) {
                Button("Retry Failed Uploads") {
                    uploadManager.retryFailedUploads()
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
        }
    }
}

// MARK: - Settings Detail Views

struct InterviewSettingsView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        List {
            Section {
                Picker("Video Quality", selection: Binding(
                    get: { appViewModel.appSettings.videoQuality },
                    set: { quality in
                        var settings = appViewModel.appSettings
                        settings.videoQuality = quality
                        appViewModel.updateSettings(settings)
                    }
                )) {
                    ForEach(AppSettings.VideoQuality.allCases, id: \.self) { quality in
                        Text(quality.displayName).tag(quality)
                    }
                }
                
                Toggle("Auto-save Progress", isOn: Binding(
                    get: { appViewModel.appSettings.autoSaveEnabled },
                    set: { enabled in
                        var settings = appViewModel.appSettings
                        settings.autoSaveEnabled = enabled
                        appViewModel.updateSettings(settings)
                    }
                ))
            } header: {
                Text("Recording Preferences")
            }
        }
        .navigationTitle("Interview Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct UploadSettingsView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        List {
            Section {
                Toggle("Background Uploads", isOn: Binding(
                    get: { appViewModel.appSettings.allowsBackgroundUploads },
                    set: { enabled in
                        var settings = appViewModel.appSettings
                        settings.allowsBackgroundUploads = enabled
                        appViewModel.updateSettings(settings)
                    }
                ))
            } header: {
                Text("Upload Preferences")
            } footer: {
                Text("Allow uploads to continue when the app is in the background.")
            }
        }
        .navigationTitle("Upload Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacySettingsView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        List {
            Section {
                Toggle("After Death Mode", isOn: Binding(
                    get: { appViewModel.appSettings.afterDeathModeEnabled },
                    set: { enabled in
                        var settings = appViewModel.appSettings
                        settings.afterDeathModeEnabled = enabled
                        appViewModel.updateSettings(settings)
                    }
                ))
                
                Toggle("WhatsApp Integration", isOn: Binding(
                    get: { appViewModel.appSettings.whatsAppConnected },
                    set: { enabled in
                        var settings = appViewModel.appSettings
                        settings.whatsAppConnected = enabled
                        appViewModel.updateSettings(settings)
                    }
                ))
            } header: {
                Text("Legacy Features")
            } footer: {
                Text("After Death Mode reveals your AI avatar only after your passing. WhatsApp integration allows family to chat with your AI.")
            }
        }
        .navigationTitle("Privacy & Security")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataManagementView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        List {
            Section {
                HStack {
                    Text("Cache Size")
                    Spacer()
                    Text(appViewModel.getCacheSize())
                        .foregroundColor(.secondary)
                }
                
                Button("Clear Cache") {
                    // Clear cache implementation
                }
                .foregroundColor(.blue)
            } header: {
                Text("Storage")
            }
            
            Section {
                Button("Export All Recordings") {
                    // Export implementation
                }
                .foregroundColor(.blue)
                
                Button("Backup to iCloud") {
                    // Backup implementation
                }
                .foregroundColor(.blue)
            } header: {
                Text("Data Export")
            }
        }
        .navigationTitle("Data Management")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PersonalityResultsDetailView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        ScrollView {
            if let profile = appViewModel.currentUser?.personalityProfile {
                VStack(spacing: 24) {
                    PersonalityTraitView(
                        name: "Extraversion",
                        score: profile.extraversion,
                        description: "How outgoing and social you are"
                    )
                    
                    PersonalityTraitView(
                        name: "Agreeableness",
                        score: profile.agreeableness,
                        description: "How cooperative and trusting you are"
                    )
                    
                    PersonalityTraitView(
                        name: "Conscientiousness",
                        score: profile.conscientiousness,
                        description: "How organized and disciplined you are"
                    )
                    
                    PersonalityTraitView(
                        name: "Neuroticism",
                        score: profile.neuroticism,
                        description: "How emotionally stable you are"
                    )
                    
                    PersonalityTraitView(
                        name: "Openness",
                        score: profile.openness,
                        description: "How open to new experiences you are"
                    )
                }
                .padding()
            }
        }
        .navigationTitle("Personality Profile")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct HelpView: View {
    var body: some View {
        List {
            Section("Getting Started") {
                Text("How to record your first video")
                Text("Understanding the interview process")
                Text("Managing your recordings")
            }
            
            Section("Technical Support") {
                Text("Troubleshooting upload issues")
                Text("Camera and microphone problems")
                Text("Account and sync issues")
            }
            
            Section("Contact") {
                Text("Email: support@legacy-ai.com")
                Text("Phone: 1-800-LEGACY")
            }
        }
        .navigationTitle("Help & Support")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AboutView: View {
    var body: some View {
        List {
            Section {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Build")
                    Spacer()
                    Text("2024.1")
                        .foregroundColor(.secondary)
                }
            } header: {
                Text("App Information")
            }
            
            Section {
                Text("Terms of Service")
                Text("Privacy Policy")
                Text("Open Source Licenses")
            } header: {
                Text("Legal")
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppViewModel())
        .environmentObject(UploadManager.shared)
}