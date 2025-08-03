import express from 'express';
import { supabase } from '@/services/supabase';
import { qdrantService } from '@/services/qdrant';
import { openaiService } from '@/services/openai';
import { logger } from '@/utils/logger';

const router = express.Router();

// GET /api/memory - Get user's memories
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0, topic, sentiment_min, sentiment_max } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = supabase
      .from('memories')
      .select(`
        id,
        video_id,
        question_id,
        content_summary,
        sentiment,
        emotion_scores,
        topics,
        tags,
        importance_score,
        created_at,
        questions (
          module,
          text
        ),
        videos (
          thumbnail_url,
          duration
        )
      `)
      .eq('user_id', userId);

    // Apply filters
    if (topic) {
      query = query.contains('topics', [topic as string]);
    }

    if (sentiment_min !== undefined) {
      query = query.gte('sentiment', Number(sentiment_min));
    }

    if (sentiment_max !== undefined) {
      query = query.lte('sentiment', Number(sentiment_max));
    }

    query = query
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: memories, error: memoriesError } = await query;

    if (memoriesError) {
      logger.error('Failed to get memories:', memoriesError);
      return res.status(500).json({ error: 'Failed to get memories' });
    }

    res.json({
      memories: memories || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: memories?.length || 0,
      },
    });

  } catch (error) {
    logger.error('Get memories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/memory/:memoryId - Get specific memory details
router.get('/:memoryId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { memoryId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select(`
        id,
        video_id,
        question_id,
        transcript_id,
        content_summary,
        sentiment,
        emotion_scores,
        topics,
        tags,
        importance_score,
        created_at,
        questions (
          id,
          module,
          text,
          tags,
          difficulty_level
        ),
        videos (
          id,
          thumbnail_url,
          duration,
          file_path
        ),
        transcripts (
          id,
          text,
          confidence_score,
          language
        )
      `)
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({
      memory,
    });

  } catch (error) {
    logger.error('Get memory details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/memory/search - Semantic search through memories
router.post('/search', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { query, limit = 10, threshold = 0.7 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Generate embedding for the search query
    const queryEmbedding = await openaiService.generateEmbedding(query);

    // Search in Qdrant
    const searchResults = await qdrantService.searchMemories(
      userId,
      queryEmbedding,
      Number(limit),
      Number(threshold)
    );

    // Get memory details from database
    const memoryIds = searchResults.map(result => result.payload?.transcriptId).filter(Boolean);
    
    let memories: any[] = [];
    if (memoryIds.length > 0) {
      const { data: memoryData, error: memoryError } = await supabase
        .from('memories')
        .select(`
          id,
          content_summary,
          sentiment,
          topics,
          tags,
          importance_score,
          created_at,
          questions (
            module,
            text
          ),
          transcripts (
            text
          )
        `)
        .in('transcript_id', memoryIds)
        .eq('user_id', userId);

      if (!memoryError && memoryData) {
        memories = memoryData.map((memory, index) => ({
          ...memory,
          relevance_score: searchResults[index]?.score || 0,
          highlighted_content: highlightRelevantParts(
            memory.transcripts?.text || memory.content_summary,
            query
          ),
        }));
      }
    }

    res.json({
      query,
      results: memories,
      total_results: memories.length,
      search_threshold: Number(threshold),
    });

  } catch (error) {
    logger.error('Memory search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/memory/:memoryId/importance - Update memory importance score
router.put('/:memoryId/importance', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { memoryId } = req.params;
    const { importance_score } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (typeof importance_score !== 'number' || importance_score < 0 || importance_score > 1) {
      return res.status(400).json({ error: 'Importance score must be between 0 and 1' });
    }

    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({ importance_score })
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !memory) {
      return res.status(404).json({ error: 'Memory not found or update failed' });
    }

    logger.info(`Memory importance updated: ${memoryId} -> ${importance_score}`);

    res.json({
      success: true,
      message: 'Memory importance updated successfully',
      memory: {
        id: memory.id,
        importance_score: memory.importance_score,
      },
    });

  } catch (error) {
    logger.error('Update memory importance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/memory/:memoryId/tags - Add tags to memory
router.post('/:memoryId/tags', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { memoryId } = req.params;
    const { tags } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) {
      return res.status(400).json({ error: 'Tags must be an array of strings' });
    }

    // Get current memory
    const { data: currentMemory, error: getError } = await supabase
      .from('memories')
      .select('tags')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (getError || !currentMemory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Merge with existing tags
    const existingTags = currentMemory.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicates

    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({ tags: newTags })
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !memory) {
      return res.status(500).json({ error: 'Failed to update tags' });
    }

    logger.info(`Memory tags updated: ${memoryId}`);

    res.json({
      success: true,
      message: 'Tags added successfully',
      memory: {
        id: memory.id,
        tags: memory.tags,
      },
    });

  } catch (error) {
    logger.error('Add memory tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/memory/:memoryId/tags - Remove tags from memory
router.delete('/:memoryId/tags', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { memoryId } = req.params;
    const { tags } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) {
      return res.status(400).json({ error: 'Tags must be an array of strings' });
    }

    // Get current memory
    const { data: currentMemory, error: getError } = await supabase
      .from('memories')
      .select('tags')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (getError || !currentMemory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Remove specified tags
    const existingTags = currentMemory.tags || [];
    const updatedTags = existingTags.filter((tag: string) => !tags.includes(tag));

    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({ tags: updatedTags })
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !memory) {
      return res.status(500).json({ error: 'Failed to update tags' });
    }

    logger.info(`Memory tags removed: ${memoryId}`);

    res.json({
      success: true,
      message: 'Tags removed successfully',
      memory: {
        id: memory.id,
        tags: memory.tags,
      },
    });

  } catch (error) {
    logger.error('Remove memory tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/memory/statistics - Get memory statistics
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: memories } = await supabase
      .from('memories')
      .select('sentiment, emotion_scores, topics, tags, importance_score, created_at')
      .eq('user_id', userId);

    if (!memories || memories.length === 0) {
      return res.json({
        total_memories: 0,
        average_sentiment: 0,
        emotion_distribution: {},
        top_topics: [],
        top_tags: [],
        importance_distribution: {},
      });
    }

    // Calculate statistics
    const averageSentiment = memories.reduce((sum, m) => sum + (m.sentiment || 0), 0) / memories.length;

    // Aggregate emotion scores
    const emotionTotals: Record<string, number> = {};
    memories.forEach(memory => {
      if (memory.emotion_scores) {
        Object.entries(memory.emotion_scores).forEach(([emotion, score]) => {
          emotionTotals[emotion] = (emotionTotals[emotion] || 0) + (score as number);
        });
      }
    });

    const emotionDistribution = Object.entries(emotionTotals).reduce((acc, [emotion, total]) => {
      acc[emotion] = total / memories.length;
      return acc;
    }, {} as Record<string, number>);

    // Top topics
    const topicCounts: Record<string, number> = {};
    memories.forEach(memory => {
      memory.topics?.forEach((topic: string) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Top tags
    const tagCounts: Record<string, number> = {};
    memories.forEach(memory => {
      memory.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Importance distribution
    const importanceRanges = {
      low: memories.filter(m => (m.importance_score || 0) < 0.3).length,
      medium: memories.filter(m => (m.importance_score || 0) >= 0.3 && (m.importance_score || 0) < 0.7).length,
      high: memories.filter(m => (m.importance_score || 0) >= 0.7).length,
    };

    res.json({
      total_memories: memories.length,
      average_sentiment: Math.round(averageSentiment * 100) / 100,
      emotion_distribution: emotionDistribution,
      top_topics: topTopics,
      top_tags: topTags,
      importance_distribution: importanceRanges,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Memory statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/memory/:memoryId - Delete memory
router.delete('/:memoryId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { memoryId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get memory details before deletion
    const { data: memory, error: getError } = await supabase
      .from('memories')
      .select('qdrant_id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (getError || !memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('Failed to delete memory from database:', deleteError);
      return res.status(500).json({ error: 'Failed to delete memory' });
    }

    // Delete from Qdrant if qdrant_id exists
    if (memory.qdrant_id) {
      try {
        await qdrantService.deleteMemory(memory.qdrant_id);
      } catch (qdrantError) {
        logger.warn('Failed to delete memory from Qdrant:', qdrantError);
      }
    }

    logger.info(`Memory deleted: ${memoryId}`);

    res.json({
      success: true,
      message: 'Memory deleted successfully',
    });

  } catch (error) {
    logger.error('Delete memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to highlight relevant parts of content
function highlightRelevantParts(content: string, query: string): string {
  const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
  let highlightedContent = content;

  queryWords.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>');
  });

  return highlightedContent;
}

export default router;