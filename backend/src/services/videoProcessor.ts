import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/utils/logger';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface VideoMetadata {
  duration: number;
  resolution: string;
  format: string;
  fileSize: number;
  hasAudio: boolean;
  audioQuality?: {
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
}

export interface AudioExtractResult {
  audioBuffer: Buffer;
  duration: number;
  quality: {
    sampleRate: number;
    channels: number;
    noiseLevel: number;
    clarity: number;
  };
}

export class VideoProcessorService {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.TEMP_DIR || '/tmp';
  }

  // Extract metadata from video file
  async getVideoMetadata(videoBuffer: Buffer): Promise<VideoMetadata> {
    const tempPath = path.join(this.tempDir, `temp_${Date.now()}.mp4`);
    
    try {
      await fs.writeFile(tempPath, videoBuffer);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }

          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

          const result: VideoMetadata = {
            duration: metadata.format.duration || 0,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
            format: metadata.format.format_name || 'unknown',
            fileSize: metadata.format.size || videoBuffer.length,
            hasAudio: !!audioStream,
            audioQuality: audioStream ? {
              sampleRate: audioStream.sample_rate || 0,
              channels: audioStream.channels || 0,
              bitrate: audioStream.bit_rate || 0,
            } : undefined,
          };

          resolve(result);
        });
      });
    } catch (error) {
      logger.error('❌ Failed to get video metadata:', error);
      throw error;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Generate thumbnail from video
  async generateThumbnail(videoBuffer: Buffer, timeOffset: number = 5): Promise<Buffer> {
    const tempVideoPath = path.join(this.tempDir, `temp_video_${Date.now()}.mp4`);
    const tempThumbnailPath = path.join(this.tempDir, `temp_thumb_${Date.now()}.jpg`);

    try {
      await fs.writeFile(tempVideoPath, videoBuffer);

      return new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: [timeOffset],
            filename: path.basename(tempThumbnailPath),
            folder: path.dirname(tempThumbnailPath),
            size: '320x240'
          })
          .on('end', async () => {
            try {
              const thumbnailBuffer = await fs.readFile(tempThumbnailPath);
              resolve(thumbnailBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      });
    } catch (error) {
      logger.error('❌ Failed to generate thumbnail:', error);
      throw error;
    } finally {
      // Clean up temp files
      try {
        await fs.unlink(tempVideoPath);
        await fs.unlink(tempThumbnailPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Extract audio from video for transcription and voice cloning
  async extractAudio(videoBuffer: Buffer): Promise<AudioExtractResult> {
    const tempVideoPath = path.join(this.tempDir, `temp_video_${Date.now()}.mp4`);
    const tempAudioPath = path.join(this.tempDir, `temp_audio_${Date.now()}.wav`);

    try {
      await fs.writeFile(tempVideoPath, videoBuffer);

      return new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .output(tempAudioPath)
          .audioCodec('pcm_s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .on('end', async () => {
            try {
              const audioBuffer = await fs.readFile(tempAudioPath);
              
              // Get audio metadata
              const metadata = await this.getAudioMetadata(tempAudioPath);
              
              // Analyze audio quality
              const quality = await this.analyzeAudioQuality(tempAudioPath);

              resolve({
                audioBuffer,
                duration: metadata.duration,
                quality,
              });
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject)
          .run();
      });
    } catch (error) {
      logger.error('❌ Failed to extract audio:', error);
      throw error;
    } finally {
      // Clean up temp files
      try {
        await fs.unlink(tempVideoPath);
        await fs.unlink(tempAudioPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Extract clean voice samples for training
  async extractVoiceSamples(
    videoBuffer: Buffer,
    minDuration: number = 10,
    maxDuration: number = 30
  ): Promise<Buffer[]> {
    const tempVideoPath = path.join(this.tempDir, `temp_video_${Date.now()}.mp4`);
    
    try {
      await fs.writeFile(tempVideoPath, videoBuffer);
      
      // Get video duration
      const metadata = await this.getVideoMetadata(videoBuffer);
      const totalDuration = metadata.duration;
      
      const samples: Buffer[] = [];
      const sampleCount = Math.floor(totalDuration / maxDuration);
      
      for (let i = 0; i < sampleCount; i++) {
        const startTime = i * maxDuration;
        const duration = Math.min(maxDuration, totalDuration - startTime);
        
        if (duration >= minDuration) {
          const sample = await this.extractAudioSegment(
            tempVideoPath,
            startTime,
            duration
          );
          
          // Check if sample is suitable for training
          if (await this.isAudioSuitableForTraining(sample)) {
            samples.push(sample);
          }
        }
      }
      
      logger.info(`✅ Extracted ${samples.length} voice samples`);
      return samples;
    } catch (error) {
      logger.error('❌ Failed to extract voice samples:', error);
      throw error;
    } finally {
      try {
        await fs.unlink(tempVideoPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Compress video for storage optimization
  async compressVideo(
    videoBuffer: Buffer,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<Buffer> {
    const tempInputPath = path.join(this.tempDir, `temp_input_${Date.now()}.mp4`);
    const tempOutputPath = path.join(this.tempDir, `temp_output_${Date.now()}.mp4`);

    try {
      await fs.writeFile(tempInputPath, videoBuffer);

      const qualitySettings = {
        low: { crf: 28, preset: 'fast' },
        medium: { crf: 23, preset: 'medium' },
        high: { crf: 18, preset: 'slow' },
      };

      const settings = qualitySettings[quality];

      return new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .output(tempOutputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .addOption('-crf', settings.crf.toString())
          .addOption('-preset', settings.preset)
          .on('end', async () => {
            try {
              const compressedBuffer = await fs.readFile(tempOutputPath);
              resolve(compressedBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject)
          .run();
      });
    } catch (error) {
      logger.error('❌ Failed to compress video:', error);
      throw error;
    } finally {
      try {
        await fs.unlink(tempInputPath);
        await fs.unlink(tempOutputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private async getAudioMetadata(audioPath: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
        });
      });
    });
  }

  private async analyzeAudioQuality(audioPath: string): Promise<{
    sampleRate: number;
    channels: number;
    noiseLevel: number;
    clarity: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        if (!audioStream) {
          reject(new Error('No audio stream found'));
          return;
        }

        // Simple quality assessment based on audio properties
        const sampleRate = audioStream.sample_rate || 16000;
        const channels = audioStream.channels || 1;
        
        // Estimate noise level and clarity (simplified)
        const noiseLevel = Math.random() * 0.3; // Placeholder
        const clarity = Math.max(0.5, 1 - noiseLevel);

        resolve({
          sampleRate,
          channels,
          noiseLevel,
          clarity,
        });
      });
    });
  }

  private async extractAudioSegment(
    videoPath: string,
    startTime: number,
    duration: number
  ): Promise<Buffer> {
    const tempAudioPath = path.join(this.tempDir, `temp_segment_${Date.now()}.wav`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(tempAudioPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(22050)
        .seekInput(startTime)
        .duration(duration)
        .on('end', async () => {
          try {
            const audioBuffer = await fs.readFile(tempAudioPath);
            await fs.unlink(tempAudioPath);
            resolve(audioBuffer);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .run();
    });
  }

  private async isAudioSuitableForTraining(audioBuffer: Buffer): Promise<boolean> {
    // Simple heuristics for audio quality
    // In a real implementation, you might use more sophisticated audio analysis
    
    const minSize = 50000; // Minimum file size in bytes
    const maxSize = 5000000; // Maximum file size in bytes
    
    if (audioBuffer.length < minSize || audioBuffer.length > maxSize) {
      return false;
    }
    
    // Check for silence (very basic check)
    const samples = new Int16Array(audioBuffer.buffer);
    const avgAmplitude = samples.reduce((sum, sample) => sum + Math.abs(sample), 0) / samples.length;
    
    // If average amplitude is too low, it might be mostly silence
    if (avgAmplitude < 1000) {
      return false;
    }
    
    return true;
  }
}

export const videoProcessorService = new VideoProcessorService();