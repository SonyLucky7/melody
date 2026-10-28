import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Clock, Key, Laptop, ArrowDownCircle } from 'lucide-react';
import { Playlist } from '../types';

interface SidebarProps {
  currentView: string;
  selectedArtist?: string;
  onSelectView: (view: string, data?: any) => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  onOpenActivation: () => void;
  onOpenDevices: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  selectedArtist,
  onSelectView,
  playlists,
  onCreatePlaylist,
  onOpenActivation,
  onOpenDevices,
}) => {
  return (
    <aside className="w-64 bg-[#121212] flex flex-col h-full border-r border-[#282828] text-[#b3b3b3] p-4 select-none">
      {/* Brand Logo Header */}
      <div 
        onClick={() => onSelectView('home')} 
        className="flex items-center gap-3 px-2 py-3 cursor-pointer group transition-all"
      >
        <img 
          src="/Melody-AppIcon-1024.png" 
          alt="Melody Logo" 
          className="w-9 h-9 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform" 
        />
        <span className="text-xl font-black tracking-tight text-white">
          Melody
        </span>
      </div>

      {/* Main Nav Links (Spotify Style) */}
      <nav className="mt-4 space-y-1">
        <button
          onClick={() => onSelectView('home')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
            currentView === 'home'
              ? 'text-white bg-white/10'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className={`w-5 h-5 ${currentView === 'home' ? 'text-white' : 'text-[#b3b3b3]'}`} />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectView('search')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
            currentView === 'search'
              ? 'text-white bg-white/10'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className={`w-5 h-5 ${currentView === 'search' ? 'text-white' : 'text-[#b3b3b3]'}`} />
          <span>Search</span>
        </button>

        <button
          onClick={() => onSelectView('library')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
            currentView === 'library'
              ? 'text-white bg-white/10'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <Library className={`w-5 h-5 ${currentView === 'library' ? 'text-white' : 'text-[#b3b3b3]'}`} />
          <span>Your Library</span>
        </button>
      </nav>

      {/* Playlists & Artists Section */}
      <div className="mt-5 pt-4 border-t border-[#282828] space-y-1.5">
        <button
          onClick={onCreatePlaylist}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:text-white hover:bg-white/5 transition-all text-[#b3b3b3]"
        >
          <div className="w-6 h-6 rounded bg-[#282828] flex items-center justify-center text-white">
            <PlusSquare className="w-4 h-4" />
          </div>
          <span>Create Playlist</span>
        </button>

        <button
          onClick={() => onSelectView('favourites')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            currentView === 'favourites' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5 text-[#b3b3b3]'
          }`}
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
          <span>Liked Songs</span>
        </button>

        <button
          onClick={() => onSelectView('downloaded')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            currentView === 'downloaded' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5 text-[#b3b3b3]'
          }`}
        >
          <div className="w-6 h-6 rounded bg-[#282828] flex items-center justify-center text-[#a855f7]">
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </div>
          <span>Downloaded</span>
        </button>

        <button
          onClick={() => onSelectView('history')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            currentView === 'history' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5 text-[#b3b3b3]'
          }`}
        >
          <div className="w-6 h-6 rounded bg-[#282828] flex items-center justify-center text-[#a855f7]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span>Recently Played</span>
        </button>
      </div>

      {/* Featured Artists Quick Links */}
      <div className="mt-5 pt-3 border-t border-[#282828]">
        <div className="text-[11px] font-bold text-[#b3b3b3] uppercase px-3 py-1 tracking-wider">
          Artists
        </div>
        <div className="space-y-0.5 mt-1">
          <button
            onClick={() => onSelectView('artist', 'The Weeknd')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm truncate transition-colors text-left ${
              currentView === 'artist' && selectedArtist === 'The Weeknd'
                ? 'text-[#a855f7] font-bold bg-white/10'
                : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-purple-900/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              W
            </div>
            <span className="truncate">The Weeknd</span>
          </button>

          <button
            onClick={() => onSelectView('artist', 'Lana Del Rey')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm truncate transition-colors text-left ${
              currentView === 'artist' && selectedArtist === 'Lana Del Rey'
                ? 'text-[#a855f7] font-bold bg-white/10'
                : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-purple-700/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              L
            </div>
            <span className="truncate">Lana Del Rey</span>
          </button>
        </div>
      </div>

      {/* User Playlists List */}
      <div className="mt-4 flex-1 overflow-y-auto space-y-1 pr-1">
        <div className="text-[11px] font-bold text-neutral-500 uppercase px-3 py-1 tracking-wider">
          Playlists
        </div>
        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => onSelectView('playlist', pl)}
            className="w-full text-left px-3 py-1.5 rounded text-sm text-[#b3b3b3] hover:text-white hover:bg-white/5 truncate transition-colors block"
          >
            {pl.name}
          </button>
        ))}
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-3 border-t border-[#282828] space-y-1.5">
        <button
          onClick={onOpenActivation}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold bg-[#181818] hover:bg-[#282828] text-[#b3b3b3] hover:text-white transition-all border border-[#282828]"
        >
          <span className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            Licence Key
          </span>
        </button>

        <button
          onClick={onOpenDevices}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold bg-[#181818] hover:bg-[#282828] text-[#b3b3b3] hover:text-white transition-all border border-[#282828]"
        >
          <span className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5 text-[#b3b3b3]" />
            Manage Devices
          </span>
          <span className="text-[10px] text-[#b3b3b3]">5 Max</span>
        </button>
      </div>
    </aside>
  );
};
