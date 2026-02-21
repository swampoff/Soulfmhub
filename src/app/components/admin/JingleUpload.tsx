import React, { useState, useRef } from 'react';
import { Upload, X, Music, Check, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import { getAccessToken } from '../../../lib/api';
import { JINGLE_CATEGORIES, CATEGORY_GROUPS } from './jingle-categories';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3`;

interface JingleUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = 'idle' | 'creating' | 'signing' | 'uploading' | 'processing' | 'done' | 'error';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  creating: 'Creating jingle record…',
  signing: 'Getting upload URL…',
  uploading: 'Uploading audio file…',
  processing: 'Processing metadata…',
  done: 'Done!',
  error: 'Error',
};

export function JingleUpload({ onClose, onSuccess }: JingleUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState(5);
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith('audio/') || droppedFile.name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i))) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMsg('');
    } else {
      setErrorMsg('Please select an audio file (MP3, WAV, M4A, OGG, AAC)');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMsg('');
    }
  }

  /** Helper: fetch with apikey + auth headers */
  async function apiFetch(url: string, opts: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'apikey': publicAnonKey,
      'Authorization': `Bearer ${token}`,
      ...(opts.headers as Record<string, string> || {}),
    };
    return fetch(url, { ...opts, headers });
  }

  async function handleUpload() {
    if (!file || !title.trim()) {
      setErrorMsg('Please provide a title and select a file');
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 15 MB.`);
      return;
    }

    let createdJingleId: string | null = null;

    try {
      setUploading(true);
      setErrorMsg('');
      setUploadProgress(0);

      // ── Step 1: Create jingle metadata ──
      setUploadStep('creating');
      setUploadProgress(5);

      const createRes = await apiFetch(`${API_BASE}/jingles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => createRes.statusText);
        console.error('[JingleUpload] Step 1 failed:', createRes.status, errText);
        throw new Error(`Failed to create jingle record (${createRes.status}): ${errText}`);
      }

      const { jingle } = await createRes.json();
      createdJingleId = jingle.id;
      console.log('[JingleUpload] Step 1 done. ID:', jingle.id);

      // ── Step 2: Get signed upload URL ──
      setUploadStep('signing');
      setUploadProgress(15);

      const urlRes = await apiFetch(`${API_BASE}/jingles/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jingleId: jingle.id,
          originalFilename: file.name,
          contentType: file.type || 'audio/mpeg',
        }),
      });

      if (!urlRes.ok) {
        const errText = await urlRes.text().catch(() => urlRes.statusText);
        console.error('[JingleUpload] Step 2 failed:', urlRes.status, errText);
        throw new Error(`Failed to get upload URL (${urlRes.status}): ${errText}`);
      }

      const urlData = await urlRes.json();
      if (urlData.error) throw new Error(urlData.error);

      const { signedUrl, filename, bucket } = urlData;
      console.log('[JingleUpload] Step 2 done. Filename:', filename);

      // ── Step 3: Upload file directly to Storage via XHR ──
      setUploadStep('uploading');
      setUploadProgress(20);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round(20 + (e.loaded / e.total) * 55);
            setUploadProgress(pct);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('[JingleUpload] Step 3 done. Storage upload status:', xhr.status);
            setUploadProgress(80);
            resolve();
          } else {
            console.error('[JingleUpload] Storage upload failed:', xhr.status, xhr.responseText);
            let errMsg = `Storage upload failed (${xhr.status})`;
            try {
              const errBody = JSON.parse(xhr.responseText);
              errMsg = errBody.error || errBody.message || errMsg;
            } catch {}
            reject(new Error(errMsg));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('[JingleUpload] Storage upload network error');
          reject(new Error('Network error during file upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.timeout = 120000;
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out (120s)'));
        });

        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('apikey', publicAnonKey);
        xhr.setRequestHeader('Authorization', `Bearer ${publicAnonKey}`);
        xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
        xhr.send(file);
      });

      xhrRef.current = null;

      // ── Step 4: Process uploaded file (metadata extraction) ──
      setUploadStep('processing');
      setUploadProgress(85);

      const processRes = await apiFetch(`${API_BASE}/jingles/process-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jingleId: jingle.id,
          filename,
          bucket,
        }),
      });

      if (!processRes.ok) {
        const errText = await processRes.text().catch(() => processRes.statusText);
        console.error('[JingleUpload] Step 4 failed:', processRes.status, errText);
        // Not fatal — file is uploaded, just metadata extraction may have failed
        console.warn('[JingleUpload] Processing failed but file was uploaded. Continuing…');
      } else {
        console.log('[JingleUpload] Step 4 done.');
      }

      // ── Done ──
      setUploadStep('done');
      setUploadProgress(100);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (error: any) {
      console.error('[JingleUpload] Error:', error);
      setUploadStep('error');
      setErrorMsg(error.message || 'Failed to upload jingle');
      setUploading(false);

      // Cleanup: delete orphan jingle record if file upload failed
      if (createdJingleId) {
        try {
          await apiFetch(`${API_BASE}/jingles/${createdJingleId}`, { method: 'DELETE' });
          console.log('[JingleUpload] Cleaned up orphan jingle:', createdJingleId);
        } catch (cleanupErr) {
          console.warn('[JingleUpload] Cleanup failed:', cleanupErr);
        }
      }
    }
  }

  function handleCancel() {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] border border-cyan-500/30 rounded-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-[#00ffaa] bg-clip-text text-transparent mb-6">
          Upload Jingle
        </h2>

        <div className="space-y-5">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              uploading ? 'cursor-default opacity-60' : 'cursor-pointer'
            } ${
              dragging
                ? 'border-cyan-400 bg-cyan-500/10'
                : file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-white/20 hover:border-cyan-400/50 bg-white/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/m4a,audio/ogg,audio/aac,audio/flac,.mp3,.wav,.m4a,.ogg,.aac,.flac"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <Music className="w-8 h-8 text-cyan-400" />
                <div className="text-left">
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-gray-400 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-auto p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">
                  Drop audio file here or click to browse
                </p>
                <p className="text-gray-400 text-sm">
                  MP3, WAV, M4A, OGG, AAC, FLAC — up to 15 MB
                </p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter jingle title"
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none disabled:opacity-50"
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={uploading}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                {JINGLE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Priority (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
                disabled={uploading}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="funk, morning, upbeat"
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Upload Error</p>
                <p className="text-red-400/80 text-sm mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-medium">{STEP_LABELS[uploadStep]}</span>
                <span className="text-cyan-400 font-bold">{uploadProgress}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    uploadStep === 'done'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                      : uploadStep === 'error'
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-cyan-500 to-[#00ffaa]'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {/* Step indicators */}
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span className={uploadStep !== 'idle' ? 'text-cyan-400' : ''}>Create</span>
                <span className={['signing', 'uploading', 'processing', 'done'].includes(uploadStep) ? 'text-cyan-400' : ''}>Sign</span>
                <span className={['uploading', 'processing', 'done'].includes(uploadStep) ? 'text-cyan-400' : ''}>Upload</span>
                <span className={['processing', 'done'].includes(uploadStep) ? 'text-cyan-400' : ''}>Process</span>
                <span className={uploadStep === 'done' ? 'text-green-400' : ''}>Done</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCancel}
              disabled={uploading && uploadStep !== 'error'}
              className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Cancel' : 'Close'}
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !title.trim() || (uploading && uploadStep !== 'error')}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-[#00ffaa] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadStep === 'done' ? (
                <>
                  <Check className="w-5 h-5" />
                  Uploaded!
                </>
              ) : uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading…
                </>
              ) : uploadStep === 'error' ? (
                <>
                  <Upload className="w-5 h-5" />
                  Retry Upload
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Jingle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
