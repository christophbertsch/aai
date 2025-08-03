import React, { useState } from 'react';
import { Search, Play, ArrowLeft, Calendar, Clock, Upload } from 'lucide-react';
import type { VideoRecording, LibraryFilter } from '../types';

interface LibraryProps {
  recordings: VideoRecording[];
  onBack: () => void;
}

const Library: React.FC<LibraryProps> = ({ recordings, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>({});
  const [selectedRecording, setSelectedRecording] = useState<VideoRecording | null>(null);

  const filteredRecordings = recordings.filter(recording => {
    if (searchQuery && !recording.transcript?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter.uploadStatus && recording.uploadStatus !== filter.uploadStatus) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'uploading': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'retrying': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (selectedRecording) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedRecording(null)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} />
              <span>Back to Library</span>
            </button>
          </div>

          <div className="card mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
              {selectedRecording.cloudURL ? (
                <video
                  src={selectedRecording.cloudURL}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Play size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Video not available</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Recording Details</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRecording.uploadStatus)}`}>
                  {selectedRecording.uploadStatus}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Recording Info</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(selectedRecording.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span>{formatFileSize(selectedRecording.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recorded:</span>
                      <span>{new Date(selectedRecording.recordedAt).toLocaleDateString()}</span>
                    </div>
                    {selectedRecording.uploadedAt && (
                      <div className="flex justify-between">
                        <span>Uploaded:</span>
                        <span>{new Date(selectedRecording.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRecording.transcript && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Transcript</h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 max-h-40 overflow-y-auto">
                      {selectedRecording.transcript}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">Your Library</h1>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transcripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={filter.uploadStatus || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, uploadStatus: e.target.value as any || undefined }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="uploading">Uploading</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {recordings.length}
            </div>
            <div className="text-sm text-gray-600">Total Recordings</div>
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {recordings.filter(r => r.uploadStatus === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Uploaded</div>
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {Math.round(recordings.reduce((total, r) => total + r.duration, 0) / 60)}
            </div>
            <div className="text-sm text-gray-600">Total Minutes</div>
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {Math.round(recordings.reduce((total, r) => total + r.fileSize, 0) / (1024 * 1024))}
            </div>
            <div className="text-sm text-gray-600">Total MB</div>
          </div>
        </div>

        {/* Recordings Grid */}
        {filteredRecordings.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Play size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {recordings.length === 0 ? 'No recordings yet' : 'No recordings match your search'}
            </h3>
            <p className="text-gray-600">
              {recordings.length === 0 
                ? 'Start your first interview to see recordings here'
                : 'Try adjusting your search or filters'
              }
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((recording) => (
              <div
                key={recording.id}
                onClick={() => setSelectedRecording(recording)}
                className="card hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recording.uploadStatus)}`}>
                    {recording.uploadStatus}
                  </span>
                  <button className="text-primary-600 hover:text-primary-700">
                    <Play size={20} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock size={16} />
                    <span>{formatDuration(recording.duration)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>{new Date(recording.recordedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Upload size={16} />
                    <span>{formatFileSize(recording.fileSize)}</span>
                  </div>
                </div>

                {recording.transcript && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {recording.transcript.substring(0, 120)}...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;