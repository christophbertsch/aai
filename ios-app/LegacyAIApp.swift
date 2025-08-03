import SwiftUI

@main
struct LegacyAIApp: App {
    @StateObject private var appViewModel = AppViewModel()
    @StateObject private var uploadManager = UploadManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appViewModel)
                .environmentObject(uploadManager)
                .onAppear {
                    uploadManager.enableBackgroundUploads()
                }
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        Group {
            if appViewModel.shouldShowOnboarding {
                OnboardingView()
            } else if appViewModel.shouldShowPersonalityTest {
                PersonalityTestView()
            } else {
                MainTabView()
            }
        }
        .alert("Error", isPresented: .constant(appViewModel.errorMessage != nil)) {
            Button("OK") {
                appViewModel.errorMessage = nil
            }
        } message: {
            if let errorMessage = appViewModel.errorMessage {
                Text(errorMessage)
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        TabView {
            InterviewHomeView()
                .tabItem {
                    Image(systemName: "video.circle")
                    Text("Interview")
                }
            
            LibraryView()
                .tabItem {
                    Image(systemName: "folder.circle")
                    Text("Library")
                }
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear.circle")
                    Text("Settings")
                }
        }
        .accentColor(.primary)
    }
}