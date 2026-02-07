import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentImage?: string;
  bucketName?: string;
  label?: string;
  aspectRatio?: string; // e.g., '1:1', '16:9', '4:3'
  maxSizeMB?: number;
}

export function ImageUpload({
  onUpload,
  currentImage,
  bucketName = 'make-06086aa3-covers',
  label = 'Upload Image',
  aspectRatio = '1:1',
  maxSizeMB = 5
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/upload/image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (data.url) {
        onUpload(data.url);
        toast.success('Image uploaded successfully');
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
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
    setPreview(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square';
      case '16:9':
        return 'aspect-video';
      case '4:3':
        return 'aspect-[4/3]';
      default:
        return 'aspect-square';
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
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <div className={`${getAspectRatioClass()} relative rounded-lg overflow-hidden bg-gray-900`}>
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin mx-auto mb-2" />
                      <p className="text-sm text-white">Uploading...</p>
                    </div>
                  </div>
                )}

                {!uploading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClick}
                        className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRemove}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 backdrop-blur-sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
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
                ${getAspectRatioClass()}
                relative rounded-lg border-2 border-dashed cursor-pointer
                transition-all duration-300
                ${isDragging 
                  ? 'border-[#00d9ff] bg-[#00d9ff]/10' 
                  : 'border-gray-600 hover:border-[#00d9ff]/50 bg-gray-800/50'
                }
              `}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <motion.div
                  animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                  className="mb-3"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-[#00d9ff]" />
                    )}
                  </div>
                </motion.div>

                {uploading ? (
                  <p className="text-sm text-white">Uploading...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-white mb-1">
                      {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WebP up to {maxSizeMB}MB
                    </p>
                    {aspectRatio && (
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended: {aspectRatio} aspect ratio
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
