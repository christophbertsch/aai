import express from 'express';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';
import { validateRequest, commonSchemas } from '@/middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  avatar_url: Joi.string().uri().optional(),
  settings: Joi.object().optional(),
});

const personalityProfileSchema = Joi.object({
  responses: Joi.array().items(Joi.number().integer().min(1).max(5)).length(20).required(),
  ...commonSchemas.personalityProfile.extract(['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness']),
});

// GET /api/user/profile - Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        avatar_url,
        created_at,
        subscription_tier,
        total_recording_minutes,
        settings,
        personality_profiles (
          extraversion,
          agreeableness,
          conscientiousness,
          neuroticism,
          openness,
          created_at
        )
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logger.error('Failed to get user profile:', userError);
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get user statistics
    const { data: stats } = await supabase
      .from('videos')
      .select('id, duration, processing_status, approved_at')
      .eq('user_id', userId);

    const videoStats = {
      total_videos: stats?.length || 0,
      approved_videos: stats?.filter(v => v.approved_at).length || 0,
      pending_videos: stats?.filter(v => v.processing_status === 'pending').length || 0,
      total_duration: stats?.reduce((sum, v) => sum + (v.duration || 0), 0) || 0,
    };

    // Get voice model status
    const { data: voiceModel } = await supabase
      .from('ai_voice_models')
      .select('status, is_ready, quality_score')
      .eq('user_id', userId)
      .single();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        subscription_tier: user.subscription_tier,
        total_recording_minutes: user.total_recording_minutes,
        settings: user.settings || {},
      },
      personality_profile: user.personality_profiles?.[0] || null,
      statistics: videoStats,
      voice_model: voiceModel ? {
        status: voiceModel.status,
        is_ready: voiceModel.is_ready,
        quality_score: voiceModel.quality_score,
      } : null,
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', validateRequest(updateProfileSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, avatar_url, settings } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (settings !== undefined) updateData.settings = settings;

    const { data: user, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !user) {
      logger.error('Failed to update user profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    logger.info(`User profile updated: ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        settings: user.settings,
      },
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/personality - Save personality profile
router.post('/personality', validateRequest(personalityProfileSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { responses, extraversion, agreeableness, conscientiousness, neuroticism, openness } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Save personality profile
    const { data: personality, error: personalityError } = await supabase
      .from('personality_profiles')
      .upsert({
        user_id: userId,
        extraversion,
        agreeableness,
        conscientiousness,
        neuroticism,
        openness,
        raw_responses: responses,
      })
      .select()
      .single();

    if (personalityError || !personality) {
      logger.error('Failed to save personality profile:', personalityError);
      return res.status(500).json({ error: 'Failed to save personality profile' });
    }

    logger.info(`Personality profile saved for user: ${userId}`);

    res.json({
      success: true,
      message: 'Personality profile saved successfully',
      personality_profile: {
        extraversion: personality.extraversion,
        agreeableness: personality.agreeableness,
        conscientiousness: personality.conscientiousness,
        neuroticism: personality.neuroticism,
        openness: personality.openness,
        created_at: personality.created_at,
      },
    });

  } catch (error) {
    logger.error('Save personality error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user/sessions - Get user's interview sessions
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        package_type,
        total_questions,
        completed_questions,
        started_at,
        completed_at,
        status,
        metadata
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (sessionsError) {
      logger.error('Failed to get user sessions:', sessionsError);
      return res.status(500).json({ error: 'Failed to get sessions' });
    }

    res.json({
      sessions: sessions || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: sessions?.length || 0,
      },
    });

  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/session - Create new interview session
router.post('/session', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { package_type = 'basic' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Define question counts by package type
    const packageQuestions = {
      basic: 100,
      standard: 200,
      premium: 300,
    };

    const totalQuestions = packageQuestions[package_type as keyof typeof packageQuestions] || 100;

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        package_type,
        total_questions: totalQuestions,
        status: 'active',
      })
      .select()
      .single();

    if (sessionError || !session) {
      logger.error('Failed to create session:', sessionError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    logger.info(`New session created: ${session.id} for user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      session: {
        id: session.id,
        package_type: session.package_type,
        total_questions: session.total_questions,
        completed_questions: session.completed_questions,
        started_at: session.started_at,
        status: session.status,
      },
    });

  } catch (error) {
    logger.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user/statistics - Get detailed user statistics
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get video statistics
    const { data: videos } = await supabase
      .from('videos')
      .select('duration, processing_status, approved_at, created_at')
      .eq('user_id', userId);

    // Get memory statistics
    const { data: memories } = await supabase
      .from('memories')
      .select('sentiment, topics, created_at')
      .eq('user_id', userId);

    // Get conversation statistics
    const { data: conversations } = await supabase
      .from('conversations')
      .select('created_at, processing_time_ms')
      .eq('user_id', userId);

    // Calculate statistics
    const videoStats = {
      total_videos: videos?.length || 0,
      approved_videos: videos?.filter(v => v.approved_at).length || 0,
      total_duration: videos?.reduce((sum, v) => sum + (v.duration || 0), 0) || 0,
      processing_status: {
        pending: videos?.filter(v => v.processing_status === 'pending').length || 0,
        processing: videos?.filter(v => v.processing_status === 'processing').length || 0,
        completed: videos?.filter(v => v.processing_status === 'completed').length || 0,
        failed: videos?.filter(v => v.processing_status === 'failed').length || 0,
      },
    };

    const memoryStats = {
      total_memories: memories?.length || 0,
      average_sentiment: memories?.length > 0 
        ? memories.reduce((sum, m) => sum + (m.sentiment || 0), 0) / memories.length 
        : 0,
      top_topics: memories?.flatMap(m => m.topics || [])
        .reduce((acc: Record<string, number>, topic) => {
          acc[topic] = (acc[topic] || 0) + 1;
          return acc;
        }, {}) || {},
    };

    const conversationStats = {
      total_conversations: conversations?.length || 0,
      average_response_time: conversations?.length > 0
        ? conversations.reduce((sum, c) => sum + (c.processing_time_ms || 0), 0) / conversations.length
        : 0,
    };

    res.json({
      videos: videoStats,
      memories: memoryStats,
      conversations: conversationStats,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/user/account - Delete user account and all data
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // This will cascade delete all related data due to foreign key constraints
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      logger.error('Failed to delete user account:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // Clean up storage files
    try {
      await supabase.storage.from('videos').remove([`${userId}/`]);
      await supabase.storage.from('voice-samples').remove([`${userId}/`]);
      await supabase.storage.from('thumbnails').remove([`${userId}/`]);
      await supabase.storage.from('voice-responses').remove([`${userId}/`]);
    } catch (storageError) {
      logger.warn('Failed to clean up storage files:', storageError);
    }

    // Clean up Qdrant memories
    try {
      const { qdrantService } = await import('@/services/qdrant');
      await qdrantService.deleteUserMemories(userId);
    } catch (qdrantError) {
      logger.warn('Failed to clean up Qdrant memories:', qdrantError);
    }

    logger.info(`User account deleted: ${userId}`);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;