import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Heart, Users, Clock, Sparkles } from 'lucide-react';
import type { User } from '../types';

interface OnboardingFlowProps {
  onComplete: (user: User) => void;
}

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: "Welcome to Legacy.AI",
    subtitle: "Preserve Your Story Forever",
    description: "Create a lasting digital legacy by recording your life stories, wisdom, and experiences for future generations.",
    icon: Heart,
    color: "from-red-400 to-pink-500"
  },
  {
    id: 2,
    title: "Share Your Wisdom",
    subtitle: "Guided Interview Experience",
    description: "Answer thoughtfully crafted questions about your life journey, from childhood memories to career achievements.",
    icon: Users,
    color: "from-blue-400 to-indigo-500"
  },
  {
    id: 3,
    title: "AI-Powered Processing",
    subtitle: "Your Voice, Preserved",
    description: "Our AI technology transcribes your stories and creates a searchable archive of your memories and insights.",
    icon: Sparkles,
    color: "from-purple-400 to-pink-500"
  },
  {
    id: 4,
    title: "Timeless Connection",
    subtitle: "Bridge Generations",
    description: "Enable future family members to connect with your stories and wisdom through an interactive AI avatar.",
    icon: Clock,
    color: "from-green-400 to-blue-500"
  }
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setShowAuth(true);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create user object
    const user: User = {
      id: crypto.randomUUID(),
      name: formData.name || undefined,
      email: formData.email || undefined,
      isGuest: false,
      createdAt: new Date()
    };

    onComplete(user);
  };

  const handleGuestContinue = () => {
    const guestUser: User = {
      id: crypto.randomUUID(),
      isGuest: true,
      createdAt: new Date()
    };

    onComplete(guestUser);
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
              </h2>
              <p className="text-gray-600">
                {authMode === 'signup' 
                  ? 'Start preserving your legacy today' 
                  : 'Continue your legacy journey'
                }
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field"
                  placeholder="Create a password"
                  required
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input-field"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              )}

              <button type="submit" className="w-full btn-primary">
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {authMode === 'signup' 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleGuestContinue}
                className="w-full btn-secondary"
              >
                Continue as Guest
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                You can create an account later to save your progress
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Slide Content */}
          <div className="animate-fade-in">
            <div className={`w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r ${slide.color} flex items-center justify-center`}>
              <Icon size={40} className="text-white" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {slide.title}
            </h1>
            
            <h2 className="text-xl md:text-2xl text-primary-600 font-semibold mb-6">
              {slide.subtitle}
            </h2>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center max-w-md mx-auto">
            <button
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentSlide === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>

            <span className="text-sm text-gray-500">
              {currentSlide + 1} of {slides.length}
            </span>

            <button
              onClick={handleNext}
              className="flex items-center space-x-2 btn-primary"
            >
              <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;