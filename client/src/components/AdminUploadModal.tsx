import React, { useState } from 'react';
import { X, UploadCloud, Music, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [adminSecret, setAdminSecret] = useState('melody-admin-access-token-9876');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [language, setLanguage] = useState('english');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setErrorMsg('Please select an MP3 audio file.');
      return;
    }

    if (audioFile.size > 20 * 1024 * 1024) {
      setErrorMsg('Audio file exceeds 20 MB Telegram Bot limit.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('artist', artist);
      formData.append('album', album);
      formData.append('language', language);
      formData.append('audio', audioFile);
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'x-admin-secret': adminSecret.trim(),
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Song "${title}" successfully uploaded to Telegram & indexed!`);
        setTimeout(() => {
          onUploadSuccess();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Upload failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network upload error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#16161d] border border-[#2a2a38] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Admin Audio Upload</h3>
            <p className="text-xs text-neutral-400">Stores permanently in private Telegram channel</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Admin Secret</label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Song Title</label>
              <input
                type="text"
                placeholder="e.g. Starboy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Artist</label>
              <input
                type="text"
                placeholder="e.g. The Weeknd"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Album (optional)</label>
              <input
                type="text"
                placeholder="e.g. Starboy"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="punjabi">Punjabi</option>
                <option value="instrumental">Instrumental</option>
              </select>
            </div>
          </div>

          {/* Audio File Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Audio File (MP3, 192–320 kbps, $\le$ 20 MB)
            </label>
            <div className="relative border-2 border-dashed border-[#2a2a38] hover:border-blue-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="audio/mp3,audio/mpeg"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <div className="flex flex-col items-center gap-1.5 text-neutral-400">
                <Music className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-semibold text-white">
                  {audioFile ? audioFile.name : 'Choose MP3 audio file'}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max 20 MB'}
                </span>
              </div>
            </div>
          </div>

          {/* Cover Art Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Cover Art (JPG/PNG, optional)
            </label>
            <div className="relative border-2 border-dashed border-[#2a2a38] hover:border-blue-500/50 rounded-xl p-3 text-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-2 text-neutral-400">
                <ImageIcon className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-300">
                  {coverFile ? coverFile.name : 'Choose album cover image'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Uploading to Telegram...' : 'Upload & Save to Channel'}
          </button>
        </form>
      </div>
    </div>
  );
};
