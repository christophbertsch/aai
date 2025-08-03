import React, { useState, useRef, useEffect } from 'react';
import { Video, Square, Play, RotateCcw, Check, ArrowLeft, Camera } from 'lucide-react';
import type { InterviewQuestion, VideoRecording } from '../types';

interface VideoRecorderProps {
  question: InterviewQuestion;
  onRecordingComplete: (recording: VideoRecording) => void;
  onBack: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'reviewing';

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  question,
  onRecordingComplete,
  onBack
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestCameraPermission();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setHasPermission(true);
      setPermissionError(null);
    } catch (error) {
      console.error('Camera permission error:', error);
      setPermissionError('Camera access is required to record your interview. Please allow camera access and refresh the page.');
      setHasPermission(false);
    }
  };

  const startRecording = async () => {
    if (!hasPermission || !videoRef.current?.srcObject) {
      await requestCameraPermission();
      return;
    }

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordingState('recorded');
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (recordedChunksRef.current.length > 0 && videoRef.current) {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.play();
      setRecordingState('reviewing');
    }
  };

  const retakeRecording = () => {
    recordedChunksRef.current = [];
    setRecordingTime(0);
    setRecordingState('idle');
    requestCameraPermission();
  };

  const approveRecording = () => {
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      
      const recording: VideoRecording = {
        id: crypto.randomUUID(),
        questionId: question.id,
        userId: '', // Will be set by parent
        duration: recordingTime,
        fileSize: blob.size,
        uploadStatus: 'pending' as any,
        recordedAt: new Date()
      };

      onRecordingComplete(recording);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Camera size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Camera Access Required</h2>
          <p className="text-gray-600 mb-6">{permissionError}</p>
          <div className="space-y-3">
            <button onClick={requestCameraPermission} className="w-full btn-primary">
              Try Again
            </button>
            <button onClick={onBack} className="w-full btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="text-sm text-gray-500">
            {question.module} • Question {question.questionNumber}
          </div>
        </div>

        {/* Question */}
        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {question.question}
          </h1>
          <p className="text-gray-600">
            Take your time to think about your response. When you're ready, click record and share your story.
          </p>
        </div>

        {/* Video Recording Area */}
        <div className="card mb-6">
          <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              muted={recordingState !== 'reviewing'}
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Recording Indicator */}
            {recordingState === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
              </div>
            )}

            {/* Recording Time Display */}
            {recordingState === 'recorded' && (
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full">
                <span className="text-sm">Duration: {formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            {recordingState === 'idle' && (
              <button
                onClick={startRecording}
                disabled={!hasPermission}
                className="flex items-center space-x-2 btn-primary"
              >
                <Video size={20} />
                <span>Start Recording</span>
              </button>
            )}

            {recordingState === 'recording' && (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-full font-medium hover:bg-red-600 transition-colors"
              >
                <Square size={20} />
                <span>Stop Recording</span>
              </button>
            )}

            {recordingState === 'recorded' && (
              <div className="flex space-x-4">
                <button
                  onClick={playRecording}
                  className="flex items-center space-x-2 btn-secondary"
                >
                  <Play size={20} />
                  <span>Review</span>
                </button>
                <button
                  onClick={retakeRecording}
                  className="flex items-center space-x-2 btn-secondary"
                >
                  <RotateCcw size={20} />
                  <span>Retake</span>
                </button>
                <button
                  onClick={approveRecording}
                  className="flex items-center space-x-2 btn-primary"
                >
                  <Check size={20} />
                  <span>Approve & Continue</span>
                </button>
              </div>
            )}

            {recordingState === 'reviewing' && (
              <div className="flex space-x-4">
                <button
                  onClick={retakeRecording}
                  className="flex items-center space-x-2 btn-secondary"
                >
                  <RotateCcw size={20} />
                  <span>Retake</span>
                </button>
                <button
                  onClick={approveRecording}
                  className="flex items-center space-x-2 btn-primary"
                >
                  <Check size={20} />
                  <span>Approve & Continue</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Recording Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Ensure you're in a well-lit environment</li>
            <li>• Speak clearly and at a comfortable pace</li>
            <li>• Look directly at the camera when speaking</li>
            <li>• Take your time - there's no rush</li>
            <li>• You can always retake if you're not satisfied</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoRecorder;