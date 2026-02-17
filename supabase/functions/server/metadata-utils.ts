// Metadata extraction utilities for tracks and jingles
import { parseBuffer } from "npm:music-metadata@10";

interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  duration: number;
  bpm?: number;
  coverData?: {
    buffer: Uint8Array;
    format: string;
    extension: string;
  };
}

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      console.warn(`⏱️  ${label} timed out after ${ms}ms`);
      resolve(fallback);
    }, ms))
  ]);
}

/**
 * Extract ID3 tags and metadata from audio buffer
 */
export async function extractMetadata(
  fileBuffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<ExtractedMetadata> {
  // Default values from filename
  const originalName = filename.replace(/\.(mp3|wav|m4a|flac)$/i, '');
  const parts = originalName.split(' - ');

  let title = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : originalName;
  let artist = parts.length >= 2 ? parts[0].trim() : 'Unknown Artist';
  let album = '';
  let genre = 'Funk';
  let year = new Date().getFullYear();
  let duration = 180; // Default 3 minutes
  let bpm: number | undefined = undefined;
  let coverData: ExtractedMetadata['coverData'] = undefined;

  try {
    console.log('📀 Extracting ID3 tags from audio file...');
    const uint8Array = new Uint8Array(fileBuffer);

    // parseBuffer can hang on some files — enforce 8s timeout
    const metadata = await withTimeout(
      parseBuffer(uint8Array, mimeType, { duration: true }),
      8000,
      null,
      'parseBuffer'
    );

    if (metadata) {
      // Extract text metadata
      title = metadata.common.title || title;
      artist = metadata.common.artist || metadata.common.albumartist || artist;
      album = metadata.common.album || '';
      genre = metadata.common.genre?.[0] || genre;
      year = metadata.common.year || year;
      bpm = metadata.common.bpm;

      // Get duration in seconds
      if (metadata.format.duration) {
        duration = Math.floor(metadata.format.duration);
      }

      // Extract cover art if available
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        coverData = {
          buffer: picture.data,
          format: picture.format,
          extension: picture.format.split('/')[1] || 'jpg'
        };
        console.log('✅ Cover art found in ID3 tags');
      }

      console.log('✅ ID3 tags extracted:', { title, artist, album, duration, genre, year, hasCover: !!coverData });
    } else {
      console.warn('⚠️  parseBuffer returned null (likely timed out), using filename fallback');
    }
  } catch (error: any) {
    console.warn('⚠️  Could not extract ID3 tags, using fallback:', error.message);
  }

  return {
    title,
    artist,
    album,
    genre,
    year,
    duration,
    bpm,
    coverData
  };
}

/**
 * Search for cover art via MusicBrainz API
 */
export async function searchCoverArt(
  artist: string,
  title: string,
  album?: string
): Promise<string | null> {
  try {
    console.log(`🔍 Searching MusicBrainz for cover: ${artist} - ${title}`);

    // Step 1: Search for recording by artist and title
    const searchQuery = album 
      ? `artist:"${artist}" AND recording:"${title}" AND release:"${album}"`
      : `artist:"${artist}" AND recording:"${title}"`;
    
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://musicbrainz.org/ws/2/recording/?query=${encodedQuery}&fmt=json&limit=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'SoulFMHub/1.0.0 (niqbello@gmail.com)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5s timeout for MusicBrainz
    });

    if (!searchResponse.ok) {
      console.warn('⚠️  MusicBrainz search failed:', searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.recordings || searchData.recordings.length === 0) {
      console.log('ℹ️  No MusicBrainz recording found');
      return null;
    }

    const recording = searchData.recordings[0];
    
    // Step 2: Get release group ID
    if (!recording.releases || recording.releases.length === 0) {
      console.log('ℹ️  No releases found for recording');
      return null;
    }

    const releaseId = recording.releases[0].id;
    
    // Step 3: Try to get cover art from Cover Art Archive
    const coverUrl = `https://coverartarchive.org/release/${releaseId}/front-500`;
    
    const coverResponse = await fetch(coverUrl, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'SoulFMHub/1.0.0 (niqbello@gmail.com)'
      },
      signal: AbortSignal.timeout(5000) // 5s timeout for Cover Art Archive
    });
    
    if (coverResponse.ok) {
      console.log('✅ Cover art found on Cover Art Archive');
      return coverUrl;
    }

    console.log('ℹ️  No cover art available on Cover Art Archive');
    return null;
  } catch (error: any) {
    console.error('❌ MusicBrainz API error:', error.message);
    return null;
  }
}

/**
 * Generate a simple waveform data from audio buffer
 * Returns array of normalized amplitudes (0-1) for visualization
 */
export async function generateWaveform(
  fileBuffer: ArrayBuffer,
  samples: number = 100
): Promise<number[]> {
  try {
    console.log(`🌊 Generating waveform with ${samples} samples...`);
    
    // This is a simplified waveform generator
    // For production, you'd want to use a proper audio processing library
    const uint8Array = new Uint8Array(fileBuffer);
    const dataLength = uint8Array.length;
    const blockSize = Math.floor(dataLength / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      
      // Calculate average amplitude for this block
      let sum = 0;
      let count = 0;
      
      for (let j = start; j < end && j < dataLength; j++) {
        // Convert to signed value and normalize
        const value = Math.abs((uint8Array[j] - 128) / 128);
        sum += value;
        count++;
      }
      
      const average = count > 0 ? sum / count : 0;
      waveform.push(Math.min(1, average)); // Clamp to 0-1
    }

    console.log('✅ Waveform generated');
    return waveform;
  } catch (error: any) {
    console.error('❌ Waveform generation error:', error.message);
    return Array(samples).fill(0.5); // Fallback: flat waveform
  }
}

/**
 * Get or create default cover art URL
 */
export function getDefaultCoverUrl(genre?: string): string {
  // Map genres to default Unsplash cover images
  const genreCovers: Record<string, string> = {
    'funk': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
    'soul': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
    'jazz': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=500',
    'blues': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
    'rnb': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
    'disco': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500',
    'electronic': 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=500'
  };

  const lowerGenre = (genre || '').toLowerCase();
  
  // Try to match genre
  for (const [key, url] of Object.entries(genreCovers)) {
    if (lowerGenre.includes(key)) {
      return url;
    }
  }

  // Default: vinyl record
  return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500';
}

/**
 * Upload cover art to Supabase Storage
 */
export async function uploadCoverArt(
  supabase: any,
  coverBuffer: Uint8Array,
  format: string,
  extension: string,
  prefix: string = 'cover'
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `${prefix}-${timestamp}-${randomString}.${extension}`;

    const { data, error } = await supabase.storage
      .from('make-06086aa3-covers')
      .upload(filename, coverBuffer, {
        contentType: format,
        upsert: false
      });

    if (error) {
      console.error('❌ Cover upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('make-06086aa3-covers')
      .getPublicUrl(filename);

    console.log('✅ Cover art uploaded to storage');
    return urlData.publicUrl;
  } catch (error: any) {
    console.error('❌ Upload cover error:', error.message);
    return null;
  }
}

/**
 * Download cover from URL and upload to storage
 */
export async function downloadAndUploadCover(
  supabase: any,
  coverUrl: string,
  prefix: string = 'cover'
): Promise<string | null> {
  try {
    console.log('📥 Downloading cover from URL...');
    const response = await fetch(coverUrl, {
      signal: AbortSignal.timeout(5000) // 5s timeout for cover download
    });
    
    if (!response.ok) {
      console.error('❌ Failed to download cover:', response.status);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.split('/')[1] || 'jpg';

    return await uploadCoverArt(
      supabase,
      new Uint8Array(buffer),
      contentType,
      extension,
      prefix
    );
  } catch (error: any) {
    console.error('❌ Download and upload error:', error.message);
    return null;
  }
}

/**
 * Complete metadata extraction with cover art fallbacks
 */
export async function extractCompleteMetadata(
  supabase: any,
  fileBuffer: ArrayBuffer,
  mimeType: string,
  filename: string,
  options: {
    searchOnline?: boolean;
    generateWaveform?: boolean;
    waveformSamples?: number;
  } = {}
): Promise<{
  metadata: ExtractedMetadata;
  coverUrl: string;
  waveform?: number[];
}> {
  const {
    searchOnline = true,
    generateWaveform: shouldGenerateWaveform = false,
    waveformSamples = 100
  } = options;

  // Extract basic metadata
  const metadata = await extractMetadata(fileBuffer, mimeType, filename);

  // Handle cover art
  let coverUrl = '';

  // 1. Try to upload embedded cover (5s timeout)
  if (metadata.coverData) {
    const uploadedUrl = await withTimeout(
      uploadCoverArt(
        supabase,
        metadata.coverData.buffer,
        metadata.coverData.format,
        metadata.coverData.extension
      ),
      5000,
      null,
      'uploadCoverArt'
    );
    if (uploadedUrl) {
      coverUrl = uploadedUrl;
    }
  }

  // 2. If no embedded cover and search enabled, try MusicBrainz (with 10s total timeout)
  if (!coverUrl && searchOnline) {
    try {
      const foundCoverUrl = await withTimeout(
        searchCoverArt(metadata.artist, metadata.title, metadata.album),
        6000,
        null,
        'searchCoverArt'
      );
      
      if (foundCoverUrl) {
        // Download and re-upload to our storage (with 6s timeout)
        const uploadedUrl = await withTimeout(
          downloadAndUploadCover(supabase, foundCoverUrl),
          6000,
          null,
          'downloadAndUploadCover'
        );
        if (uploadedUrl) {
          coverUrl = uploadedUrl;
        }
      }
    } catch (e: any) {
      console.warn('⚠️  Cover art search failed:', e.message);
    }
  }

  // 3. Fallback to default genre-based cover
  if (!coverUrl) {
    coverUrl = getDefaultCoverUrl(metadata.genre);
    console.log('ℹ️  Using default cover for genre:', metadata.genre);
  }

  // Generate waveform if requested
  let waveform: number[] | undefined = undefined;
  if (shouldGenerateWaveform) {
    waveform = await generateWaveform(fileBuffer, waveformSamples);
  }

  return {
    metadata,
    coverUrl,
    waveform
  };
}
