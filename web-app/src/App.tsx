import { useState, useEffect } from 'react';
import type { User, AppSettings, InterviewSession, InterviewQuestion } from './types';
import OnboardingFlow from './components/OnboardingFlow';
import PersonalityTest from './components/PersonalityTest';
import InterviewDashboard from './components/InterviewDashboard';
import VideoRecorder from './components/VideoRecorder';
import Library from './components/Library';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import { useLocalStorage } from './hooks/useLocalStorage';
import questionsData from './data/legacy_ai_first_100_questions.json';

type AppView = 'onboarding' | 'personality-test' | 'dashboard' | 'interview' | 'library' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [user, setUser] = useLocalStorage<User | null>('legacy-ai-user', null);
  const [settings, setSettings] = useLocalStorage<AppSettings>('legacy-ai-settings', {
    hasCompletedOnboarding: false,
    hasCompletedPersonalityTest: false,
    allowsBackgroundUploads: true,
    videoQuality: 'high' as any,
    autoSaveEnabled: true,
    afterDeathModeEnabled: false,
    whatsAppConnected: false,
    notificationsEnabled: true,
  });
  const [session, setSession] = useLocalStorage<InterviewSession | null>('legacy-ai-session', null);
  // Initialize app state
  useEffect(() => {
    if (settings.hasCompletedOnboarding) {
      if (!settings.hasCompletedPersonalityTest) {
        setCurrentView('personality-test');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [settings]);

  // Create interview modules from questions data
  const createInterviewModules = () => {
    const rawQuestions = questionsData as Array<{
      module: string;
      question_number: number;
      question: string;
    }>;
    
    // Transform raw questions to InterviewQuestion format
    const questions: InterviewQuestion[] = rawQuestions.map(q => ({
      id: crypto.randomUUID(),
      module: q.module,
      questionNumber: q.question_number,
      question: q.question
    }));
    
    const moduleMap = new Map();
    
    questions.forEach(q => {
      if (!moduleMap.has(q.module)) {
        moduleMap.set(q.module, []);
      }
      moduleMap.get(q.module).push(q);
    });

    return Array.from(moduleMap.entries()).map(([name, questions]) => ({
      name,
      questions,
      completedQuestions: 0,
      totalQuestions: questions.length
    }));
  };

  const handleOnboardingComplete = (userData: User) => {
    setUser(userData);
    setSettings(prev => ({ ...prev, hasCompletedOnboarding: true }));
    setCurrentView('personality-test');
  };

  const handlePersonalityTestComplete = (profile: any) => {
    if (user) {
      setUser({ ...user, personalityProfile: profile });
    }
    setSettings(prev => ({ ...prev, hasCompletedPersonalityTest: true }));
    setCurrentView('dashboard');
  };

  const handleStartInterview = () => {
    if (!session && user) {
      const modules = createInterviewModules();
      const newSession: InterviewSession = {
        id: crypto.randomUUID(),
        userId: user.id,
        modules,
        currentModuleIndex: 0,
        currentQuestionIndex: 0,
        completedRecordings: [],
        isCompleted: false,
        totalProgress: 0,
        createdAt: new Date(),
      };
      setSession(newSession);
    }
    setCurrentView('interview');
  };

  const handleRecordingComplete = (recording: any) => {
    if (session) {
      const updatedSession = {
        ...session,
        completedRecordings: [...session.completedRecordings, recording]
      };
      setSession(updatedSession);
    }
    setCurrentView('dashboard');
  };

  const getCurrentQuestion = () => {
    if (!session) return null;
    const currentModule = session.modules[session.currentModuleIndex];
    if (!currentModule) return null;
    return currentModule.questions[session.currentQuestionIndex];
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'onboarding':
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;
      
      case 'personality-test':
        return (
          <PersonalityTest 
            onComplete={handlePersonalityTestComplete}
            onSkip={() => {
              setSettings(prev => ({ ...prev, hasCompletedPersonalityTest: true }));
              setCurrentView('dashboard');
            }}
          />
        );
      
      case 'dashboard':
        return (
          <InterviewDashboard 
            user={user}
            session={session}
            onStartInterview={handleStartInterview}
            onContinueInterview={() => setCurrentView('interview')}
            onTakePersonalityTest={() => setCurrentView('personality-test')}
          />
        );
      
      case 'interview':
        const currentQuestion = getCurrentQuestion();
        return currentQuestion ? (
          <VideoRecorder 
            question={currentQuestion}
            onRecordingComplete={handleRecordingComplete}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Question Available</h2>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="btn-primary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      
      case 'library':
        return (
          <Library 
            recordings={session?.completedRecordings || []}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'settings':
        return (
          <Settings 
            settings={settings}
            onSettingsChange={setSettings}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      default:
        return <div>Unknown view</div>;
    }
  };

  const showNavigation = settings.hasCompletedOnboarding && currentView !== 'onboarding' && currentView !== 'personality-test';

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && (
        <Navigation 
          currentView={currentView}
          onViewChange={setCurrentView}
          user={user}
        />
      )}
      
      <main className={showNavigation ? 'pt-16' : ''}>
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;