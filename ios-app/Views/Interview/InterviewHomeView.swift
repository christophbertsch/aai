import SwiftUI

struct InterviewHomeView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var showingNewSessionAlert = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "video.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.primary)
                        
                        Text("Your Legacy Interview")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        if let user = appViewModel.currentUser {
                            Text("Welcome back, \(user.name ?? "there")!")
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.top, 20)
                    
                    // Current Session Status
                    if let session = appViewModel.currentSession {
                        CurrentSessionCard(session: session)
                    } else {
                        NewSessionCard()
                    }
                    
                    // Modules Overview
                    if let session = appViewModel.currentSession {
                        ModulesOverviewCard(session: session)
                    }
                    
                    // Quick Stats
                    if let session = appViewModel.currentSession {
                        QuickStatsCard(session: session)
                    }
                }
                .padding(.horizontal, 16)
            }
            .navigationTitle("Interview")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        if appViewModel.currentSession != nil {
                            Button("New Session") {
                                showingNewSessionAlert = true
                            }
                        }
                        
                        Button("Settings") {
                            // Navigate to settings
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .alert("Start New Session?", isPresented: $showingNewSessionAlert) {
            Button("Start New", role: .destructive) {
                appViewModel.startNewSession()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will start a new interview session. Your current progress will be saved.")
        }
    }
}

struct CurrentSessionCard: View {
    let session: InterviewSession
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current Session")
                        .font(.headline)
                        .fontWeight(.medium)
                    
                    Text("Started \(session.startedAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                CircularProgressView(progress: session.totalProgress)
                    .frame(width: 50, height: 50)
            }
            
            // Progress Details
            VStack(spacing: 8) {
                HStack {
                    Text("Overall Progress")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text("\(Int(session.totalProgress * 100))%")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                }
                
                ProgressView(value: session.totalProgress)
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
            }
            
            // Current Question Info
            if let currentModule = session.currentModule,
               let currentQuestion = session.currentQuestion {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Next Question")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    Text(currentModule.name)
                        .font(.caption)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                    
                    Text(currentQuestion.question)
                        .font(.subheadline)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            // Continue Button
            NavigationLink(destination: InterviewQuestionView()) {
                HStack {
                    Image(systemName: "play.circle.fill")
                    Text(session.totalProgress > 0 ? "Continue Interview" : "Start Interview")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .cornerRadius(25)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(16)
    }
}

struct NewSessionCard: View {
    @EnvironmentObject var appViewModel: AppViewModel
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 50))
                .foregroundColor(.blue)
            
            VStack(spacing: 8) {
                Text("Ready to Start?")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Begin your legacy interview with thoughtful questions about your life story.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            Button("Start Your Interview") {
                appViewModel.startNewSession()
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding(24)
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(16)
    }
}

struct ModulesOverviewCard: View {
    let session: InterviewSession
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Interview Modules")
                .font(.headline)
                .fontWeight(.medium)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(session.modules.indices, id: \.self) { index in
                    ModuleProgressCard(
                        module: session.modules[index],
                        isCurrent: index == session.currentModuleIndex
                    )
                }
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(16)
    }
}

struct ModuleProgressCard: View {
    let module: InterviewModule
    let isCurrent: Bool
    
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(module.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)
                
                Spacer()
                
                if isCurrent {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                }
            }
            
            HStack {
                Text("\(module.completedQuestions)/\(module.questions.count)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("\(Int(module.progress * 100))%")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(isCurrent ? .blue : .secondary)
            }
            
            ProgressView(value: module.progress)
                .progressViewStyle(LinearProgressViewStyle(tint: isCurrent ? .blue : .secondary))
        }
        .padding(12)
        .background(isCurrent ? Color.blue.opacity(0.1) : Color.secondary.opacity(0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCurrent ? Color.blue.opacity(0.3) : Color.clear, lineWidth: 1)
        )
    }
}

struct QuickStatsCard: View {
    let session: InterviewSession
    
    private var totalQuestions: Int {
        session.modules.reduce(0) { $0 + $1.questions.count }
    }
    
    private var completedQuestions: Int {
        session.modules.reduce(0) { $0 + $1.completedQuestions }
    }
    
    private var estimatedTimeRemaining: String {
        let remaining = totalQuestions - completedQuestions
        let minutes = remaining * 3 // Assume 3 minutes per question
        
        if minutes < 60 {
            return "\(minutes) min"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            return "\(hours)h \(remainingMinutes)m"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Quick Stats")
                .font(.headline)
                .fontWeight(.medium)
            
            HStack(spacing: 20) {
                StatItem(
                    title: "Completed",
                    value: "\(completedQuestions)",
                    subtitle: "questions",
                    color: .green
                )
                
                StatItem(
                    title: "Remaining",
                    value: "\(totalQuestions - completedQuestions)",
                    subtitle: "questions",
                    color: .orange
                )
                
                StatItem(
                    title: "Est. Time",
                    value: estimatedTimeRemaining,
                    subtitle: "remaining",
                    color: .blue
                )
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(16)
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct CircularProgressView: View {
    let progress: Double
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.2), lineWidth: 4)
            
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.5), value: progress)
            
            Text("\(Int(progress * 100))%")
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

#Preview {
    InterviewHomeView()
        .environmentObject(AppViewModel())
}