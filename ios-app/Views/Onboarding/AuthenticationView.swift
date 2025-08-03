import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var isSignUp = true
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var name = ""
    @State private var showingPassword = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.primary)
                        
                        Text(isSignUp ? "Create Account" : "Welcome Back")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text(isSignUp ? "Join the Legacy.AI community" : "Sign in to continue your journey")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 20)
                    
                    // Form
                    VStack(spacing: 16) {
                        if isSignUp {
                            TextField("Full Name", text: $name)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.name)
                        }
                        
                        TextField("Email", text: $email)
                            .textFieldStyle(RoundedTextFieldStyle())
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                        
                        HStack {
                            if showingPassword {
                                TextField("Password", text: $password)
                                    .textContentType(isSignUp ? .newPassword : .password)
                            } else {
                                SecureField("Password", text: $password)
                                    .textContentType(isSignUp ? .newPassword : .password)
                            }
                            
                            Button {
                                showingPassword.toggle()
                            } label: {
                                Image(systemName: showingPassword ? "eye.slash" : "eye")
                                    .foregroundColor(.secondary)
                            }
                        }
                        .textFieldStyle(RoundedTextFieldStyle())
                        
                        if isSignUp {
                            SecureField("Confirm Password", text: $confirmPassword)
                                .textFieldStyle(RoundedTextFieldStyle())
                                .textContentType(.newPassword)
                        }
                    }
                    
                    // Action Button
                    Button {
                        handleAuthentication()
                    } label: {
                        if appViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text(isSignUp ? "Create Account" : "Sign In")
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!isFormValid || appViewModel.isLoading)
                    
                    // Toggle Sign Up/Sign In
                    HStack {
                        Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                            .foregroundColor(.secondary)
                        
                        Button(isSignUp ? "Sign In" : "Sign Up") {
                            withAnimation {
                                isSignUp.toggle()
                                clearForm()
                            }
                        }
                        .foregroundColor(.primary)
                        .fontWeight(.medium)
                    }
                    .font(.subheadline)
                    
                    // Guest Option
                    VStack(spacing: 8) {
                        Text("or")
                            .foregroundColor(.secondary)
                            .font(.subheadline)
                        
                        Button("Continue as Guest") {
                            appViewModel.continueAsGuest()
                            appViewModel.completeOnboarding()
                            dismiss()
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                    
                    // Privacy Note
                    Text("By creating an account, you agree to our Terms of Service and Privacy Policy. Your data is encrypted and secure.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)
                }
                .padding(.horizontal, 32)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var isFormValid: Bool {
        if isSignUp {
            return !email.isEmpty && 
                   !password.isEmpty && 
                   !confirmPassword.isEmpty && 
                   !name.isEmpty &&
                   password == confirmPassword &&
                   password.count >= 6 &&
                   email.contains("@")
        } else {
            return !email.isEmpty && 
                   !password.isEmpty &&
                   email.contains("@")
        }
    }
    
    private func handleAuthentication() {
        Task {
            if isSignUp {
                await appViewModel.signUp(email: email, password: password)
            } else {
                await appViewModel.signIn(email: email, password: password)
            }
            
            if appViewModel.currentUser != nil {
                appViewModel.completeOnboarding()
                dismiss()
            }
        }
    }
    
    private func clearForm() {
        email = ""
        password = ""
        confirmPassword = ""
        name = ""
    }
}

struct RoundedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
            )
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AppViewModel())
}