import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { authMiddleware } from '@/middleware/auth';

// Routes
import uploadRoutes from '@/routes/upload';
import personaRoutes from '@/routes/persona';
import userRoutes from '@/routes/user';
import videoRoutes from '@/routes/video';
import transcriptRoutes from '@/routes/transcript';
import memoryRoutes from '@/routes/memory';
import voiceRoutes from '@/routes/voice';

// Services
import { JobProcessor } from '@/services/jobProcessor';
import { supabase } from '@/services/supabase';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://legacyai.com', 'https://app.legacyai.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/persona', authMiddleware, personaRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/video', authMiddleware, videoRoutes);
app.use('/api/transcript', authMiddleware, transcriptRoutes);
app.use('/api/memory', authMiddleware, memoryRoutes);
app.use('/api/voice', authMiddleware, voiceRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize job processor
const jobProcessor = new JobProcessor();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    jobProcessor.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    jobProcessor.close();
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Legacy.AI Backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);
  
  // Initialize job processor
  jobProcessor.start();
});

export default app;