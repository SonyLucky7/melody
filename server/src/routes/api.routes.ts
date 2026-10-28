import { Router } from 'express';
import {
  getSongs,
  getSongById,
  getSongPlayUrl,
  streamAudio,
  recordSongPlay,
  getRecentlyPlayed,
} from '../controllers/song.controller';
import {
  getPlaylists,
  createPlaylist,
  getPlaylistSongs,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from '../controllers/playlist.controller';
import {
  getFavourites,
  addFavourite,
  removeFavourite,
} from '../controllers/favourite.controller';
import { verifyDeviceSession, requireDeviceAuth } from '../middleware/auth';

const router = Router();

// --- Songs Catalog & Streaming ---
router.get('/songs', verifyDeviceSession, getSongs);
router.get('/songs/:id', verifyDeviceSession, getSongById);
router.get('/songs/:id/play', verifyDeviceSession, getSongPlayUrl);
router.get('/stream/:id', streamAudio); // Stream verified via 10-minute signed token
router.head('/stream/:id', streamAudio);

// --- Spotify-Style Playback History ---
router.post('/songs/:id/played', verifyDeviceSession, recordSongPlay);
router.get('/history', verifyDeviceSession, requireDeviceAuth, getRecentlyPlayed);

// --- Playlists ---
router.get('/playlists', verifyDeviceSession, requireDeviceAuth, getPlaylists);
router.post('/playlists', verifyDeviceSession, requireDeviceAuth, createPlaylist);
router.get('/playlists/:id', verifyDeviceSession, requireDeviceAuth, getPlaylistSongs);
router.post('/playlists/:id/songs', verifyDeviceSession, requireDeviceAuth, addSongToPlaylist);
router.delete('/playlists/:id/songs/:songId', verifyDeviceSession, requireDeviceAuth, removeSongFromPlaylist);

// --- Favourites ---
router.get('/favourites', verifyDeviceSession, requireDeviceAuth, getFavourites);
router.post('/favourites/:songId', verifyDeviceSession, requireDeviceAuth, addFavourite);
router.delete('/favourites/:songId', verifyDeviceSession, requireDeviceAuth, removeFavourite);

export default router;
