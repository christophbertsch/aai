import Bull from 'bull';
import { supabase } from '@/services/supabase';
import { qdrantService } from '@/services/qdrant';
import { openaiService } from '@/services/openai';
import { voiceCloningService } from '@/services/voiceCloning';
import { videoProcessorService } from '@/services/videoProcessor';
import { logger } from '@/utils/logger';

export interface JobPayload {
  videoId: string;
  userId: string;
  questionId: string;
  sessionId: string;
}

export class JobProcessor {
  private videoProcessingQueue: Bull.Queue;
  private transcriptionQueue: Bull.Queue;
  private embeddingQueue: Bull.Queue;
  private voiceTrainingQueue: Bull.Queue;

  constructor() {
    const redisConfig = {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.videoProcessingQueue = new Bull('video-processing', redisConfig);
    this.transcriptionQueue = new Bull('transcription', redisConfig);
    this.embeddingQueue = new Bull('embedding', redisConfig);
    this.voiceTrainingQueue = new Bull('voice-training', redisConfig);

    this.setupProcessors();
  }

  private setupProcessors() {
    // Video processing job
    this.videoProcessingQueue.process('process-video', async (job) => {
      const { videoId, userId } = job.data as JobPayload;
      logger.info(`🎬 Processing video: ${videoId}`);

      try {
        await this.processVideo(videoId, userId);
        logger.info(`✅ Video processing completed: ${videoId}`);
      } catch (error) {
        logger.error(`❌ Video processing failed: ${videoId}`, error);
        throw error;
      }
    });

    // Transcription job
    this.transcriptionQueue.process('transcribe-audio', async (job) => {
      const { videoId, userId } = job.data as JobPayload;
      logger.info(`🎤 Transcribing audio: ${videoId}`);

      try {
        await this.transcribeAudio(videoId, userId);
        logger.info(`✅ Transcription completed: ${videoId}`);
      } catch (error) {
        logger.error(`❌ Transcription failed: ${videoId}`, error);
        throw error;
      }
    });

    // Embedding generation job
    this.embeddingQueue.process('generate-embedding', async (job) => {
      const { videoId, userId, questionId } = job.data as JobPayload;
      logger.info(`🧠 Generating embedding: ${videoId}`);

      try {
        await this.generateEmbedding(videoId, userId, questionId);
        logger.info(`✅ Embedding generation completed: ${videoId}`);
      } catch (error) {
        logger.error(`❌ Embedding generation failed: ${videoId}`, error);
        throw error;
      }
    });

    // Voice training job
    this.voiceTrainingQueue.process('train-voice', async (job) => {
      const { userId } = job.data as { userId: string };
      logger.info(`🗣️ Training voice model: ${userId}`);

      try {
        await this.trainVoiceModel(userId);
        logger.info(`✅ Voice training completed: ${userId}`);
      } catch (error) {
        logger.error(`❌ Voice training failed: ${userId}`, error);
        throw error;
      }
    });
  }

  async queueVideoProcessing(payload: JobPayload) {
    await this.videoProcessingQueue.add('process-video', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async queueTranscription(payload: JobPayload) {
    await this.transcriptionQueue.add('transcribe-audio', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async queueEmbeddingGeneration(payload: JobPayload) {
    await this.embeddingQueue.add('generate-embedding', payload, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async queueVoiceTraining(userId: string) {
    await this.voiceTrainingQueue.add('train-voice', { userId }, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  private async processVideo(videoId: string, userId: string) {
    // Get video from database
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // Update status to processing
    await supabase
      .from('videos')
      .update({ processing_status: 'processing' })
      .eq('id', videoId);

    try {
      // Download video from storage
      const { data: videoData, error: downloadError } = await supabase.storage
        .from('videos')
        .download(video.file_path);

      if (downloadError || !videoData) {
        throw new Error(`Failed to download video: ${downloadError?.message}`);
      }

      const videoBuffer = Buffer.from(await videoData.arrayBuffer());

      // Extract metadata
      const metadata = await videoProcessorService.getVideoMetadata(videoBuffer);

      // Generate thumbnail
      const thumbnailBuffer = await videoProcessorService.generateThumbnail(videoBuffer);
      
      // Upload thumbnail
      const thumbnailPath = `${userId}/thumbnails/${videoId}.jpg`;
      const { error: thumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: 'image/jpeg',
        });

      if (thumbnailError) {
        logger.warn(`Failed to upload thumbnail: ${thumbnailError.message}`);
      }

      // Extract audio for transcription
      const audioResult = await videoProcessorService.extractAudio(videoBuffer);

      // Save audio for transcription
      const audioPath = `${userId}/audio/${videoId}.wav`;
      const { error: audioError } = await supabase.storage
        .from('voice-samples')
        .upload(audioPath, audioResult.audioBuffer, {
          contentType: 'audio/wav',
        });

      if (audioError) {
        throw new Error(`Failed to upload audio: ${audioError.message}`);
      }

      // Extract voice samples for training
      const voiceSamples = await videoProcessorService.extractVoiceSamples(videoBuffer);

      // Save voice samples
      for (let i = 0; i < voiceSamples.length; i++) {
        const samplePath = `${userId}/voice-training/${videoId}_sample_${i}.wav`;
        await supabase.storage
          .from('voice-samples')
          .upload(samplePath, voiceSamples[i], {
            contentType: 'audio/wav',
          });

        // Save voice sample record
        await supabase
          .from('voice_samples')
          .insert({
            user_id: userId,
            video_id: videoId,
            file_path: samplePath,
            duration: audioResult.duration,
            quality_score: audioResult.quality.clarity,
            noise_level: audioResult.quality.noiseLevel,
            is_suitable_for_training: true,
          });
      }

      // Update video record with metadata
      await supabase
        .from('videos')
        .update({
          duration: metadata.duration,
          resolution: metadata.resolution,
          file_size: metadata.fileSize,
          thumbnail_url: thumbnailPath,
          processing_status: 'completed',
          metadata: {
            hasAudio: metadata.hasAudio,
            audioQuality: metadata.audioQuality,
            voiceSamplesCount: voiceSamples.length,
          },
        })
        .eq('id', videoId);

      // Queue transcription
      await this.queueTranscription({ videoId, userId, questionId: video.question_id, sessionId: video.session_id });

      // Check if user has enough voice samples for training
      const { data: voiceSampleCount } = await supabase
        .from('voice_samples')
        .select('duration')
        .eq('user_id', userId)
        .eq('is_suitable_for_training', true);

      if (voiceSampleCount) {
        const totalMinutes = voiceSampleCount.reduce((sum, sample) => sum + sample.duration, 0) / 60;
        const minTrainingMinutes = parseInt(process.env.MIN_VOICE_TRAINING_MINUTES || '5');

        if (totalMinutes >= minTrainingMinutes) {
          // Check if voice model already exists
          const { data: existingModel } = await supabase
            .from('ai_voice_models')
            .select('*')
            .eq('user_id', userId)
            .eq('is_ready', false)
            .single();

          if (!existingModel) {
            await this.queueVoiceTraining(userId);
          }
        }
      }

    } catch (error) {
      // Update status to failed
      await supabase
        .from('videos')
        .update({ processing_status: 'failed' })
        .eq('id', videoId);
      
      throw error;
    }
  }

  private async transcribeAudio(videoId: string, userId: string) {
    // Get video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // Download audio file
    const audioPath = `${userId}/audio/${videoId}.wav`;
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('voice-samples')
      .download(audioPath);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    const audioBuffer = Buffer.from(await audioData.arrayBuffer());

    // Transcribe using OpenAI Whisper
    const transcription = await openaiService.transcribeAudio(audioBuffer, `${videoId}.wav`);

    // Save transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        video_id: videoId,
        user_id: userId,
        text: transcription.text,
        language: transcription.language,
        confidence_score: transcription.confidence,
        processing_engine: 'whisper',
      })
      .select()
      .single();

    if (transcriptError || !transcript) {
      throw new Error(`Failed to save transcript: ${transcriptError?.message}`);
    }

    // Queue embedding generation
    await this.queueEmbeddingGeneration({ 
      videoId, 
      userId, 
      questionId: video.question_id, 
      sessionId: video.session_id 
    });
  }

  private async generateEmbedding(videoId: string, userId: string, questionId: string) {
    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('video_id', videoId)
      .single();

    if (transcriptError || !transcript) {
      throw new Error(`Transcript not found: ${videoId}`);
    }

    // Get question for context
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    // Create content for embedding (question + answer)
    const content = `Question: ${question.text}\n\nAnswer: ${transcript.text}`;

    // Generate embedding
    const embedding = await openaiService.generateEmbedding(content);

    // Analyze content
    const analysis = await openaiService.analyzeContent(transcript.text);

    // Save to Qdrant
    const qdrantId = `memory_${videoId}`;
    await qdrantService.addMemory(qdrantId, userId, embedding, {
      questionId,
      videoId,
      transcriptId: transcript.id,
      content: transcript.text,
      tags: question.tags || [],
      sentiment: analysis.sentiment,
      topics: analysis.topics,
      timestamp: new Date().toISOString(),
    });

    // Save memory record
    await supabase
      .from('memories')
      .insert({
        user_id: userId,
        video_id: videoId,
        question_id: questionId,
        transcript_id: transcript.id,
        embedding,
        qdrant_id: qdrantId,
        content_summary: analysis.summary,
        tags: question.tags || [],
        sentiment: analysis.sentiment,
        emotion_scores: analysis.emotion_scores,
        topics: analysis.topics,
      });

    logger.info(`✅ Memory created and indexed: ${qdrantId}`);
  }

  private async trainVoiceModel(userId: string) {
    // Get all suitable voice samples for user
    const { data: voiceSamples, error: samplesError } = await supabase
      .from('voice_samples')
      .select('*')
      .eq('user_id', userId)
      .eq('is_suitable_for_training', true);

    if (samplesError || !voiceSamples || voiceSamples.length === 0) {
      throw new Error(`No suitable voice samples found for user: ${userId}`);
    }

    // Download voice samples
    const audioBuffers: Buffer[] = [];
    for (const sample of voiceSamples) {
      const { data: audioData, error: downloadError } = await supabase.storage
        .from('voice-samples')
        .download(sample.file_path);

      if (downloadError || !audioData) {
        logger.warn(`Failed to download voice sample: ${sample.file_path}`);
        continue;
      }

      audioBuffers.push(Buffer.from(await audioData.arrayBuffer()));
    }

    if (audioBuffers.length === 0) {
      throw new Error('No voice samples could be downloaded');
    }

    // Get user info for naming
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single();

    const userName = user?.name || user?.email || `User_${userId}`;

    // Create voice model with ElevenLabs (default)
    const voiceResult = await voiceCloningService.createVoiceClone(
      'elevenlabs',
      userName,
      audioBuffers,
      `Voice clone for ${userName}`
    );

    // Save voice model record
    await supabase
      .from('ai_voice_models')
      .upsert({
        user_id: userId,
        model_id: voiceResult.modelId,
        model_url: voiceResult.modelUrl,
        engine_name: 'elevenlabs',
        status: voiceResult.status,
        minutes_collected: voiceSamples.reduce((sum, sample) => sum + sample.duration, 0) / 60,
        quality_score: voiceResult.quality_score,
        is_ready: voiceResult.status === 'ready',
        training_started_at: new Date().toISOString(),
        training_completed_at: voiceResult.status === 'ready' ? new Date().toISOString() : null,
      });

    logger.info(`✅ Voice model training completed for user: ${userId}`);
  }

  start() {
    logger.info('🚀 Job processor started');
  }

  async close() {
    await Promise.all([
      this.videoProcessingQueue.close(),
      this.transcriptionQueue.close(),
      this.embeddingQueue.close(),
      this.voiceTrainingQueue.close(),
    ]);
    logger.info('🛑 Job processor stopped');
  }
}

export const jobProcessor = new JobProcessor();