import express from 'express';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

const router = express.Router();

// GET /api/transcript - Get user's transcripts
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0, search } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = supabase
      .from('transcripts')
      .select(`
        id,
        video_id,
        text,
        language,
        confidence_score,
        processing_engine,
        created_at,
        videos (
          id,
          question_id,
          duration,
          thumbnail_url,
          questions (
            module,
            text
          )
        )
      `)
      .eq('user_id', userId);

    // Add search functionality
    if (search) {
      query = query.textSearch('text', search as string);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: transcripts, error: transcriptsError } = await query;

    if (transcriptsError) {
      logger.error('Failed to get transcripts:', transcriptsError);
      return res.status(500).json({ error: 'Failed to get transcripts' });
    }

    res.json({
      transcripts: transcripts || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: transcripts?.length || 0,
      },
    });

  } catch (error) {
    logger.error('Get transcripts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/transcript/:transcriptId - Get specific transcript
router.get('/:transcriptId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { transcriptId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select(`
        id,
        video_id,
        text,
        language,
        confidence_score,
        word_timestamps,
        processing_engine,
        created_at,
        videos (
          id,
          question_id,
          duration,
          thumbnail_url,
          file_path,
          questions (
            id,
            module,
            text,
            tags
          )
        ),
        memories (
          id,
          content_summary,
          sentiment,
          emotion_scores,
          topics,
          importance_score
        )
      `)
      .eq('id', transcriptId)
      .eq('user_id', userId)
      .single();

    if (transcriptError || !transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json({
      transcript,
    });

  } catch (error) {
    logger.error('Get transcript details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/transcript/:transcriptId - Update transcript text
router.put('/:transcriptId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { transcriptId } = req.params;
    const { text } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Valid text is required' });
    }

    // Verify transcript ownership
    const { data: existingTranscript, error: checkError } = await supabase
      .from('transcripts')
      .select('id, video_id')
      .eq('id', transcriptId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingTranscript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Update transcript
    const { data: transcript, error: updateError } = await supabase
      .from('transcripts')
      .update({ 
        text: text.trim(),
        confidence_score: null, // Reset confidence since it's manually edited
      })
      .eq('id', transcriptId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !transcript) {
      logger.error('Failed to update transcript:', updateError);
      return res.status(500).json({ error: 'Failed to update transcript' });
    }

    // Regenerate embedding for updated transcript
    try {
      const { jobProcessor } = await import('@/services/jobProcessor');
      await jobProcessor.queueEmbeddingGeneration({
        videoId: existingTranscript.video_id,
        userId,
        questionId: '', // Will be fetched in the job
        sessionId: '', // Will be fetched in the job
      });
    } catch (embeddingError) {
      logger.warn('Failed to queue embedding regeneration:', embeddingError);
    }

    logger.info(`Transcript updated: ${transcriptId}`);

    res.json({
      success: true,
      message: 'Transcript updated successfully',
      transcript: {
        id: transcript.id,
        text: transcript.text,
        confidence_score: transcript.confidence_score,
      },
    });

  } catch (error) {
    logger.error('Update transcript error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/transcript/:transcriptId/regenerate - Regenerate transcript
router.post('/:transcriptId/regenerate', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { transcriptId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get transcript and video info
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select(`
        id,
        video_id,
        videos (
          id,
          question_id,
          session_id,
          file_path
        )
      `)
      .eq('id', transcriptId)
      .eq('user_id', userId)
      .single();

    if (transcriptError || !transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Queue transcription job
    const { jobProcessor } = await import('@/services/jobProcessor');
    await jobProcessor.queueTranscription({
      videoId: transcript.video_id,
      userId,
      questionId: transcript.videos?.question_id || '',
      sessionId: transcript.videos?.session_id || '',
    });

    logger.info(`Transcript regeneration queued: ${transcriptId}`);

    res.json({
      success: true,
      message: 'Transcript regeneration started',
      transcript_id: transcriptId,
      estimated_completion_time: '2-5 minutes',
    });

  } catch (error) {
    logger.error('Regenerate transcript error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/transcript/search - Search transcripts
router.get('/search', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { q, limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search transcripts using full-text search
    const { data: transcripts, error: searchError } = await supabase
      .from('transcripts')
      .select(`
        id,
        video_id,
        text,
        confidence_score,
        created_at,
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
      .eq('user_id', userId)
      .textSearch('text', q as string)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (searchError) {
      logger.error('Transcript search error:', searchError);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Highlight search terms in results
    const highlightedResults = transcripts?.map(transcript => ({
      ...transcript,
      highlighted_text: highlightSearchTerms(transcript.text, q as string),
    })) || [];

    res.json({
      results: highlightedResults,
      query: q,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: transcripts?.length || 0,
      },
    });

  } catch (error) {
    logger.error('Search transcripts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/transcript/statistics - Get transcript statistics
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('text, language, confidence_score, processing_engine, created_at')
      .eq('user_id', userId);

    if (!transcripts) {
      return res.json({
        total_transcripts: 0,
        total_words: 0,
        average_confidence: 0,
        languages: {},
        engines: {},
      });
    }

    // Calculate statistics
    const totalWords = transcripts.reduce((sum, t) => sum + (t.text?.split(' ').length || 0), 0);
    const averageConfidence = transcripts.length > 0
      ? transcripts.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / transcripts.length
      : 0;

    const languages = transcripts.reduce((acc: Record<string, number>, t) => {
      acc[t.language] = (acc[t.language] || 0) + 1;
      return acc;
    }, {});

    const engines = transcripts.reduce((acc: Record<string, number>, t) => {
      acc[t.processing_engine] = (acc[t.processing_engine] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total_transcripts: transcripts.length,
      total_words: totalWords,
      average_confidence: Math.round(averageConfidence * 100) / 100,
      languages,
      engines,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Transcript statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to highlight search terms
function highlightSearchTerms(text: string, query: string): string {
  const terms = query.toLowerCase().split(' ').filter(term => term.length > 2);
  let highlightedText = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });

  return highlightedText;
}

export default router;