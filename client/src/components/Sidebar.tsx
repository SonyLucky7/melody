import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Clock, Key, Laptop } from 'lucide-react';
import { Playlist } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string, data?: any) => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  onOpenActivation: () => void;
  onOpenDevices: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  playlists,
  onCreatePlaylist,
  onOpenActivation,
  onOpenDevices,
}) => {
  return (
    <aside className="w-64 bg-[#0f0f13] flex flex-col h-full border-r border-[#1e1e28] text-neutral-300 p-4 select-none">
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
        <span className="text-xl font-extrabold tracking-tight text-white">
          Melody
        </span>
      </div>

      {/* Main Nav Links */}
      <nav className="mt-4 space-y-1">
        <button
          onClick={() => onSelectView('home')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            currentView === 'home'
              ? 'bg-blue-600/15 text-white font-bold border-l-2 border-blue-500'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className={`w-5 h-5 ${currentView === 'home' ? 'text-blue-400' : 'text-neutral-400'}`} />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectView('search')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            currentView === 'search'
              ? 'bg-blue-600/15 text-white font-bold border-l-2 border-blue-500'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className={`w-5 h-5 ${currentView === 'search' ? 'text-blue-400' : 'text-neutral-400'}`} />
          <span>Search</span>
        </button>

        <button
          onClick={() => onSelectView('library')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            currentView === 'library'
              ? 'bg-blue-600/15 text-white font-bold border-l-2 border-blue-500'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <Library className={`w-5 h-5 ${currentView === 'library' ? 'text-blue-400' : 'text-neutral-400'}`} />
          <span>Your Library</span>
        </button>
      </nav>

      {/* Secondary Playlist & History Section */}
      <div className="mt-6 pt-4 border-t border-[#1e1e28] space-y-2">
        <button
          onClick={onCreatePlaylist}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:text-white hover:bg-white/5 transition-all text-neutral-300"
        >
          <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-neutral-300">
            <PlusSquare className="w-4 h-4" />
          </div>
          <span>Create Playlist</span>
        </button>

        <button
          onClick={() => onSelectView('favourites')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            currentView === 'favourites' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-sm">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
          <span>Liked Songs</span>
        </button>

        <button
          onClick={() => onSelectView('history')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            currentView === 'history' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-blue-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span>Recently Played</span>
        </button>
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
            className="w-full text-left px-3 py-1.5 rounded text-sm text-neutral-400 hover:text-white hover:bg-white/5 truncate transition-colors block"
          >
            {pl.name}
          </button>
        ))}
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-3 border-t border-[#1e1e28] space-y-1.5">
        <button
          onClick={onOpenActivation}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all border border-neutral-800"
        >
          <span className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            Licence Key
          </span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Option 1</span>
        </button>

        <button
          onClick={onOpenDevices}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all border border-neutral-800"
        >
          <span className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5 text-neutral-400" />
            Manage Devices
          </span>
          <span className="text-[10px] text-neutral-500">5 Max</span>
        </button>
      </div>
    </aside>
  );
};
