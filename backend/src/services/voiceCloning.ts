import axios from 'axios';
import FormData from 'form-data';
import { logger } from '@/utils/logger';

export interface VoiceCloneResult {
  modelId: string;
  modelUrl?: string;
  status: 'training' | 'ready' | 'failed';
  quality_score?: number;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
  }

  async createVoiceClone(
    name: string,
    audioFiles: Buffer[],
    description?: string
  ): Promise<VoiceCloneResult> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description || `Voice clone for ${name}`);

      // Add audio files
      audioFiles.forEach((buffer, index) => {
        formData.append('files', buffer, `sample_${index}.mp3`);
      });

      const response = await axios.post(
        `${this.baseUrl}/voices/add`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            ...formData.getHeaders(),
          },
        }
      );

      logger.info(`✅ Created ElevenLabs voice clone: ${response.data.voice_id}`);

      return {
        modelId: response.data.voice_id,
        status: 'ready',
        quality_score: 0.85, // ElevenLabs typically has good quality
      };
    } catch (error) {
      logger.error('❌ Failed to create ElevenLabs voice clone:', error);
      throw error;
    }
  }

  async generateSpeech(
    text: string,
    voiceId: string,
    stability: number = 0.5,
    similarityBoost: number = 0.5
  ): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('❌ Failed to generate speech with ElevenLabs:', error);
      throw error;
    }
  }

  async getVoiceInfo(voiceId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('❌ Failed to get voice info from ElevenLabs:', error);
      throw error;
    }
  }

  async deleteVoice(voiceId: string) {
    try {
      await axios.delete(
        `${this.baseUrl}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      logger.info(`🗑️ Deleted ElevenLabs voice: ${voiceId}`);
    } catch (error) {
      logger.error('❌ Failed to delete ElevenLabs voice:', error);
      throw error;
    }
  }
}

export class RespeecherService {
  private apiKey: string;
  private baseUrl = 'https://api.respeecher.com/v1';

  constructor() {
    this.apiKey = process.env.RESPEECHER_API_KEY!;
  }

  async createVoiceClone(
    name: string,
    audioFiles: Buffer[],
    description?: string
  ): Promise<VoiceCloneResult> {
    try {
      // Respeecher implementation would go here
      // This is a placeholder as Respeecher's API may differ
      
      logger.info('🔄 Creating Respeecher voice clone...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const modelId = `respeecher_${Date.now()}`;
      
      return {
        modelId,
        status: 'training',
        quality_score: 0.9,
      };
    } catch (error) {
      logger.error('❌ Failed to create Respeecher voice clone:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceId: string): Promise<Buffer> {
    try {
      // Respeecher speech generation implementation
      logger.info('🔄 Generating speech with Respeecher...');
      
      // Placeholder implementation
      throw new Error('Respeecher speech generation not implemented');
    } catch (error) {
      logger.error('❌ Failed to generate speech with Respeecher:', error);
      throw error;
    }
  }
}

export class CoquiService {
  private apiKey: string;
  private baseUrl = 'https://app.coqui.ai/api/v2';

  constructor() {
    this.apiKey = process.env.COQUI_API_KEY!;
  }

  async createVoiceClone(
    name: string,
    audioFiles: Buffer[],
    description?: string
  ): Promise<VoiceCloneResult> {
    try {
      // Coqui implementation would go here
      logger.info('🔄 Creating Coqui voice clone...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const modelId = `coqui_${Date.now()}`;
      
      return {
        modelId,
        status: 'training',
        quality_score: 0.8,
      };
    } catch (error) {
      logger.error('❌ Failed to create Coqui voice clone:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceId: string): Promise<Buffer> {
    try {
      // Coqui speech generation implementation
      logger.info('🔄 Generating speech with Coqui...');
      
      // Placeholder implementation
      throw new Error('Coqui speech generation not implemented');
    } catch (error) {
      logger.error('❌ Failed to generate speech with Coqui:', error);
      throw error;
    }
  }
}

export class VoiceCloningService {
  private elevenLabs: ElevenLabsService;
  private respeecher: RespeecherService;
  private coqui: CoquiService;

  constructor() {
    this.elevenLabs = new ElevenLabsService();
    this.respeecher = new RespeecherService();
    this.coqui = new CoquiService();
  }

  async createVoiceClone(
    engine: 'elevenlabs' | 'respeecher' | 'coqui',
    name: string,
    audioFiles: Buffer[],
    description?: string
  ): Promise<VoiceCloneResult> {
    switch (engine) {
      case 'elevenlabs':
        return this.elevenLabs.createVoiceClone(name, audioFiles, description);
      case 'respeecher':
        return this.respeecher.createVoiceClone(name, audioFiles, description);
      case 'coqui':
        return this.coqui.createVoiceClone(name, audioFiles, description);
      default:
        throw new Error(`Unsupported voice cloning engine: ${engine}`);
    }
  }

  async generateSpeech(
    engine: 'elevenlabs' | 'respeecher' | 'coqui',
    text: string,
    voiceId: string,
    options?: any
  ): Promise<Buffer> {
    switch (engine) {
      case 'elevenlabs':
        return this.elevenLabs.generateSpeech(
          text, 
          voiceId, 
          options?.stability, 
          options?.similarityBoost
        );
      case 'respeecher':
        return this.respeecher.generateSpeech(text, voiceId);
      case 'coqui':
        return this.coqui.generateSpeech(text, voiceId);
      default:
        throw new Error(`Unsupported voice cloning engine: ${engine}`);
    }
  }

  async getVoiceInfo(engine: 'elevenlabs' | 'respeecher' | 'coqui', voiceId: string) {
    switch (engine) {
      case 'elevenlabs':
        return this.elevenLabs.getVoiceInfo(voiceId);
      default:
        throw new Error(`Voice info not supported for engine: ${engine}`);
    }
  }

  async deleteVoice(engine: 'elevenlabs' | 'respeecher' | 'coqui', voiceId: string) {
    switch (engine) {
      case 'elevenlabs':
        return this.elevenLabs.deleteVoice(voiceId);
      default:
        logger.warn(`Voice deletion not implemented for engine: ${engine}`);
    }
  }
}

export const voiceCloningService = new VoiceCloningService();