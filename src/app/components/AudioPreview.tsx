import React, { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

interface AudioPreviewProps {
  file: File;
  metadata?: {
    title: string;
    artist: string;
    album?: string;
    duration?: number;
  };
}

export function AudioPreview({ file, metadata }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudio | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-[#0a1628]/80 border-[#00d9ff]/20 p-4">
      {/* Metadata */}
      <div className="mb-4">
        <h4 className="font-semibold text-white truncate">
          {metadata?.title || file.name}
        </h4>
        <p className="text-sm text-white/70 truncate">
          {metadata?.artist || 'Unknown Artist'}
          {metadata?.album && ` • ${metadata.album}`}
        </p>
      </div>

      {/* Waveform Visualization */}
      <div className="mb-4 h-16 bg-[#0f1c2e]/50 rounded-lg relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-[#00d9ff] to-[#00ffaa]"
                animate={{
                  height: isPlaying
                    ? `${20 + Math.random() * 60}%`
                    : '30%',
                }}
                transition={{
                  duration: 0.3,
                  repeat: isPlaying ? Infinity : 0,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-white/50 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          onClick={togglePlayPause}
          className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628] h-10 w-10"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className="h-8 w-8 text-white/70 hover:text-white"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="max-w-24"
          />
        </div>

        <div className="text-xs text-white/50">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </div>
      </div>
    </Card>
  );
}
