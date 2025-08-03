import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, SkipForward, Brain, BarChart3 } from 'lucide-react';
import { personalityQuestions, calculatePersonalityProfile, getTraitDescription } from '../data/personalityQuestions';
import type { PersonalityProfile } from '../types';

interface PersonalityTestProps {
  onComplete: (profile: PersonalityProfile) => void;
  onSkip: () => void;
}

const PersonalityTest: React.FC<PersonalityTestProps> = ({ onComplete, onSkip }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<number[]>(new Array(20).fill(0));
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleResponse = (rating: number) => {
    const newResponses = [...responses];
    newResponses[currentQuestion] = rating;
    setResponses(newResponses);
  };

  const handleNext = () => {
    if (currentQuestion < personalityQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate results
      const calculatedResults = calculatePersonalityProfile(responses);
      setResults(calculatedResults);
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleComplete = () => {
    const profile: PersonalityProfile = {
      id: crypto.randomUUID(),
      userId: '', // Will be set by parent
      responses,
      extraversion: results.extraversion,
      agreeableness: results.agreeableness,
      conscientiousness: results.conscientiousness,
      neuroticism: results.neuroticism,
      openness: results.openness,
      completedAt: new Date()
    };

    onComplete(profile);
  };

  const progress = ((currentQuestion + 1) / personalityQuestions.length) * 100;
  const canProceed = responses[currentQuestion] > 0;

  if (showResults) {
    const traits = [
      { name: 'Extraversion', score: results.extraversion, key: 'extraversion' },
      { name: 'Agreeableness', score: results.agreeableness, key: 'agreeableness' },
      { name: 'Conscientiousness', score: results.conscientiousness, key: 'conscientiousness' },
      { name: 'Neuroticism', score: results.neuroticism, key: 'neuroticism' },
      { name: 'Openness', score: results.openness, key: 'openness' }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
              <BarChart3 size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Personality Profile</h1>
            <p className="text-gray-600">Based on the Big Five personality traits</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {traits.map((trait) => (
              <div key={trait.name} className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{trait.name}</h3>
                  <span className="text-2xl font-bold text-primary-600">
                    {trait.score.toFixed(1)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(trait.score / 5) * 100}%` }}
                  />
                </div>
                
                <p className="text-sm text-gray-600">
                  {getTraitDescription(trait.key, trait.score)}
                </p>
              </div>
            ))}
          </div>

          <div className="card text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Understanding Your Results
            </h3>
            <p className="text-gray-600 mb-6">
              Your personality profile will help us tailor your AI avatar to reflect your unique 
              communication style and personality traits. This ensures your digital legacy 
              authentically represents who you are.
            </p>
            
            <div className="flex justify-center space-x-4">
              <button onClick={handleComplete} className="btn-primary">
                Continue to Interview
              </button>
              <button onClick={onSkip} className="btn-secondary">
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = personalityQuestions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personality Assessment</h1>
          <p className="text-gray-600">Help us understand your unique personality</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Question {currentQuestion + 1} of {personalityQuestions.length}</span>
            <button onClick={onSkip} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700">
              <SkipForward size={16} />
              <span>Skip Test</span>
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            {question.question}
          </h2>

          {/* Rating Scale */}
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Strongly Disagree</span>
              <span>Strongly Agree</span>
            </div>
            
            <div className="flex justify-between space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleResponse(rating)}
                  className={`flex-1 py-4 px-2 rounded-lg border-2 transition-all ${
                    responses[currentQuestion] === rating
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1">{rating}</div>
                    <div className="text-xs">
                      {rating === 1 && 'Strongly\nDisagree'}
                      {rating === 2 && 'Disagree'}
                      {rating === 3 && 'Neutral'}
                      {rating === 4 && 'Agree'}
                      {rating === 5 && 'Strongly\nAgree'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              currentQuestion === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              canProceed
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>{currentQuestion === personalityQuestions.length - 1 ? 'View Results' : 'Next'}</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalityTest;