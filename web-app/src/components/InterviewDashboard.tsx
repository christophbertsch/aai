import React from 'react';
import { Play, RotateCcw, BookOpen, Video, Clock, CheckCircle, Circle } from 'lucide-react';
import type { User, InterviewSession } from '../types';

interface InterviewDashboardProps {
  user: User | null;
  session: InterviewSession | null;
  onStartInterview: () => void;
  onContinueInterview: () => void;
  onTakePersonalityTest: () => void;
}

const InterviewDashboard: React.FC<InterviewDashboardProps> = ({
  user,
  session,
  onStartInterview,
  onContinueInterview,
  onTakePersonalityTest
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTotalQuestions = () => {
    if (!session) return 0;
    return session.modules.reduce((total, module) => total + module.totalQuestions, 0);
  };

  const getCompletedQuestions = () => {
    if (!session) return 0;
    return session.completedRecordings.length;
  };

  const getProgressPercentage = () => {
    const total = getTotalQuestions();
    const completed = getCompletedQuestions();
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getCurrentModule = () => {
    if (!session) return null;
    return session.modules[session.currentModuleIndex];
  };

  const getCurrentQuestion = () => {
    const currentModule = getCurrentModule();
    if (!currentModule) return null;
    return currentModule.questions[session!.currentQuestionIndex];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getGreeting()}, {user?.name || 'there'}!
          </h1>
          <p className="text-gray-600">
            {session ? 'Continue building your legacy' : 'Ready to start preserving your story?'}
          </p>
        </div>

        {/* Progress Overview */}
        {session && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Progress</h2>
              <div className="text-sm text-gray-500">
                {getCompletedQuestions()} of {getTotalQuestions()} questions completed
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            <div className="text-center text-2xl font-bold text-primary-600 mb-4">
              {getProgressPercentage().toFixed(1)}% Complete
            </div>

            {getCurrentQuestion() && (
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="font-semibold text-primary-900 mb-2">Next Question:</h3>
                <p className="text-primary-800 mb-3">{getCurrentQuestion()?.question}</p>
                <div className="text-sm text-primary-600">
                  Module: {getCurrentModule()?.name}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Start/Continue Interview */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-4">
                {session ? <RotateCcw size={24} className="text-white" /> : <Play size={24} className="text-white" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {session ? 'Continue Interview' : 'Start Interview'}
                </h3>
                <p className="text-sm text-gray-600">
                  {session ? 'Pick up where you left off' : 'Begin your legacy journey'}
                </p>
              </div>
            </div>
            <button
              onClick={session ? onContinueInterview : onStartInterview}
              className="w-full btn-primary"
            >
              {session ? 'Continue Recording' : 'Start Recording'}
            </button>
          </div>

          {/* Personality Profile */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Personality Profile</h3>
                <p className="text-sm text-gray-600">
                  {user?.personalityProfile ? 'View your results' : 'Take the assessment'}
                </p>
              </div>
            </div>
            {user?.personalityProfile ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Extraversion:</span>
                  <span className="font-medium">{user.personalityProfile.extraversion.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Agreeableness:</span>
                  <span className="font-medium">{user.personalityProfile.agreeableness.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conscientiousness:</span>
                  <span className="font-medium">{user.personalityProfile.conscientiousness.toFixed(1)}</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={onTakePersonalityTest}
                className="w-full btn-secondary"
              >
                Take Assessment
              </button>
            )}
          </div>

          {/* Recording Stats */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-4">
                <Video size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recording Stats</h3>
                <p className="text-sm text-gray-600">Your progress overview</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Recordings:</span>
                <span className="font-medium">{getCompletedQuestions()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Duration:</span>
                <span className="font-medium">
                  {session ? 
                    `${Math.round(session.completedRecordings.reduce((total, r) => total + r.duration, 0) / 60)} min` : 
                    '0 min'
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Completion:</span>
                <span className="font-medium">{getProgressPercentage().toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Overview */}
        {session && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Interview Modules</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {session.modules.map((module, index) => {
                const isActive = index === session.currentModuleIndex;
                const isCompleted = module.completedQuestions === module.totalQuestions;
                const progress = (module.completedQuestions / module.totalQuestions) * 100;

                return (
                  <div
                    key={module.name}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-primary-500 bg-primary-50'
                        : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{module.name}</h3>
                      {isCompleted ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : isActive ? (
                        <Clock size={20} className="text-primary-500" />
                      ) : (
                        <Circle size={20} className="text-gray-400" />
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {module.completedQuestions} of {module.totalQuestions} questions
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Getting Started Guide */}
        {!session && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">1</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Answer Questions</h3>
                <p className="text-sm text-gray-600">
                  Respond to thoughtfully crafted questions about your life story
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">2</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Record Videos</h3>
                <p className="text-sm text-gray-600">
                  Share your stories through personal video recordings
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">3</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Create Legacy</h3>
                <p className="text-sm text-gray-600">
                  Build an AI avatar that preserves your wisdom for future generations
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewDashboard;