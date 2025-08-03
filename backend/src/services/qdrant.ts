import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from '@/utils/logger';

const COLLECTION_NAME = 'legacy_memories';

class QdrantService {
  private client: QdrantClient;
  private isInitialized = false;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === COLLECTION_NAME
      );

      if (!collectionExists) {
        // Create collection with OpenAI embedding dimensions
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: 1536, // OpenAI text-embedding-ada-002 dimension
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        logger.info(`✅ Created Qdrant collection: ${COLLECTION_NAME}`);
      }

      this.isInitialized = true;
      logger.info('✅ Qdrant service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Qdrant:', error);
      throw error;
    }
  }

  async addMemory(
    id: string,
    userId: string,
    embedding: number[],
    metadata: {
      questionId: string;
      videoId: string;
      transcriptId: string;
      content: string;
      tags: string[];
      sentiment?: number;
      topics?: string[];
      timestamp: string;
    }
  ) {
    await this.ensureInitialized();

    try {
      await this.client.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id,
            vector: embedding,
            payload: {
              userId,
              ...metadata,
            },
          },
        ],
      });

      logger.info(`✅ Added memory to Qdrant: ${id}`);
      return id;
    } catch (error) {
      logger.error('❌ Failed to add memory to Qdrant:', error);
      throw error;
    }
  }

  async searchMemories(
    userId: string,
    queryEmbedding: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ) {
    await this.ensureInitialized();

    try {
      const searchResult = await this.client.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        filter: {
          must: [
            {
              key: 'userId',
              match: { value: userId },
            },
          ],
        },
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      logger.info(`🔍 Found ${searchResult.length} relevant memories for user ${userId}`);
      return searchResult;
    } catch (error) {
      logger.error('❌ Failed to search memories in Qdrant:', error);
      throw error;
    }
  }

  async deleteMemory(id: string) {
    await this.ensureInitialized();

    try {
      await this.client.delete(COLLECTION_NAME, {
        wait: true,
        points: [id],
      });

      logger.info(`🗑️ Deleted memory from Qdrant: ${id}`);
    } catch (error) {
      logger.error('❌ Failed to delete memory from Qdrant:', error);
      throw error;
    }
  }

  async deleteUserMemories(userId: string) {
    await this.ensureInitialized();

    try {
      await this.client.delete(COLLECTION_NAME, {
        wait: true,
        filter: {
          must: [
            {
              key: 'userId',
              match: { value: userId },
            },
          ],
        },
      });

      logger.info(`🗑️ Deleted all memories for user: ${userId}`);
    } catch (error) {
      logger.error('❌ Failed to delete user memories from Qdrant:', error);
      throw error;
    }
  }

  async getMemoryById(id: string) {
    await this.ensureInitialized();

    try {
      const result = await this.client.retrieve(COLLECTION_NAME, {
        ids: [id],
        with_payload: true,
        with_vector: true,
      });

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error('❌ Failed to get memory from Qdrant:', error);
      throw error;
    }
  }

  async getCollectionInfo() {
    await this.ensureInitialized();

    try {
      const info = await this.client.getCollection(COLLECTION_NAME);
      return info;
    } catch (error) {
      logger.error('❌ Failed to get collection info:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export const qdrantService = new QdrantService();