import express from 'express';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';
import { validateQuery, commonSchemas } from '@/middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const getVideosQuerySchema = Joi.object({
  ...commonSchemas.paginationQuery.extract(['limit', 'offset', 'sort', 'order']),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
  approved: Joi.boolean().optional(),
  session_id: Joi.string().uuid().optional(),
});

// GET /api/video - Get user's videos
router.get('/', validateQuery(getVideosQuerySchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit, offset, sort, order, status, approved, session_id } = req.query as any;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = supabase
      .from('videos')
      .select(`
        id,
        session_id,
        question_id,
        file_path,
        thumbnail_url,
        duration,
        file_size,
        resolution,
        format,
        approved_at,
        uploaded_at,
        processing_status,
        metadata,
        questions (
          id,
          module,
          text,
          tags
        ),
        transcripts (
          id,
          text,
          confidence_score,
          language
        )
      `)
      .eq('user_id', userId);

    // Apply filters
    if (status) {
      query = query.eq('processing_status', status);
    }

    if (approved !== undefined) {
      if (approved) {
        query = query.not('approved_at', 'is', null);
      } else {
        query = query.is('approved_at', null);
      }
    }

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: videos, error: videosError } = await query;

    if (videosError) {
      logger.error('Failed to get videos:', videosError);
      return res.status(500).json({ error: 'Failed to get videos' });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (status) countQuery = countQuery.eq('processing_status', status);
    if (approved !== undefined) {
      if (approved) {
        countQuery = countQuery.not('approved_at', 'is', null);
      } else {
        countQuery = countQuery.is('approved_at', null);
      }
    }
    if (session_id) countQuery = countQuery.eq('session_id', session_id);

    const { count } = await countQuery;

    res.json({
      videos: videos || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
    });

  } catch (error) {
    logger.error('Get videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/video/:videoId - Get specific video details
router.get('/:videoId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { videoId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        session_id,
        question_id,
        file_path,
        thumbnail_url,
        duration,
        file_size,
        resolution,
        format,
        approved_at,
        uploaded_at,
        processing_status,
        metadata,
        questions (
          id,
          module,
          text,
          tags,
          difficulty_level,
          estimated_duration
        ),
        transcripts (
          id,
          text,
          confidence_score,
          language,
          word_timestamps,
          processing_engine,
          created_at
        ),
        memories (
          id,
          content_summary,
          sentiment,
          emotion_scores,
          topics,
          importance_score,
          created_at
        ),
        voice_samples (
          id,
          duration,
          quality_score,
          noise_level,
          is_suitable_for_training
        )
      `)
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      video,
    });

  } catch (error) {
    logger.error('Get video details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/video/:videoId/download - Get signed URL for video download
router.get('/:videoId/download', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { videoId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('file_path')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Generate signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.file_path, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      logger.error('Failed to generate signed URL:', urlError);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    res.json({
      download_url: signedUrl.signedUrl,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

  } catch (error) {
    logger.error('Video download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/video/:videoId/reprocess - Trigger video reprocessing
router.post('/:videoId/reprocess', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { videoId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify video ownership and get details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if video is in a state that can be reprocessed
    if (video.processing_status === 'processing') {
      return res.status(400).json({ error: 'Video is already being processed' });
    }

    // Reset processing status
    const { error: updateError } = await supabase
      .from('videos')
      .update({ processing_status: 'pending' })
      .eq('id', videoId);

    if (updateError) {
      logger.error('Failed to reset video status:', updateError);
      return res.status(500).json({ error: 'Failed to reset video status' });
    }

    // Queue reprocessing
    const { jobProcessor } = await import('@/services/jobProcessor');
    await jobProcessor.queueVideoProcessing({
      videoId,
      userId,
      questionId: video.question_id,
      sessionId: video.session_id,
    });

    logger.info(`Video reprocessing queued: ${videoId}`);

    res.json({
      success: true,
      message: 'Video reprocessing started',
      video_id: videoId,
      status: 'pending',
    });

  } catch (error) {
    logger.error('Video reprocess error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/video/statistics/overview - Get video statistics overview
router.get('/statistics/overview', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get video statistics
    const { data: videos } = await supabase
      .from('videos')
      .select('processing_status, duration, approved_at, created_at')
      .eq('user_id', userId);

    // Get session statistics
    const { data: sessions } = await supabase
      .from('sessions')
      .select('status, completed_questions, total_questions')
      .eq('user_id', userId);

    // Calculate statistics
    const videoStats = {
      total: videos?.length || 0,
      approved: videos?.filter(v => v.approved_at).length || 0,
      pending: videos?.filter(v => v.processing_status === 'pending').length || 0,
      processing: videos?.filter(v => v.processing_status === 'processing').length || 0,
      completed: videos?.filter(v => v.processing_status === 'completed').length || 0,
      failed: videos?.filter(v => v.processing_status === 'failed').length || 0,
      total_duration: videos?.reduce((sum, v) => sum + (v.duration || 0), 0) || 0,
    };

    const sessionStats = {
      total: sessions?.length || 0,
      active: sessions?.filter(s => s.status === 'active').length || 0,
      completed: sessions?.filter(s => s.status === 'completed').length || 0,
      total_progress: sessions?.reduce((sum, s) => sum + s.completed_questions, 0) || 0,
      total_questions: sessions?.reduce((sum, s) => sum + s.total_questions, 0) || 0,
    };

    // Calculate progress percentage
    const overallProgress = sessionStats.total_questions > 0 
      ? (sessionStats.total_progress / sessionStats.total_questions) * 100 
      : 0;

    res.json({
      videos: videoStats,
      sessions: sessionStats,
      overall_progress: Math.round(overallProgress * 100) / 100,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Video statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/video/statistics/timeline - Get video upload timeline
router.get('/statistics/timeline', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { days = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    const { data: videos } = await supabase
      .from('videos')
      .select('uploaded_at, duration, processing_status')
      .eq('user_id', userId)
      .gte('uploaded_at', daysAgo.toISOString())
      .order('uploaded_at', { ascending: true });

    // Group by date
    const timeline = videos?.reduce((acc: Record<string, any>, video) => {
      const date = video.uploaded_at.split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          duration: 0,
          statuses: { pending: 0, processing: 0, completed: 0, failed: 0 },
        };
      }
      
      acc[date].count++;
      acc[date].duration += video.duration || 0;
      acc[date].statuses[video.processing_status as keyof typeof acc[string]['statuses']]++;
      
      return acc;
    }, {}) || {};

    res.json({
      timeline: Object.values(timeline),
      period_days: Number(days),
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Video timeline error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;