import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { JingleUpload } from './JingleUpload';

interface JingleUploadButtonProps {
  onSuccess?: () => void;
}

export function JingleUploadButton({ onSuccess }: JingleUploadButtonProps = {}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-[#00ffaa] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Upload Jingle
      </button>

      {showModal && (
        <JingleUpload
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}