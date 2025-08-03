import express from 'express';
import multer from 'multer';
import { supabase } from '@/services/supabase';
import { jobProcessor } from '@/services/jobProcessor';
import { logger } from '@/utils/logger';
import { validateRequest } from '@/middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '500000000'), // 500MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// Validation schema for video upload
const uploadVideoSchema = Joi.object({
  questionId: Joi.string().uuid().required(),
  sessionId: Joi.string().uuid().required(),
  metadata: Joi.object({
    duration: Joi.number().positive(),
    resolution: Joi.string(),
    deviceInfo: Joi.object(),
  }).optional(),
});

// POST /api/upload/video - Upload and process video
router.post('/video', upload.single('video'), validateRequest(uploadVideoSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { questionId, sessionId, metadata } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info(`📹 Uploading video for user ${userId}, question ${questionId}`);

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${userId}/videos/${sessionId}/${questionId}_${timestamp}.mp4`;

    // Upload video to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, videoFile.buffer, {
        contentType: videoFile.mimetype,
        upsert: false,
      });

    if (uploadError) {
      logger.error('❌ Failed to upload video to storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload video' });
    }

    // Create video record in database
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        session_id: sessionId,
        question_id: questionId,
        file_path: filePath,
        file_size: videoFile.size,
        format: videoFile.mimetype.split('/')[1],
        processing_status: 'pending',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (videoError || !video) {
      logger.error('❌ Failed to create video record:', videoError);
      
      // Clean up uploaded file
      await supabase.storage.from('videos').remove([filePath]);
      
      return res.status(500).json({ error: 'Failed to create video record' });
    }

    // Update session progress
    await supabase.rpc('increment_session_progress', {
      session_id: sessionId,
    });

    // Queue video processing
    await jobProcessor.queueVideoProcessing({
      videoId: video.id,
      userId,
      questionId,
      sessionId,
    });

    logger.info(`✅ Video uploaded and queued for processing: ${video.id}`);

    res.status(201).json({
      success: true,
      videoId: video.id,
      message: 'Video uploaded successfully and queued for processing',
      processingStatus: 'pending',
    });

  } catch (error) {
    logger.error('❌ Video upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/upload/status/:videoId - Check processing status
router.get('/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get video with processing status
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        processing_status,
        duration,
        thumbnail_url,
        created_at,
        transcripts (
          id,
          text,
          confidence_score,
          language
        ),
        memories (
          id,
          content_summary,
          sentiment,
          topics
        )
      `)
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      videoId: video.id,
      status: video.processing_status,
      duration: video.duration,
      thumbnailUrl: video.thumbnail_url,
      uploadedAt: video.created_at,
      transcript: video.transcripts?.[0] || null,
      memory: video.memories?.[0] || null,
    });

  } catch (error) {
    logger.error('❌ Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/upload/approve/:videoId - Approve video for final processing
router.post('/approve/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Update video approval status
    const { data: video, error: updateError } = await supabase
      .from('videos')
      .update({ approved_at: new Date().toISOString() })
      .eq('id', videoId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !video) {
      return res.status(404).json({ error: 'Video not found or already approved' });
    }

    logger.info(`✅ Video approved: ${videoId}`);

    res.json({
      success: true,
      message: 'Video approved successfully',
      videoId: video.id,
      approvedAt: video.approved_at,
    });

  } catch (error) {
    logger.error('❌ Video approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/upload/video/:videoId - Delete video and related data
router.delete('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('file_path, thumbnail_url')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete from storage
    const filesToDelete = [video.file_path];
    if (video.thumbnail_url) {
      filesToDelete.push(video.thumbnail_url);
    }

    await supabase.storage.from('videos').remove(filesToDelete);

    // Delete video record (cascades to related records)
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('❌ Failed to delete video record:', deleteError);
      return res.status(500).json({ error: 'Failed to delete video' });
    }

    logger.info(`🗑️ Video deleted: ${videoId}`);

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });

  } catch (error) {
    logger.error('❌ Video deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/upload/limits - Get upload limits and user usage
router.get('/limits', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's current usage
    const { data: usage, error: usageError } = await supabase
      .from('videos')
      .select('file_size, duration')
      .eq('user_id', userId);

    if (usageError) {
      logger.error('❌ Failed to get usage data:', usageError);
      return res.status(500).json({ error: 'Failed to get usage data' });
    }

    const totalSize = usage?.reduce((sum, video) => sum + (video.file_size || 0), 0) || 0;
    const totalDuration = usage?.reduce((sum, video) => sum + (video.duration || 0), 0) || 0;

    // Get user subscription tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const subscriptionTier = user?.subscription_tier || 'free';

    // Define limits based on subscription tier
    const limits = {
      free: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxTotalSize: 1024 * 1024 * 1024, // 1GB
        maxDuration: 300, // 5 minutes per video
        maxTotalDuration: 3600, // 1 hour total
        maxVideos: 10,
      },
      basic: {
        maxFileSize: 500 * 1024 * 1024, // 500MB
        maxTotalSize: 10 * 1024 * 1024 * 1024, // 10GB
        maxDuration: 600, // 10 minutes per video
        maxTotalDuration: 18000, // 5 hours total
        maxVideos: 100,
      },
      premium: {
        maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
        maxTotalSize: 100 * 1024 * 1024 * 1024, // 100GB
        maxDuration: 1800, // 30 minutes per video
        maxTotalDuration: 36000, // 10 hours total
        maxVideos: 1000,
      },
    };

    const userLimits = limits[subscriptionTier as keyof typeof limits] || limits.free;

    res.json({
      subscriptionTier,
      usage: {
        totalSize,
        totalDuration,
        videoCount: usage?.length || 0,
      },
      limits: userLimits,
      remaining: {
        size: Math.max(0, userLimits.maxTotalSize - totalSize),
        duration: Math.max(0, userLimits.maxTotalDuration - totalDuration),
        videos: Math.max(0, userLimits.maxVideos - (usage?.length || 0)),
      },
    });

  } catch (error) {
    logger.error('❌ Limits check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;