import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Clock, Key, Laptop, ArrowDownCircle, Crown, HelpCircle, User } from 'lucide-react';
import { Playlist } from '../types';
import { UserProfile } from '../services/api';

interface SidebarProps {
  currentView: string;
  selectedArtist?: string;
  onSelectView: (view: string, data?: any) => void;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  onOpenActivation: () => void;
  onOpenDevices: () => void;
  onOpenHelp?: () => void;
  onOpenProfile?: () => void;
  userProfile?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  selectedArtist,
  onSelectView,
  playlists,
  onCreatePlaylist,
  onOpenActivation,
  onOpenDevices,
  onOpenHelp,
  onOpenProfile,
  userProfile,
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
          className="w-9 h-9 rounded-xl shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform" 
        />
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
            Melody
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </span>
          <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase mt-0.5">
            VIP Studio Audio
          </span>
        </div>
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
        <div className="space-y-0.5 mt-1 max-h-36 overflow-y-auto pr-1">
          <button
            onClick={() => onSelectView('artist', 'Sidhu Moose Wala')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm truncate transition-colors text-left ${
              currentView === 'artist' && selectedArtist === 'Sidhu Moose Wala'
                ? 'text-[#a855f7] font-bold bg-white/10'
                : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-red-900/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              S
            </div>
            <span className="truncate">Sidhu Moose Wala</span>
          </button>

          <button
            onClick={() => onSelectView('artist', 'Yo Yo Honey Singh')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm truncate transition-colors text-left ${
              currentView === 'artist' && selectedArtist === 'Yo Yo Honey Singh'
                ? 'text-[#a855f7] font-bold bg-white/10'
                : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-amber-900/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              Y
            </div>
            <span className="truncate">Yo Yo Honey Singh</span>
          </button>

          <button
            onClick={() => onSelectView('artist', 'Ariana Grande')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm truncate transition-colors text-left ${
              currentView === 'artist' && selectedArtist === 'Ariana Grande'
                ? 'text-[#a855f7] font-bold bg-white/10'
                : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-pink-900/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              A
            </div>
            <span className="truncate">Ariana Grande</span>
          </button>

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
            <div className="w-4 h-4 rounded-full bg-blue-900/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
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
      <div className="pt-3 border-t border-[#282828] space-y-2">
        {userProfile ? (
          <div
            onClick={onOpenProfile}
            className="p-2.5 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 hover:border-purple-500/40 cursor-pointer transition-all group"
            title="View Full Profile & Devices"
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-white group-hover:text-purple-300 truncate transition-colors">
                {userProfile.firstName} {userProfile.surname}
              </span>
              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                {userProfile.plan === 'lifetime' ? 'Lifetime' : 'Annual'}
              </span>
            </div>
            <div className="font-mono text-[10px] text-neutral-400 truncate">
              {userProfile.formattedKey}
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenActivation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02]"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Get VIP Access (₹49)</span>
          </button>
        )}

        <div className="flex gap-1.5">
          {userProfile ? (
            <button
              onClick={onOpenProfile}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#181818] hover:bg-[#282828] text-purple-300 hover:text-white transition-all border border-purple-500/20"
              title="View Profile & Settings"
            >
              <User className="w-3 h-3 text-purple-400" />
              <span>Profile</span>
            </button>
          ) : (
            <button
              onClick={onOpenActivation}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#181818] hover:bg-[#282828] text-[#b3b3b3] hover:text-white transition-all border border-[#282828]"
              title="Log In with Licence Key"
            >
              <Key className="w-3 h-3 text-purple-400" />
              <span>Log In</span>
            </button>
          )}

          <button
            onClick={onOpenDevices}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#181818] hover:bg-[#282828] text-[#b3b3b3] hover:text-white transition-all border border-[#282828]"
            title="Manage Devices"
          >
            <Laptop className="w-3 h-3 text-[#b3b3b3]" />
            <span>Devices</span>
          </button>
        </div>

        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
            title="Help & Discord"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Help, Discord & FAQ</span>
          </button>
        )}
      </div>
    </aside>
  );
};
