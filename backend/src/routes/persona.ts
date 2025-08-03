import express from 'express';
import { supabase } from '@/services/supabase';
import { qdrantService } from '@/services/qdrant';
import { openaiService } from '@/services/openai';
import { voiceCloningService } from '@/services/voiceCloning';
import { logger } from '@/utils/logger';
import { validateRequest } from '@/middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schema for persona query
const personaQuerySchema = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  persona_settings: Joi.object({
    voice: Joi.boolean().default(false),
    personality: Joi.object({
      extraversion: Joi.number().min(0).max(1).required(),
      agreeableness: Joi.number().min(0).max(1).required(),
      conscientiousness: Joi.number().min(0).max(1).required(),
      neuroticism: Joi.number().min(0).max(1).required(),
      openness: Joi.number().min(0).max(1).required(),
    }).required(),
    response_length: Joi.string().valid('brief', 'moderate', 'detailed').default('moderate'),
    include_memories: Joi.boolean().default(true),
    memory_limit: Joi.number().min(1).max(20).default(10),
  }).required(),
});

// POST /api/persona/query - Main conversational AI endpoint
router.post('/query', validateRequest(personaQuerySchema), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user?.id;
    const { query, persona_settings } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info(`🤖 Processing persona query for user ${userId}: "${query.substring(0, 50)}..."`);

    // Get user's personality profile
    const { data: personality, error: personalityError } = await supabase
      .from('personality_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (personalityError || !personality) {
      return res.status(400).json({ 
        error: 'Personality profile not found. Please complete the personality assessment first.' 
      });
    }

    let relevantMemories: any[] = [];
    let voiceResponseUrl: string | null = null;

    // Search for relevant memories if requested
    if (persona_settings.include_memories) {
      try {
        // Generate embedding for the query
        const queryEmbedding = await openaiService.generateEmbedding(query);

        // Search for relevant memories in Qdrant
        const searchResults = await qdrantService.searchMemories(
          userId,
          queryEmbedding,
          persona_settings.memory_limit,
          0.7 // Similarity threshold
        );

        // Get memory details from database
        if (searchResults.length > 0) {
          const memoryIds = searchResults.map(result => result.payload?.transcriptId).filter(Boolean);
          
          if (memoryIds.length > 0) {
            const { data: memories, error: memoriesError } = await supabase
              .from('memories')
              .select(`
                id,
                content_summary,
                sentiment,
                topics,
                tags,
                transcripts (
                  text
                )
              `)
              .in('transcript_id', memoryIds)
              .eq('user_id', userId);

            if (!memoriesError && memories) {
              relevantMemories = memories.map((memory, index) => ({
                content: memory.transcripts?.text || memory.content_summary,
                sentiment: memory.sentiment,
                topics: memory.topics,
                tags: memory.tags,
                relevanceScore: searchResults[index]?.score || 0,
              }));
            }
          }
        }
      } catch (error) {
        logger.warn('⚠️ Failed to search memories, continuing without them:', error);
      }
    }

    // Generate AI response using personality and memories
    const personalityTraits = {
      extraversion: personality.extraversion,
      agreeableness: personality.agreeableness,
      conscientiousness: personality.conscientiousness,
      neuroticism: personality.neuroticism,
      openness: personality.openness,
    };

    // Get user name for personalization
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    const response = await openaiService.generatePersonalityResponse(
      query,
      relevantMemories,
      personalityTraits,
      user?.name
    );

    // Generate voice response if requested and voice model is available
    if (persona_settings.voice) {
      try {
        const { data: voiceModel, error: voiceError } = await supabase
          .from('ai_voice_models')
          .select('*')
          .eq('user_id', userId)
          .eq('is_ready', true)
          .single();

        if (!voiceError && voiceModel) {
          // Generate speech using the voice model
          const speechBuffer = await voiceCloningService.generateSpeech(
            voiceModel.engine_name as 'elevenlabs' | 'respeecher' | 'coqui',
            response,
            voiceModel.model_id
          );

          // Upload voice response to storage
          const voicePath = `${userId}/voice-responses/${Date.now()}.mp3`;
          const { error: uploadError } = await supabase.storage
            .from('voice-responses')
            .upload(voicePath, speechBuffer, {
              contentType: 'audio/mpeg',
            });

          if (!uploadError) {
            voiceResponseUrl = voicePath;
          }
        }
      } catch (error) {
        logger.warn('⚠️ Failed to generate voice response:', error);
      }
    }

    // Calculate personality influence for response metadata
    const personalityInfluence = await supabase.rpc('calculate_personality_influence', {
      extraversion: personality.extraversion,
      agreeableness: personality.agreeableness,
      conscientiousness: personality.conscientiousness,
      neuroticism: personality.neuroticism,
      openness: personality.openness,
    });

    // Log conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        session_id: req.headers['x-session-id'] as string || 'default',
        query,
        response,
        voice_response_url: voiceResponseUrl,
        memories_used: relevantMemories.map((_, index) => searchResults[index]?.id).filter(Boolean),
        personality_influence: personalityInfluence,
        processing_time_ms: Date.now() - startTime,
      })
      .select()
      .single();

    if (conversationError) {
      logger.warn('⚠️ Failed to log conversation:', conversationError);
    }

    logger.info(`✅ Persona query completed in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      response,
      voice_response_url: voiceResponseUrl,
      metadata: {
        memories_used: relevantMemories.length,
        personality_influence: personalityInfluence,
        processing_time_ms: Date.now() - startTime,
        conversation_id: conversation?.id,
      },
      memories_context: relevantMemories.map(memory => ({
        summary: memory.content.substring(0, 100) + '...',
        topics: memory.topics,
        sentiment: memory.sentiment,
        relevance_score: memory.relevanceScore,
      })),
    });

  } catch (error) {
    logger.error('❌ Persona query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/persona/voice-status - Check voice model status
router.get('/voice-status', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get voice model status
    const { data: voiceModel, error: voiceError } = await supabase
      .from('ai_voice_models')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (voiceError && voiceError.code !== 'PGRST116') {
      logger.error('❌ Failed to get voice model status:', voiceError);
      return res.status(500).json({ error: 'Failed to get voice model status' });
    }

    // Get voice sample statistics
    const { data: voiceSamples, error: samplesError } = await supabase
      .from('voice_samples')
      .select('duration, quality_score, is_suitable_for_training')
      .eq('user_id', userId);

    if (samplesError) {
      logger.error('❌ Failed to get voice samples:', samplesError);
      return res.status(500).json({ error: 'Failed to get voice samples' });
    }

    const totalMinutes = voiceSamples?.reduce((sum, sample) => sum + sample.duration, 0) / 60 || 0;
    const suitableSamples = voiceSamples?.filter(sample => sample.is_suitable_for_training).length || 0;
    const averageQuality = voiceSamples?.length > 0 
      ? voiceSamples.reduce((sum, sample) => sum + (sample.quality_score || 0), 0) / voiceSamples.length 
      : 0;

    const minTrainingMinutes = parseInt(process.env.MIN_VOICE_TRAINING_MINUTES || '5');

    res.json({
      voice_model: voiceModel ? {
        id: voiceModel.id,
        status: voiceModel.status,
        engine: voiceModel.engine_name,
        is_ready: voiceModel.is_ready,
        quality_score: voiceModel.quality_score,
        training_started_at: voiceModel.training_started_at,
        training_completed_at: voiceModel.training_completed_at,
      } : null,
      voice_samples: {
        total_count: voiceSamples?.length || 0,
        suitable_count: suitableSamples,
        total_minutes: totalMinutes,
        average_quality: averageQuality,
        min_required_minutes: minTrainingMinutes,
        ready_for_training: totalMinutes >= minTrainingMinutes,
      },
      can_generate_voice: voiceModel?.is_ready || false,
    });

  } catch (error) {
    logger.error('❌ Voice status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/persona/retrain-voice - Trigger voice model retraining
router.post('/retrain-voice', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has enough voice samples
    const { data: voiceSamples, error: samplesError } = await supabase
      .from('voice_samples')
      .select('duration')
      .eq('user_id', userId)
      .eq('is_suitable_for_training', true);

    if (samplesError) {
      return res.status(500).json({ error: 'Failed to check voice samples' });
    }

    const totalMinutes = voiceSamples?.reduce((sum, sample) => sum + sample.duration, 0) / 60 || 0;
    const minTrainingMinutes = parseInt(process.env.MIN_VOICE_TRAINING_MINUTES || '5');

    if (totalMinutes < minTrainingMinutes) {
      return res.status(400).json({ 
        error: `Insufficient voice samples. Need at least ${minTrainingMinutes} minutes, have ${totalMinutes.toFixed(1)} minutes.` 
      });
    }

    // Reset existing voice model status
    await supabase
      .from('ai_voice_models')
      .update({ 
        status: 'training',
        is_ready: false,
        training_started_at: new Date().toISOString(),
        training_completed_at: null,
      })
      .eq('user_id', userId);

    // Queue voice training job
    const { jobProcessor } = await import('@/services/jobProcessor');
    await jobProcessor.queueVoiceTraining(userId);

    logger.info(`🔄 Voice retraining queued for user: ${userId}`);

    res.json({
      success: true,
      message: 'Voice model retraining started',
      estimated_completion_time: '10-30 minutes',
    });

  } catch (error) {
    logger.error('❌ Voice retraining error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/persona/conversation-history - Get conversation history
router.get('/conversation-history', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0, session_id } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (session_id) {
      query = query.eq('session_id', session_id as string);
    }

    const { data: conversations, error: conversationsError } = await query;

    if (conversationsError) {
      logger.error('❌ Failed to get conversation history:', conversationsError);
      return res.status(500).json({ error: 'Failed to get conversation history' });
    }

    res.json({
      conversations: conversations || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: conversations?.length || 0,
      },
    });

  } catch (error) {
    logger.error('❌ Conversation history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/persona/conversation/:conversationId - Delete conversation
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('❌ Failed to delete conversation:', deleteError);
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });

  } catch (error) {
    logger.error('❌ Conversation deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;