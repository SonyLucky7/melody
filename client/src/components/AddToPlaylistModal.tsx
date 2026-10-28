import React, { useState } from 'react';
import { X, Plus, Check, Music, Loader2 } from 'lucide-react';
import { Song, Playlist } from '../types';
import { addSongToPlaylist, createPlaylist, getFullCoverUrl } from '../services/api';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  playlists: Playlist[];
  onPlaylistUpdated: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  song,
  playlists,
  onPlaylistUpdated,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addingToId, setAddingToId] = useState<number | null>(null);
  const [addedSuccessId, setAddedSuccessId] = useState<number | null>(null);

  if (!isOpen || !song) return null;

  const handleAdd = async (playlistId: number) => {
    setAddingToId(playlistId);
    try {
      const ok = await addSongToPlaylist(playlistId, song.id);
      if (ok) {
        setAddedSuccessId(playlistId);
        onPlaylistUpdated();
        setTimeout(() => {
          setAddedSuccessId(null);
          onClose();
        }, 800);
      }
    } catch {}
    setAddingToId(null);
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const pl = await createPlaylist(newPlaylistName.trim());
      if (pl) {
        await addSongToPlaylist(pl.id, song.id);
        setNewPlaylistName('');
        onPlaylistUpdated();
        setAddedSuccessId(pl.id);
        setTimeout(() => {
          setAddedSuccessId(null);
          onClose();
        }, 800);
      }
    } catch {}
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#14141e] border border-white/10 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Add to Playlist</h2>
            <p className="text-xs text-neutral-400 truncate max-w-[280px]">
              {song.title} • {song.artist}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Playlist Input */}
        <form onSubmit={handleCreateAndAdd} className="p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={isCreating || !newPlaylistName.trim()}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors"
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create</span>
            </button>
          </div>
        </form>

        {/* Existing Playlists List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
          {playlists.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
              You haven't created any playlists yet. Type a name above to create your first one!
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                disabled={addingToId === pl.id || addedSuccessId === pl.id}
                className="w-full p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs group-hover:text-purple-300 transition-colors">
                      {pl.name}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {pl.total_songs || 0} songs
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-xl text-neutral-400 group-hover:text-white">
                  {addedSuccessId === pl.id ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <Check className="w-4 h-4" /> Added
                    </span>
                  ) : addingToId === pl.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
