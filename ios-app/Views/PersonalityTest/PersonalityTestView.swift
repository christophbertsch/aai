import SwiftUI

struct PersonalityTestView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var currentQuestionIndex = 0
    @State private var responses: [Int] = Array(repeating: 0, count: 20)
    @State private var showingResults = false
    @State private var showingSkipAlert = false
    
    private let questions = PersonalityQuestion.questions
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Progress Bar
                ProgressView(value: Double(currentQuestionIndex + 1), total: Double(questions.count))
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                    .padding(.horizontal)
                    .padding(.top)
                
                // Question Counter
                Text("\(currentQuestionIndex + 1) of \(questions.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 8)
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Header
                        VStack(spacing: 16) {
                            Image(systemName: "brain.head.profile")
                                .font(.system(size: 50))
                                .foregroundColor(.blue)
                            
                            Text("Personality Assessment")
                                .font(.title2)
                                .fontWeight(.bold)
                            
                            Text("This helps us understand your personality to create a more authentic AI avatar.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 20)
                        
                        // Current Question
                        VStack(spacing: 24) {
                            Text(questions[currentQuestionIndex].text)
                                .font(.title3)
                                .fontWeight(.medium)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 16)
                            
                            // Likert Scale
                            VStack(spacing: 16) {
                                HStack {
                                    Text("Strongly\nDisagree")
                                        .font(.caption)
                                        .multilineTextAlignment(.center)
                                        .foregroundColor(.secondary)
                                    
                                    Spacer()
                                    
                                    Text("Neutral")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    Spacer()
                                    
                                    Text("Strongly\nAgree")
                                        .font(.caption)
                                        .multilineTextAlignment(.center)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 8)
                                
                                HStack(spacing: 12) {
                                    ForEach(1...5, id: \.self) { value in
                                        Button {
                                            withAnimation(.easeInOut(duration: 0.2)) {
                                                responses[currentQuestionIndex] = value
                                            }
                                        } label: {
                                            Circle()
                                                .fill(responses[currentQuestionIndex] == value ? Color.blue : Color.secondary.opacity(0.2))
                                                .frame(width: 50, height: 50)
                                                .overlay(
                                                    Text("\(value)")
                                                        .font(.headline)
                                                        .fontWeight(.medium)
                                                        .foregroundColor(responses[currentQuestionIndex] == value ? .white : .primary)
                                                )
                                                .scaleEffect(responses[currentQuestionIndex] == value ? 1.1 : 1.0)
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                        
                        Spacer(minLength: 40)
                    }
                }
                
                // Navigation Buttons
                HStack(spacing: 16) {
                    if currentQuestionIndex > 0 {
                        Button("Previous") {
                            withAnimation {
                                currentQuestionIndex -= 1
                            }
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .frame(maxWidth: .infinity)
                    }
                    
                    Button(currentQuestionIndex == questions.count - 1 ? "Complete" : "Next") {
                        if currentQuestionIndex == questions.count - 1 {
                            completeTest()
                        } else {
                            withAnimation {
                                currentQuestionIndex += 1
                            }
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: .infinity)
                    .disabled(responses[currentQuestionIndex] == 0)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Skip") {
                        showingSkipAlert = true
                    }
                }
            }
        }
        .alert("Skip Personality Test?", isPresented: $showingSkipAlert) {
            Button("Skip", role: .destructive) {
                appViewModel.completePersonalityTest(responses: [])
            }
            Button("Continue Test", role: .cancel) { }
        } message: {
            Text("The personality test helps create a more authentic AI avatar. You can always take it later in settings.")
        }
        .sheet(isPresented: $showingResults) {
            PersonalityResultsView(responses: responses)
        }
    }
    
    private func completeTest() {
        showingResults = true
        appViewModel.completePersonalityTest(responses: responses)
    }
}

struct PersonalityResultsView: View {
    let responses: [Int]
    @Environment(\.dismiss) private var dismiss
    
    private var personalityProfile: PersonalityProfile {
        PersonalityProfile(responses: responses)
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.green)
                        
                        Text("Assessment Complete!")
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Text("Here's your personality profile based on the Big Five model:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 20)
                    
                    // Personality Traits
                    VStack(spacing: 16) {
                        PersonalityTraitView(
                            name: "Extraversion",
                            score: personalityProfile.extraversion,
                            description: "How outgoing and social you are"
                        )
                        
                        PersonalityTraitView(
                            name: "Agreeableness",
                            score: personalityProfile.agreeableness,
                            description: "How cooperative and trusting you are"
                        )
                        
                        PersonalityTraitView(
                            name: "Conscientiousness",
                            score: personalityProfile.conscientiousness,
                            description: "How organized and disciplined you are"
                        )
                        
                        PersonalityTraitView(
                            name: "Neuroticism",
                            score: personalityProfile.neuroticism,
                            description: "How emotionally stable you are"
                        )
                        
                        PersonalityTraitView(
                            name: "Openness",
                            score: personalityProfile.openness,
                            description: "How open to new experiences you are"
                        )
                    }
                    .padding(.horizontal, 16)
                    
                    // Info Box
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "info.circle.fill")
                                .foregroundColor(.blue)
                            Text("How this helps")
                                .fontWeight(.medium)
                        }
                        
                        Text("Your personality profile will be used to adjust the tone and responses of your AI avatar, making it more authentic to who you are.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                    
                    Button("Continue to Interview") {
                        dismiss()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.horizontal, 32)
                }
            }
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

struct PersonalityTraitView: View {
    let name: String
    let score: Double
    let description: String
    
    private var scorePercentage: Double {
        (score - 1) / 4 // Convert 1-5 scale to 0-1
    }
    
    private var scoreLevel: String {
        switch score {
        case 1..<2: return "Low"
        case 2..<3: return "Below Average"
        case 3..<4: return "Average"
        case 4..<5: return "Above Average"
        default: return "High"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(name)
                    .font(.headline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(scoreLevel)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
            }
            
            Text(description)
                .font(.caption)
                .foregroundColor(.secondary)
            
            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.2))
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * scorePercentage, height: 8)
                        .cornerRadius(4)
                        .animation(.easeInOut(duration: 0.5), value: scorePercentage)
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(12)
    }
}

#Preview {
    PersonalityTestView()
        .environmentObject(AppViewModel())
}