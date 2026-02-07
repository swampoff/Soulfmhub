import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ImageUpload } from '../../components/ImageUpload';
import { AudioUpload } from '../../components/AudioUpload';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { 
  Image as ImageIcon, 
  Music, 
  CheckCircle2, 
  Upload, 
  FileImage,
  FileAudio,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

export function UploadTestPage() {
  // Image upload state
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageMetadata, setImageMetadata] = useState<any>(null);

  // Audio upload state
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioMetadata, setAudioMetadata] = useState<any>(null);

  // Test scenarios
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [episodeUrl, setEpisodeUrl] = useState<string>('');

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    toast.success('Image uploaded successfully!', {
      description: 'URL copied to state'
    });
  };

  const handleAudioUpload = (url: string, metadata?: any) => {
    setAudioUrl(url);
    setAudioMetadata(metadata);
    toast.success('Audio uploaded successfully!', {
      description: metadata?.duration 
        ? `Duration: ${Math.floor(metadata.duration)}s` 
        : 'Metadata extracted'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🧪 Upload Components Test Lab
          </h1>
          <p className="text-gray-400">
            Test and verify image and audio upload functionality
          </p>
        </div>

        {/* Test Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/10 border border-[#00d9ff]/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-[#00d9ff]" />
            <div>
              <h3 className="text-sm font-semibold text-white">Upload Test Environment</h3>
              <p className="text-xs text-gray-400">
                Test uploads below to verify backend integration and storage
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Image Upload Tests */}
          <div className="space-y-6">
            <Card className="bg-[#141414] border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#00d9ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Image Upload Test</h2>
                  <p className="text-sm text-gray-400">Test cover image upload</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Test 1: Basic Image Upload */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Test 1: Basic Upload (1:1 aspect ratio)
                  </h3>
                  <ImageUpload
                    label="Upload Test Image"
                    currentImage={imageUrl}
                    onUpload={handleImageUpload}
                    aspectRatio="1:1"
                    maxSizeMB={5}
                  />
                </div>

                {/* Result Display */}
                {imageUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <h4 className="text-sm font-semibold text-green-400">Upload Successful!</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">URL:</span>
                        <code className="flex-1 bg-black/30 px-2 py-1 rounded text-gray-300 truncate">
                          {imageUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(imageUrl)}
                          className="h-6 px-2 text-[#00d9ff]"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openInNewTab(imageUrl)}
                          className="h-6 px-2 text-[#00d9ff]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Test 2: Different Aspect Ratio */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Test 2: Cover Upload (16:9 aspect ratio)
                  </h3>
                  <ImageUpload
                    label="Wide Cover Image"
                    currentImage={coverUrl}
                    onUpload={setCoverUrl}
                    aspectRatio="16:9"
                    maxSizeMB={5}
                  />
                </div>

                {/* Test Checklist */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">✅ Test Checklist:</h3>
                  <div className="space-y-2 text-xs text-gray-400">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!imageUrl} readOnly />
                      <span>Image upload works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>Drag & drop works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>Preview displays correctly</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>Remove button works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>File size validation works</span>
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Audio Upload Tests */}
          <div className="space-y-6">
            <Card className="bg-[#141414] border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00ffaa]/20 to-[#00d9ff]/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-[#00ffaa]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Audio Upload Test</h2>
                  <p className="text-sm text-gray-400">Test podcast episode upload</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Test 1: Basic Audio Upload */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Test 1: Audio Upload with Metadata
                  </h3>
                  <AudioUpload
                    label="Upload Test Audio"
                    currentAudio={audioUrl}
                    onUpload={handleAudioUpload}
                    maxSizeMB={50}
                    extractMetadata={true}
                  />
                </div>

                {/* Result Display */}
                {audioUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <h4 className="text-sm font-semibold text-green-400">Upload Successful!</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">URL:</span>
                        <code className="flex-1 bg-black/30 px-2 py-1 rounded text-gray-300 truncate">
                          {audioUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(audioUrl)}
                          className="h-6 px-2 text-[#00ffaa]"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openInNewTab(audioUrl)}
                          className="h-6 px-2 text-[#00ffaa]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Metadata */}
                      {audioMetadata && (
                        <div className="bg-black/30 rounded p-3 space-y-1 text-xs">
                          <div className="text-gray-400 font-semibold mb-2">Extracted Metadata:</div>
                          {audioMetadata.title && (
                            <div className="flex gap-2">
                              <span className="text-gray-500">Title:</span>
                              <span className="text-white">{audioMetadata.title}</span>
                            </div>
                          )}
                          {audioMetadata.artist && (
                            <div className="flex gap-2">
                              <span className="text-gray-500">Artist:</span>
                              <span className="text-white">{audioMetadata.artist}</span>
                            </div>
                          )}
                          {audioMetadata.duration && (
                            <div className="flex gap-2">
                              <span className="text-gray-500">Duration:</span>
                              <span className="text-white">
                                {Math.floor(audioMetadata.duration / 60)}:
                                {String(Math.floor(audioMetadata.duration % 60)).padStart(2, '0')}
                              </span>
                            </div>
                          )}
                          {audioMetadata.bitrate && (
                            <div className="flex gap-2">
                              <span className="text-gray-500">Bitrate:</span>
                              <span className="text-white">{audioMetadata.bitrate} kbps</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Test 2: Episode Upload */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Test 2: Podcast Episode Upload
                  </h3>
                  <AudioUpload
                    label="Podcast Episode Audio"
                    currentAudio={episodeUrl}
                    onUpload={(url, metadata) => {
                      setEpisodeUrl(url);
                      toast.success('Episode uploaded!', {
                        description: `Duration: ${Math.floor(metadata?.duration || 0)}s`
                      });
                    }}
                    maxSizeMB={50}
                    extractMetadata={true}
                  />
                </div>

                {/* Test Checklist */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">✅ Test Checklist:</h3>
                  <div className="space-y-2 text-xs text-gray-400">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!audioUrl} readOnly />
                      <span>Audio upload works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!audioMetadata} readOnly />
                      <span>Metadata extraction works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>Drag & drop works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>Audio preview plays</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>Remove button works</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" readOnly />
                      <span>File size validation works</span>
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Test Instructions */}
        <Card className="bg-[#141414] border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">📖 Test Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-[#00d9ff] mb-2">Image Upload Tests:</h3>
              <ol className="space-y-2 text-gray-400 list-decimal list-inside">
                <li>Click "Upload Test Image" area</li>
                <li>Select a JPG/PNG image (max 5MB)</li>
                <li>Verify preview appears</li>
                <li>Try drag & drop</li>
                <li>Click "Change" to upload different image</li>
                <li>Click "Remove" to clear</li>
                <li>Copy URL and open in browser to verify</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-[#00ffaa] mb-2">Audio Upload Tests:</h3>
              <ol className="space-y-2 text-gray-400 list-decimal list-inside">
                <li>Click "Upload Test Audio" area</li>
                <li>Select an MP3/WAV file (max 50MB)</li>
                <li>Watch upload progress</li>
                <li>Verify audio player appears</li>
                <li>Check metadata extraction</li>
                <li>Test audio playback</li>
                <li>Try drag & drop</li>
                <li>Click Remove and re-upload</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="font-semibold text-white mb-3">✅ Expected Results:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                <span className="text-green-400">✓</span> Upload completes successfully
              </div>
              <div>
                <span className="text-green-400">✓</span> URL is generated and displayed
              </div>
              <div>
                <span className="text-green-400">✓</span> Preview/player works correctly
              </div>
              <div>
                <span className="text-green-400">✓</span> Metadata is extracted (audio)
              </div>
              <div>
                <span className="text-green-400">✓</span> Toast notifications appear
              </div>
              <div>
                <span className="text-green-400">✓</span> File validation works
              </div>
            </div>
          </div>
        </Card>

        {/* Backend Test */}
        <Card className="bg-[#141414] border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">🔧 Backend Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-green-400">Image Endpoint</h3>
              </div>
              <code className="text-xs text-gray-400">
                POST /upload/image
              </code>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-green-400">Audio Endpoint</h3>
              </div>
              <code className="text-xs text-gray-400">
                POST /upload/audio
              </code>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-green-400">Storage Buckets</h3>
              </div>
              <code className="text-xs text-gray-400">
                covers, tracks
              </code>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
