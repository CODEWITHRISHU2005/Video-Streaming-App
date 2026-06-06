import React, { useState, useEffect, useCallback } from 'react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { playlistAPI } from '../utils/api';
import { Button, Card, TextInput, Label, Textarea } from 'flowbite-react';
import { FaPlus, FaPlay, FaTrash, FaFolder, FaRegFolderOpen, FaClock, FaEye, FaVideo } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDuration } from '../utils/videoUtils';

export default function PlaylistsPage() {
  const { playPlaylist } = useVideo();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load playlists from API with local fallback
  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await playlistAPI.getUserPlaylists();
      if (data && Array.isArray(data)) {
        setPlaylists(data);
      } else {
        throw new Error('Invalid playlists format');
      }
    } catch (err) {
      console.warn('Playlist API unavailable, falling back to localStorage');
      const local = localStorage.getItem(`custom_playlists_${user?.id || 'guest'}`);
      if (local) {
        setPlaylists(JSON.parse(local));
      } else {
        // Mock a couple of default playlists to start with a beautiful empty state
        const initialMock = [
          {
            id: 'mock-p1',
            name: 'Web Dev Tutorials',
            description: 'My favorite coding and development tutorials to watch later.',
            videos: [],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-p2',
            name: 'Relaxing Music',
            description: 'Ambient soundtrack and music videos for coding and focus.',
            videos: [],
            createdAt: new Date().toISOString(),
          }
        ];
        setPlaylists(initialMock);
        localStorage.setItem(`custom_playlists_${user?.id || 'guest'}`, JSON.stringify(initialMock));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Create playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName.trim()) return;

    const newPlaylistObj = {
      name: playlistName,
      description: playlistDesc,
      videos: [],
    };

    try {
      await playlistAPI.create(newPlaylistObj);
      toast.success('Playlist created successfully!');
      fetchPlaylists();
    } catch (err) {
      console.warn('Failed to save playlist to server, saving to localStorage');
      const localPlaylists = [...playlists];
      const newLocalPlaylist = {
        id: `playlist-${Date.now()}`,
        name: playlistName,
        description: playlistDesc,
        videos: [],
        createdAt: new Date().toISOString(),
      };
      localPlaylists.push(newLocalPlaylist);
      setPlaylists(localPlaylists);
      localStorage.setItem(`custom_playlists_${user?.id || 'guest'}`, JSON.stringify(localPlaylists));
      toast.success('Playlist created (saved locally)!');
    } finally {
      setPlaylistName('');
      setPlaylistDesc('');
      setShowCreateForm(false);
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;

    try {
      // Assuming delete endpoint exists or falls back
      const localPlaylists = playlists.filter(p => p.id !== id);
      setPlaylists(localPlaylists);
      localStorage.setItem(`custom_playlists_${user?.id || 'guest'}`, JSON.stringify(localPlaylists));
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null);
      }
      toast.success('Playlist deleted!');
    } catch (err) {
      toast.error('Failed to delete playlist');
    }
  };

  // Play All videos in playlist
  const handlePlayAll = () => {
    if (!selectedPlaylist || selectedPlaylist.videos.length === 0) return;
    playPlaylist(selectedPlaylist.videos, 0);
    navigate(`/watch/${selectedPlaylist.videos[0].id}`);
  };

  // Remove video from playlist
  const handleRemoveVideo = async (videoId) => {
    if (!selectedPlaylist) return;
    try {
      // Local removal
      const updatedVideos = selectedPlaylist.videos.filter(v => v.id !== videoId);
      const updatedPlaylist = { ...selectedPlaylist, videos: updatedVideos };
      
      const updatedPlaylistsList = playlists.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p);
      setPlaylists(updatedPlaylistsList);
      setSelectedPlaylist(updatedPlaylist);
      localStorage.setItem(`custom_playlists_${user?.id || 'guest'}`, JSON.stringify(updatedPlaylistsList));
      
      toast.success('Video removed from playlist');
    } catch (err) {
      toast.error('Failed to remove video');
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-12 pt-4 pb-16 px-6 sm:px-8 lg:px-12 min-h-screen text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Header Banner */}
      <header className="relative text-white rounded-3xl p-8 sm:p-10 md:p-12 overflow-hidden shadow-2xl"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(99,102,241,0.2) 50%, rgba(236,72,153,0.15) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              My Playlists
            </h1>
            <p className="text-white/80 max-w-xl text-base sm:text-lg font-light leading-relaxed">
              Organize your video experience. Create collections, compile tutorials, and create custom mixes.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="group relative bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-full px-6 py-2 shadow-lg transition-transform hover:scale-105"
          >
            <FaPlus className="mr-2 inline-block" /> Create Playlist
          </Button>
        </div>
      </header>

      {/* Create Playlist Form */}
      {showCreateForm && (
        <div className="glass-card max-w-xl mx-auto p-6 rounded-3xl shadow-xl animate-fade-in-up">
          <h3 className="text-xl font-bold dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4 flex items-center gap-2">
            <FaFolder className="text-blue-500" /> Create New Playlist
          </h3>
          <form onSubmit={handleCreatePlaylist} className="space-y-4">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="playlistName" value="Playlist Name" />
              </div>
              <TextInput
                id="playlistName"
                placeholder="My Awesome Playlist"
                required
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800"
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="playlistDesc" value="Description" />
              </div>
              <Textarea
                id="playlistDesc"
                placeholder="Give your playlist a helpful description..."
                value={playlistDesc}
                onChange={(e) => setPlaylistDesc(e.target.value)}
                rows={3}
                className="bg-neutral-50 dark:bg-neutral-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button color="gray" onClick={() => setShowCreateForm(false)} className="rounded-full">
                Cancel
              </Button>
              <Button type="submit" color="info" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Save Playlist
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid View */}
      {selectedPlaylist ? (
        // Detailed Playlist View
        <div className="space-y-6 animate-fade-in-up">
          <Button
            color="light"
            onClick={() => setSelectedPlaylist(null)}
            className="rounded-full"
          >
            ← Back to Playlists
          </Button>

          <div className="grid gap-8 lg:grid-cols-[1fr_2.5fr]">
            {/* Playlist Sidebar */}
            <div className="glass-card rounded-3xl p-6 space-y-6 shadow-md h-fit relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
              
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 text-3xl">
                  <FaRegFolderOpen />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold truncate dark:text-white">{selectedPlaylist.name}</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {selectedPlaylist.videos.length} videos • Created {new Date(selectedPlaylist.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                {selectedPlaylist.description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-100 dark:border-neutral-900">
                    {selectedPlaylist.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  onClick={handlePlayAll}
                  disabled={selectedPlaylist.videos.length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-full font-bold shadow-lg"
                >
                  <FaPlay className="mr-2" /> Play All
                </Button>
                <Button
                  color="failure"
                  onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                  className="w-full rounded-full"
                >
                  <FaTrash className="mr-2" /> Delete Playlist
                </Button>
              </div>
            </div>

            {/* Videos List */}
            <div className="glass-card rounded-3xl p-6 shadow-md">
              <h3 className="text-xl font-bold dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4 flex items-center gap-2">
                <FaVideo className="text-neutral-400" /> Playlist Videos
              </h3>
              {selectedPlaylist.videos.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {selectedPlaylist.videos.map((video, index) => (
                    <div
                      key={`${video.id}-${index}`}
                      onClick={() => navigate(`/watch/${video.id}`)}
                      className="flex gap-4 items-center py-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 px-3 rounded-xl transition-all group"
                    >
                      <span className="text-sm font-bold text-neutral-400 w-6 text-center">
                        {index + 1}
                      </span>
                      <div className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0 border border-neutral-100 dark:border-neutral-800">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded font-semibold">
                          {formatDuration(video.duration)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                          {video.title}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                          {video.description}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-0.5">
                          {video.views > 0 && <span>{video.views} views</span>}
                          <span>•</span>
                          <span>{new Date(video.uploadDate || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveVideo(video.id);
                        }}
                        className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                        title="Remove from Playlist"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400 space-y-3">
                  <FaRegFolderOpen className="text-6xl text-neutral-300 mx-auto" />
                  <p className="text-base font-semibold">No videos in this playlist yet</p>
                  <p className="text-sm max-w-xs mx-auto">
                    Go explore videos and click the playlist button on the player page to add videos here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Playlists Grid View
        <div className="space-y-6 animate-fade-in-up">
          {playlists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {playlists.map((playlist) => {
                // Determine cover art
                const firstVideoCover = playlist.videos && playlist.videos.length > 0
                  ? playlist.videos[0].thumbnailUrl
                  : null;

                return (
                  <div
                    key={playlist.id}
                    onClick={() => setSelectedPlaylist(playlist)}
                    className="group relative glass-card rounded-2xl cursor-pointer overflow-hidden"
                  >
                    {/* Cover Art / Empty Folder UI */}
                    <div className="relative aspect-video w-full bg-indigo-600/10 dark:bg-indigo-900/10 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 overflow-hidden">
                      {firstVideoCover ? (
                        <>
                          <img
                            src={firstVideoCover}
                            alt={playlist.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                          {/* Folder Overlay Effect */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 flex flex-col justify-end p-4 text-white z-10">
                            <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md w-fit mb-1 border border-indigo-400/30 shadow-md">
                              <FaVideo size={10} /> PLAYLIST
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-neutral-400 space-y-2">
                          <FaFolder className="text-5xl text-indigo-400/70 group-hover:scale-110 transition-transform duration-300" />
                          <span className="text-xs font-medium dark:text-neutral-500 text-neutral-400 uppercase tracking-wider">Empty Playlist</span>
                        </div>
                      )}
                      
                      {/* Play All Hover Badge */}
                      {playlist.videos && playlist.videos.length > 0 && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                          <div className="bg-indigo-600 rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform shadow-lg border border-indigo-400/40">
                            <FaPlay className="text-white text-xl" />
                          </div>
                        </div>
                      )}

                      {/* Videos Count Badge */}
                      <span className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-md z-10 border border-white/10">
                        {playlist.videos ? playlist.videos.length : 0} videos
                      </span>
                    </div>

                    {/* Playlist details */}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-neutral-900 dark:text-white group-hover:text-blue-500 truncate text-base transition-colors">
                          {playlist.name}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                          className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Playlist"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 h-8">
                        {playlist.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 glass-card max-w-xl mx-auto p-8 space-y-4">
              <FaFolder className="mx-auto text-7xl text-neutral-300" />
              <h3 className="text-xl font-bold dark:text-white">No playlists found</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs mx-auto">
                Organize your stream collections. Create one now and start adding your favorite videos.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-6 py-2 shadow-lg"
              >
                Create Playlist
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
