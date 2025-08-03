import type { PersonalityTestQuestion } from '../types';

export const personalityQuestions: PersonalityTestQuestion[] = [
  {
    id: 1,
    question: "I enjoy being the center of attention in social settings.",
    trait: "extraversion",
    reversed: false
  },
  {
    id: 2,
    question: "I care deeply about other people's feelings.",
    trait: "agreeableness",
    reversed: false
  },
  {
    id: 3,
    question: "I take care of tasks promptly and efficiently.",
    trait: "conscientiousness",
    reversed: false
  },
  {
    id: 4,
    question: "I often experience changes in my mood.",
    trait: "neuroticism",
    reversed: false
  },
  {
    id: 5,
    question: "I enjoy reflecting on ideas and imagining possibilities.",
    trait: "openness",
    reversed: false
  },
  {
    id: 6,
    question: "I tend to be quiet and reserved.",
    trait: "extraversion",
    reversed: true
  },
  {
    id: 7,
    question: "I find it hard to connect with other people's struggles.",
    trait: "agreeableness",
    reversed: true
  },
  {
    id: 8,
    question: "I can be forgetful about keeping things in order.",
    trait: "conscientiousness",
    reversed: true
  },
  {
    id: 9,
    question: "I generally stay calm, even in stressful situations.",
    trait: "neuroticism",
    reversed: true
  },
  {
    id: 10,
    question: "I don't enjoy discussing complex or abstract ideas.",
    trait: "openness",
    reversed: true
  },
  {
    id: 11,
    question: "I enjoy meeting and chatting with new people.",
    trait: "extraversion",
    reversed: false
  },
  {
    id: 12,
    question: "I feel emotionally moved by what others go through.",
    trait: "agreeableness",
    reversed: false
  },
  {
    id: 13,
    question: "I like things to be organized and in their place.",
    trait: "conscientiousness",
    reversed: false
  },
  {
    id: 14,
    question: "I get emotionally unsettled more easily than others.",
    trait: "neuroticism",
    reversed: false
  },
  {
    id: 15,
    question: "I find abstract thinking to be challenging.",
    trait: "openness",
    reversed: true
  },
  {
    id: 16,
    question: "I prefer to stay in the background in group situations.",
    trait: "extraversion",
    reversed: true
  },
  {
    id: 17,
    question: "I help others feel comfortable in social situations.",
    trait: "agreeableness",
    reversed: false
  },
  {
    id: 18,
    question: "I sometimes neglect my responsibilities.",
    trait: "conscientiousness",
    reversed: true
  },
  {
    id: 19,
    question: "I rarely feel down or discouraged.",
    trait: "neuroticism",
    reversed: true
  },
  {
    id: 20,
    question: "I have a lot of ideas and creative thoughts.",
    trait: "openness",
    reversed: false
  }
];

export const calculatePersonalityProfile = (responses: number[]) => {
  const traits = {
    extraversion: [1, 6, 11, 16], // 6, 16 are reversed
    agreeableness: [2, 7, 12, 17], // 7 is reversed
    conscientiousness: [3, 8, 13, 18], // 8, 18 are reversed
    neuroticism: [4, 9, 14, 19], // 9, 19 are reversed
    openness: [5, 10, 15, 20] // 10, 15 are reversed
  };

  const results = {
    extraversion: 0,
    agreeableness: 0,
    conscientiousness: 0,
    neuroticism: 0,
    openness: 0
  };

  Object.entries(traits).forEach(([trait, questionNumbers]) => {
    let sum = 0;
    questionNumbers.forEach(questionNum => {
      const questionIndex = questionNum - 1;
      const question = personalityQuestions[questionIndex];
      const response = responses[questionIndex];
      
      // Apply reverse scoring if needed
      const score = question.reversed ? (6 - response) : response;
      sum += score;
    });
    
    results[trait as keyof typeof results] = sum / questionNumbers.length;
  });

  return results;
};

export const getTraitDescription = (trait: string, score: number): string => {
  const descriptions = {
    extraversion: {
      high: "You are outgoing, energetic, and enjoy social interactions. You tend to be assertive and seek excitement.",
      medium: "You balance social interaction with solitude, adapting your energy to different situations.",
      low: "You prefer quieter environments and smaller groups. You are thoughtful and reserved in social situations."
    },
    agreeableness: {
      high: "You are compassionate, cooperative, and trusting. You value harmony and are considerate of others.",
      medium: "You balance being helpful with maintaining healthy boundaries in relationships.",
      low: "You are more competitive and skeptical. You prioritize your own interests and can be direct in communication."
    },
    conscientiousness: {
      high: "You are organized, disciplined, and goal-oriented. You plan ahead and are reliable in your commitments.",
      medium: "You balance structure with flexibility, being organized when needed but adaptable to change.",
      low: "You are more spontaneous and flexible. You prefer to go with the flow rather than stick to rigid plans."
    },
    neuroticism: {
      high: "You may experience emotions more intensely and be more sensitive to stress. You are emotionally responsive.",
      medium: "You experience a normal range of emotions and generally cope well with life's challenges.",
      low: "You are emotionally stable and resilient. You remain calm under pressure and recover quickly from setbacks."
    },
    openness: {
      high: "You are creative, curious, and open to new experiences. You enjoy exploring ideas and appreciate art and beauty.",
      medium: "You balance traditional approaches with openness to new ideas and experiences.",
      low: "You prefer familiar routines and practical approaches. You value tradition and concrete thinking."
    }
  };

  const level = score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low';
  return descriptions[trait as keyof typeof descriptions][level];
};