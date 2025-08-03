import express from 'express';
import { supabase } from '@/services/supabase';
import { voiceCloningService } from '@/services/voiceCloning';
import { logger } from '@/utils/logger';

const router = express.Router();

// GET /api/voice/models - Get user's voice models
router.get('/models', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: voiceModels, error: modelsError } = await supabase
      .from('ai_voice_models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (modelsError) {
      logger.error('Failed to get voice models:', modelsError);
      return res.status(500).json({ error: 'Failed to get voice models' });
    }

    res.json({
      voice_models: voiceModels || [],
    });

  } catch (error) {
    logger.error('Get voice models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/voice/samples - Get user's voice samples
router.get('/samples', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { suitable_only = false } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = supabase
      .from('voice_samples')
      .select(`
        id,
        video_id,
        file_path,
        duration,
        quality_score,
        noise_level,
        is_suitable_for_training,
        extracted_at,
        videos (
          id,
          question_id,
          thumbnail_url,
          questions (
            module,
            text
          )
        )
      `)
      .eq('user_id', userId);

    if (suitable_only === 'true') {
      query = query.eq('is_suitable_for_training', true);
    }

    query = query.order('extracted_at', { ascending: false });

    const { data: voiceSamples, error: samplesError } = await query;

    if (samplesError) {
      logger.error('Failed to get voice samples:', samplesError);
      return res.status(500).json({ error: 'Failed to get voice samples' });
    }

    // Calculate statistics
    const totalDuration = voiceSamples?.reduce((sum, sample) => sum + sample.duration, 0) || 0;
    const suitableCount = voiceSamples?.filter(sample => sample.is_suitable_for_training).length || 0;
    const averageQuality = voiceSamples?.length > 0
      ? voiceSamples.reduce((sum, sample) => sum + (sample.quality_score || 0), 0) / voiceSamples.length
      : 0;

    res.json({
      voice_samples: voiceSamples || [],
      statistics: {
        total_samples: voiceSamples?.length || 0,
        suitable_samples: suitableCount,
        total_duration_seconds: totalDuration,
        total_duration_minutes: Math.round(totalDuration / 60 * 100) / 100,
        average_quality: Math.round(averageQuality * 100) / 100,
      },
    });

  } catch (error) {
    logger.error('Get voice samples error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/voice/generate - Generate speech from text
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, voice_settings = {} } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    // Get user's ready voice model
    const { data: voiceModel, error: modelError } = await supabase
      .from('ai_voice_models')
      .select('*')
      .eq('user_id', userId)
      .eq('is_ready', true)
      .single();

    if (modelError || !voiceModel) {
      return res.status(400).json({ 
        error: 'No ready voice model found. Please complete voice training first.' 
      });
    }

    // Generate speech
    const speechBuffer = await voiceCloningService.generateSpeech(
      voiceModel.engine_name as 'elevenlabs' | 'respeecher' | 'coqui',
      text,
      voiceModel.model_id,
      voice_settings
    );

    // Upload to storage
    const timestamp = Date.now();
    const filePath = `${userId}/voice-responses/generated_${timestamp}.mp3`;
    
    const { error: uploadError } = await supabase.storage
      .from('voice-responses')
      .upload(filePath, speechBuffer, {
        contentType: 'audio/mpeg',
      });

    if (uploadError) {
      logger.error('Failed to upload generated speech:', uploadError);
      return res.status(500).json({ error: 'Failed to save generated speech' });
    }

    // Get signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('voice-responses')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      logger.error('Failed to generate signed URL:', urlError);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    logger.info(`Speech generated for user: ${userId}, text length: ${text.length}`);

    res.json({
      success: true,
      message: 'Speech generated successfully',
      audio_url: signedUrl.signedUrl,
      file_path: filePath,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      text_length: text.length,
      voice_model: {
        engine: voiceModel.engine_name,
        quality_score: voiceModel.quality_score,
      },
    });

  } catch (error) {
    logger.error('Generate speech error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/voice/train - Trigger voice model training
router.post('/train', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { engine = 'elevenlabs' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['elevenlabs', 'respeecher', 'coqui'].includes(engine)) {
      return res.status(400).json({ error: 'Invalid voice cloning engine' });
    }

    // Check if user has enough suitable voice samples
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
        error: `Insufficient voice samples. Need at least ${minTrainingMinutes} minutes, have ${totalMinutes.toFixed(1)} minutes.`,
        required_minutes: minTrainingMinutes,
        available_minutes: totalMinutes,
      });
    }

    // Check if training is already in progress
    const { data: existingModel, error: modelError } = await supabase
      .from('ai_voice_models')
      .select('status')
      .eq('user_id', userId)
      .eq('engine_name', engine)
      .single();

    if (!modelError && existingModel?.status === 'training') {
      return res.status(400).json({ error: 'Voice training already in progress' });
    }

    // Create or update voice model record
    const { data: voiceModel, error: upsertError } = await supabase
      .from('ai_voice_models')
      .upsert({
        user_id: userId,
        engine_name: engine,
        status: 'training',
        is_ready: false,
        minutes_collected: totalMinutes,
        training_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError || !voiceModel) {
      logger.error('Failed to create voice model record:', upsertError);
      return res.status(500).json({ error: 'Failed to start voice training' });
    }

    // Queue voice training job
    const { jobProcessor } = await import('@/services/jobProcessor');
    await jobProcessor.queueVoiceTraining(userId);

    logger.info(`Voice training started for user: ${userId}, engine: ${engine}`);

    res.json({
      success: true,
      message: 'Voice training started',
      voice_model: {
        id: voiceModel.id,
        engine: voiceModel.engine_name,
        status: voiceModel.status,
        minutes_collected: voiceModel.minutes_collected,
      },
      estimated_completion_time: '10-30 minutes',
    });

  } catch (error) {
    logger.error('Voice training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/voice/training-status - Get voice training status
router.get('/training-status', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: voiceModels, error: modelsError } = await supabase
      .from('ai_voice_models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (modelsError) {
      logger.error('Failed to get voice training status:', modelsError);
      return res.status(500).json({ error: 'Failed to get training status' });
    }

    // Get voice sample statistics
    const { data: voiceSamples, error: samplesError } = await supabase
      .from('voice_samples')
      .select('duration, quality_score, is_suitable_for_training')
      .eq('user_id', userId);

    if (samplesError) {
      logger.error('Failed to get voice samples:', samplesError);
      return res.status(500).json({ error: 'Failed to get voice samples' });
    }

    const totalMinutes = voiceSamples?.reduce((sum, sample) => sum + sample.duration, 0) / 60 || 0;
    const suitableMinutes = voiceSamples?.filter(s => s.is_suitable_for_training)
      .reduce((sum, sample) => sum + sample.duration, 0) / 60 || 0;
    const minTrainingMinutes = parseInt(process.env.MIN_VOICE_TRAINING_MINUTES || '5');

    res.json({
      voice_models: voiceModels || [],
      voice_samples: {
        total_minutes: Math.round(totalMinutes * 100) / 100,
        suitable_minutes: Math.round(suitableMinutes * 100) / 100,
        min_required_minutes: minTrainingMinutes,
        ready_for_training: suitableMinutes >= minTrainingMinutes,
        sample_count: voiceSamples?.length || 0,
        suitable_count: voiceSamples?.filter(s => s.is_suitable_for_training).length || 0,
      },
      can_start_training: suitableMinutes >= minTrainingMinutes,
    });

  } catch (error) {
    logger.error('Get training status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/voice/model/:modelId - Delete voice model
router.delete('/model/:modelId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { modelId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get voice model details
    const { data: voiceModel, error: getError } = await supabase
      .from('ai_voice_models')
      .select('*')
      .eq('id', modelId)
      .eq('user_id', userId)
      .single();

    if (getError || !voiceModel) {
      return res.status(404).json({ error: 'Voice model not found' });
    }

    // Delete from external service if model exists
    if (voiceModel.model_id && voiceModel.is_ready) {
      try {
        await voiceCloningService.deleteVoice(
          voiceModel.engine_name as 'elevenlabs' | 'respeecher' | 'coqui',
          voiceModel.model_id
        );
      } catch (deleteError) {
        logger.warn('Failed to delete voice model from external service:', deleteError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('ai_voice_models')
      .delete()
      .eq('id', modelId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('Failed to delete voice model from database:', deleteError);
      return res.status(500).json({ error: 'Failed to delete voice model' });
    }

    logger.info(`Voice model deleted: ${modelId}`);

    res.json({
      success: true,
      message: 'Voice model deleted successfully',
    });

  } catch (error) {
    logger.error('Delete voice model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/voice/sample/:sampleId/download - Download voice sample
router.get('/sample/:sampleId/download', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sampleId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify sample ownership
    const { data: sample, error: sampleError } = await supabase
      .from('voice_samples')
      .select('file_path')
      .eq('id', sampleId)
      .eq('user_id', userId)
      .single();

    if (sampleError || !sample) {
      return res.status(404).json({ error: 'Voice sample not found' });
    }

    // Generate signed URL
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('voice-samples')
      .createSignedUrl(sample.file_path, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      logger.error('Failed to generate signed URL for voice sample:', urlError);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    res.json({
      download_url: signedUrl.signedUrl,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

  } catch (error) {
    logger.error('Voice sample download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;