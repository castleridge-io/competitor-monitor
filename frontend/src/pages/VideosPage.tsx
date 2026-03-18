import { useState, useEffect } from 'react';
import { Play, RefreshCw, Video, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface VideoSegment {
  id: string;
  competitorId: string;
  order: number;
  script: string;
  startTime: number | null;
  endTime: number | null;
}

interface Video {
  id: string;
  userId: string;
  title: string;
  script: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  provider: 'heygen' | 'tavus';
  providerVideoId: string | null;
  createdAt: string;
  completedAt: string | null;
  segments?: VideoSegment[];
}

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/videos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user-1', // In real app, get from auth context
          title: `Weekly Competitor Digest - ${new Date().toLocaleDateString()}`,
          provider: 'heygen',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate video');

      await fetchVideos();
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const checkVideoStatus = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/check-status`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to check status');

      await fetchVideos();
    } catch (error) {
      console.error('Error checking video status:', error);
    }
  };

  const getStatusIcon = (status: Video['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Digest Videos</h1>
        <p className="text-gray-600 mt-1">
          AI-generated video summaries of competitor changes
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              fetchVideos();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Videos</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <button
          onClick={generateVideo}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Generate New Video
            </>
          )}
        </button>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No videos generated yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Click "Generate New Video" to create your first weekly digest
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Video className="w-16 h-16 text-gray-400" />
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white rounded-full shadow-sm">
                  {getStatusIcon(video.status)}
                  <span className="text-xs font-medium capitalize">{video.status}</span>
                </div>

                {/* Play Button */}
                {video.status === 'completed' && video.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all">
                    <Play className="w-12 h-12 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{formatDate(video.createdAt)}</span>
                  {video.duration && <span>{formatDuration(video.duration)}</span>}
                </div>

                {/* Actions */}
                {(video.status === 'pending' || video.status === 'processing') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      checkVideoStatus(video.id);
                    }}
                    className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Status
                  </button>
                )}

                {video.status === 'failed' && video.error && (
                  <p className="mt-2 text-sm text-red-600">{video.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedVideo.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Created {formatDate(selectedVideo.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Video Player */}
              {selectedVideo.status === 'completed' && selectedVideo.videoUrl ? (
                <div className="mb-6">
                  <video
                    src={selectedVideo.videoUrl}
                    controls
                    className="w-full rounded-lg"
                    poster={selectedVideo.thumbnailUrl || undefined}
                  />
                </div>
              ) : (
                <div className="mb-6 p-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {getStatusIcon(selectedVideo.status)}
                    <p className="mt-2 text-gray-600 capitalize">{selectedVideo.status}</p>
                    {selectedVideo.status === 'processing' && (
                      <button
                        onClick={() => checkVideoStatus(selectedVideo.id)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Check Status
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Script */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Script</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedVideo.script}
                </div>
              </div>

              {/* Segments */}
              {selectedVideo.segments && selectedVideo.segments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Segments</h3>
                  <div className="space-y-2">
                    {selectedVideo.segments.map((segment, index) => (
                      <div key={segment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            Segment {index + 1}
                          </span>
                          {segment.startTime !== null && segment.endTime !== null && (
                            <span className="text-xs text-gray-600">
                              {formatDuration(segment.startTime)} -{' '}
                              {formatDuration(segment.endTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{segment.script}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
