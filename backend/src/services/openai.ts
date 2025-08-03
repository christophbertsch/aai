import OpenAI from 'openai';
import { logger } from '@/utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  // Generate embeddings for text
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('❌ Failed to generate embedding:', error);
      throw error;
    }
  }

  // Transcribe audio using Whisper
  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<{
    text: string;
    language: string;
    confidence?: number;
  }> {
    try {
      const file = new File([audioBuffer], filename, { type: 'audio/mp4' });
      
      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      return {
        text: response.text,
        language: response.language || 'en',
        confidence: 0.95, // Whisper doesn't provide confidence scores
      };
    } catch (error) {
      logger.error('❌ Failed to transcribe audio:', error);
      throw error;
    }
  }

  // Generate AI response based on personality and memories
  async generatePersonalityResponse(
    query: string,
    memories: Array<{
      content: string;
      sentiment?: number;
      topics?: string[];
      tags?: string[];
    }>,
    personality: {
      extraversion: number;
      agreeableness: number;
      conscientiousness: number;
      neuroticism: number;
      openness: number;
    },
    userName?: string
  ): Promise<string> {
    try {
      // Build personality-influenced system prompt
      const personalityPrompt = this.buildPersonalityPrompt(personality, userName);
      
      // Build context from memories
      const memoryContext = memories
        .map((memory, index) => `Memory ${index + 1}: ${memory.content}`)
        .join('\n\n');

      const systemMessage = `${personalityPrompt}

Based on the following memories and experiences, respond to the user's question in character:

${memoryContext}

Remember to:
- Speak in first person as if you are the person whose memories these are
- Reference specific memories when relevant
- Maintain the personality traits described above
- Be warm, personal, and authentic
- Share wisdom and insights from your experiences`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('❌ Failed to generate personality response:', error);
      throw error;
    }
  }

  // Analyze sentiment and extract topics from text
  async analyzeContent(text: string): Promise<{
    sentiment: number;
    emotion_scores: Record<string, number>;
    topics: string[];
    summary: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Analyze the following text and return a JSON object with:
- sentiment: number between -1 (very negative) and 1 (very positive)
- emotion_scores: object with emotions (joy, sadness, anger, fear, surprise, disgust) as keys and scores 0-1 as values
- topics: array of 3-5 main topics/themes mentioned
- summary: brief 1-2 sentence summary of the content

Return only valid JSON, no other text.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis;
    } catch (error) {
      logger.error('❌ Failed to analyze content:', error);
      // Return default values on error
      return {
        sentiment: 0,
        emotion_scores: { joy: 0.5, sadness: 0.1, anger: 0.1, fear: 0.1, surprise: 0.1, disgust: 0.1 },
        topics: ['general'],
        summary: text.substring(0, 100) + '...'
      };
    }
  }

  private buildPersonalityPrompt(
    personality: {
      extraversion: number;
      agreeableness: number;
      conscientiousness: number;
      neuroticism: number;
      openness: number;
    },
    userName?: string
  ): string {
    const name = userName || 'I';
    
    let prompt = `You are an AI representation of ${name}, responding based on their recorded life stories and personality. `;

    // Extraversion
    if (personality.extraversion > 0.7) {
      prompt += `${name} is very outgoing, energetic, and loves social interaction. They speak with enthusiasm and often share stories about people and social experiences. `;
    } else if (personality.extraversion < 0.3) {
      prompt += `${name} is more reserved and introspective. They prefer deeper, more meaningful conversations and may be more thoughtful in their responses. `;
    }

    // Agreeableness
    if (personality.agreeableness > 0.7) {
      prompt += `${name} is very empathetic, caring, and always considers others' feelings. They often express concern for others and share stories about helping people. `;
    } else if (personality.agreeableness < 0.3) {
      prompt += `${name} is more direct and straightforward. They value honesty and may be more critical or analytical in their responses. `;
    }

    // Conscientiousness
    if (personality.conscientiousness > 0.7) {
      prompt += `${name} is very organized, detail-oriented, and disciplined. They often mention planning, structure, and the importance of hard work. `;
    } else if (personality.conscientiousness < 0.3) {
      prompt += `${name} is more spontaneous and flexible. They may share stories about adapting to situations and going with the flow. `;
    }

    // Neuroticism
    if (personality.neuroticism > 0.7) {
      prompt += `${name} may express some anxiety or worry, and they're very aware of potential problems. They might share stories about overcoming challenges and fears. `;
    } else if (personality.neuroticism < 0.3) {
      prompt += `${name} is very calm and emotionally stable. They handle stress well and often share stories about staying composed in difficult situations. `;
    }

    // Openness
    if (personality.openness > 0.7) {
      prompt += `${name} is very creative, curious, and open to new experiences. They love learning, exploring ideas, and may share stories about travel, art, or intellectual pursuits. `;
    } else if (personality.openness < 0.3) {
      prompt += `${name} is more practical and traditional. They value proven methods and may share stories about family traditions and established ways of doing things. `;
    }

    return prompt;
  }
}

export const openaiService = new OpenAIService();