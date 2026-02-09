import React, { useState, useRef } from 'react';
import { Upload, X, Music, Loader2, FileAudio } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getAccessToken } from '../../lib/api';
import { projectId } from '/utils/supabase/info';

interface AudioUploadProps {
  onUpload: (url: string, metadata?: any) => void;
  currentAudio?: string;
  label?: string;
  maxSizeMB?: number;
  extractMetadata?: boolean;
}

export function AudioUpload({
  onUpload,
  currentAudio,
  label = 'Upload Audio',
  maxSizeMB = 50,
  extractMetadata = true
}: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(currentAudio || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/ogg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i)) {
      toast.error('Please select a valid audio file (MP3, WAV, M4A, FLAC, OGG)');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('extractMetadata', extractMetadata.toString());

      // Simulate progress (since we can't get real upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/upload/audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (data.url) {
        setAudioUrl(data.url);
        onUpload(data.url, data.metadata);
        toast.success('Audio uploaded successfully');
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload audio');
      setFileName(null);
      setAudioUrl(currentAudio || null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setFileName(null);
    setAudioUrl(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-white">{label}</label>
      )}
      
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
          onChange={handleFileChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {audioUrl || fileName ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <div className="relative rounded-lg border-2 border-[#00d9ff]/30 bg-gray-800/50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                      <FileAudio className="w-6 h-6 text-[#00d9ff]" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {fileName || 'Audio file'}
                    </p>
                    {audioUrl && (
                      <audio 
                        src={audioUrl} 
                        controls 
                        className="w-full mt-2"
                        style={{ height: '32px' }}
                      />
                    )}
                  </div>

                  {!uploading && (
                    <div className="flex-shrink-0 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClick}
                        className="bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRemove}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative rounded-lg border-2 border-dashed cursor-pointer p-8
                transition-all duration-300
                ${isDragging 
                  ? 'border-[#00d9ff] bg-[#00d9ff]/10' 
                  : 'border-gray-600 hover:border-[#00d9ff]/50 bg-gray-800/50'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <motion.div
                  animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                  className="mb-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
                    ) : (
                      <Music className="w-8 h-8 text-[#00d9ff]" />
                    )}
                  </div>
                </motion.div>

                {uploading ? (
                  <>
                    <p className="text-sm text-white mb-2">Uploading...</p>
                    <div className="w-full max-w-xs">
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-white mb-1">
                      {isDragging ? 'Drop audio file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400">
                      MP3, WAV, M4A, FLAC, OGG up to {maxSizeMB}MB
                    </p>
                    {extractMetadata && (
                      <p className="text-xs text-gray-500 mt-2">
                        Metadata will be extracted automatically
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}