import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var currentPage = 0
    @State private var showingAuthSheet = false
    
    private let pages = [
        OnboardingPage(
            title: "Preserve Your Legacy",
            subtitle: "Record your life stories, wisdom, and voice for future generations",
            imageName: "person.2.circle.fill",
            description: "Legacy.AI helps you create a lasting digital legacy through personalized video interviews that capture your unique story and personality."
        ),
        OnboardingPage(
            title: "AI-Powered Conversations",
            subtitle: "Your recordings become an interactive AI avatar",
            imageName: "brain.head.profile",
            description: "Advanced AI technology processes your videos to create transcriptions, voice cloning, and semantic understanding for meaningful conversations."
        ),
        OnboardingPage(
            title: "Secure & Private",
            subtitle: "Your memories are safely stored and protected",
            imageName: "lock.shield.fill",
            description: "All your recordings are encrypted and securely stored in the cloud, with full control over who can access your legacy."
        ),
        OnboardingPage(
            title: "Ready to Begin?",
            subtitle: "Start your legacy journey today",
            imageName: "heart.circle.fill",
            description: "Join thousands of people preserving their stories for loved ones. Your legacy matters, and every story deserves to be told."
        )
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Page indicator
            HStack {
                ForEach(0..<pages.count, id: \.self) { index in
                    Circle()
                        .fill(index == currentPage ? Color.primary : Color.secondary.opacity(0.3))
                        .frame(width: 8, height: 8)
                        .animation(.easeInOut, value: currentPage)
                }
            }
            .padding(.top, 20)
            
            // Content
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    OnboardingPageView(page: pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            .animation(.easeInOut, value: currentPage)
            
            // Bottom buttons
            VStack(spacing: 16) {
                if currentPage == pages.count - 1 {
                    // Final page - show auth options
                    VStack(spacing: 12) {
                        Button("Sign Up") {
                            showingAuthSheet = true
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        
                        Button("Continue as Guest") {
                            appViewModel.continueAsGuest()
                            appViewModel.completeOnboarding()
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                } else {
                    // Navigation buttons
                    HStack {
                        Button("Skip") {
                            appViewModel.continueAsGuest()
                            appViewModel.completeOnboarding()
                        }
                        .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Button("Next") {
                            withAnimation {
                                currentPage += 1
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .sheet(isPresented: $showingAuthSheet) {
            AuthenticationView()
        }
    }
}

struct OnboardingPageView: View {
    let page: OnboardingPage
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Icon
            Image(systemName: page.imageName)
                .font(.system(size: 80))
                .foregroundColor(.primary)
                .symbolRenderingMode(.hierarchical)
            
            // Content
            VStack(spacing: 16) {
                Text(page.title)
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
                
                Text(page.subtitle)
                    .font(.title2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                
                Text(page.description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }
            
            Spacer()
        }
        .padding(.horizontal, 32)
    }
}

struct OnboardingPage {
    let title: String
    let subtitle: String
    let imageName: String
    let description: String
}

// MARK: - Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                LinearGradient(
                    colors: [Color.blue, Color.purple],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(25)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(25)
            .overlay(
                RoundedRectangle(cornerRadius: 25)
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

#Preview {
    OnboardingView()
        .environmentObject(AppViewModel())
}