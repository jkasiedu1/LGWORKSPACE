import { useState, useEffect } from 'react';
import {
  Sparkles, Loader2, Search, UploadCloud, MonitorPlay, Music,
  FileText, FileAudio, Mic2, ListMusic, SkipBack, Play,
  Pause, SkipForward, X, Trash2
} from 'lucide-react';
import { callAI } from '../lib/gemini';
import { createSong, deleteSong } from '../lib/firestoreServices';
import MarkdownRenderer from '../components/MarkdownRenderer.jsx';

export default function MusicApp({ theme, isAdmin, songs, setSongs, globalSearch, showToast }) {
  const [musicPrompt, setMusicPrompt] = useState('');
  const [isAnalyzingMusic, setIsAnalyzingMusic] = useState(false);
  const [musicAnalysisResult, setMusicAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('vocals');
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isStandMode, setIsStandMode] = useState(false);
  const [isChordModal, setIsChordModal] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', key: 'C', bpm: 70, ccli: '', hasLyrics: true, hasChords: true, hasAudio: true, youtube: '' });

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) || song.ccli?.includes(searchQuery)
  );

  const handleMusicAnalysis = async () => {
    if (!musicPrompt) return;
    setIsAnalyzingMusic(true);
    setMusicAnalysisResult(null);
    const context = `You are a professional church music director. The user is asking about the song or lyrics provided. Analyze it focusing on the '${analysisMode}' perspective. Be brief and highly practical. Provide chords, vocal ranges, or lyrical themes based on what is asked. Format your response with markdown: use ## for main headers, ### for sub-headers, **bold** for key terms, and numbered lists or bullet points for structured analysis.`;
    const responseText = await callAI(musicPrompt, context);
    setMusicAnalysisResult(responseText);
    setIsAnalyzingMusic(false);
  };

  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist) return;

    const payload = { ...newSong, lastPlayed: 'Never' };
    const tempId = `temp-song-${Date.now()}`;
    setSongs([{ id: tempId, ...payload }, ...songs]);
    setIsUploading(false);
    setNewSong({ title: '', artist: '', key: 'C', bpm: 70, ccli: '', hasLyrics: true, hasChords: true, hasAudio: true, youtube: '' });

    try {
      const created = await createSong(payload);
      setSongs((prev) => prev.map((song) => (song.id === tempId ? created : song)));
      showToast('Song added to library successfully!');
    } catch (error) {
      console.error('[MusicApp] Failed to add song:', error);
      setSongs((prev) => prev.filter((song) => song.id !== tempId));
      showToast('Failed to add song');
    }
  };

  const handleDeleteSong = async (songId) => {
    const removedSong = songs.find((song) => song.id === songId);
    if (!removedSong) return;

    setSongs((prev) => prev.filter((song) => song.id !== songId));
    if (selectedSong?.id === songId) {
      setSelectedSong(null);
    }

    try {
      await deleteSong(String(songId));
      showToast('Song removed');
    } catch (error) {
      console.error('[MusicApp] Failed to delete song:', error);
      setSongs((prev) => [removedSong, ...prev]);
      showToast('Failed to remove song');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Music Library</h1>
          <p className="text-stone-500 text-sm mt-1">Manage songs, analyze arrangements, and link YouTube assets.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (selectedSong) { setIsStandMode(true); } else { showToast("Select a song first to enter Music Stand Mode"); } }} className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2"><MonitorPlay size={16}/> Music Stand Mode</button>
          {isAdmin && <button onClick={() => setIsUploading(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><UploadCloud size={16}/> Upload Song</button>}
        </div>
      </div>

      {isUploading && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><UploadCloud className="text-rose-600"/> Add New Song</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Song Title" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} />
              <input type="text" placeholder="Artist" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Key (e.g. C)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.key} onChange={e => setNewSong({...newSong, key: e.target.value, originalKey: e.target.value})} />
                <input type="number" placeholder="BPM" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.bpm} onChange={e => setNewSong({...newSong, bpm: e.target.value})} />
                <input type="text" placeholder="CCLI #" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.ccli} onChange={e => setNewSong({...newSong, ccli: e.target.value})} />
              </div>
              <div className="relative">
                <Play className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 h-5 w-5" />
                <input type="text" placeholder="YouTube URL (Optional)" className="w-full pl-10 p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.youtube} onChange={e => setNewSong({...newSong, youtube: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsUploading(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAddSong} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save to Library</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Song Catalog</h3>
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 h-3.5 w-3.5" />
                <input type="text" placeholder="Search title or CCLI..." className="pl-8 pr-3 py-1.5 border border-stone-200 rounded-md text-xs outline-none focus:border-rose-500 w-48" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                  <tr>
                    <th className="px-5 py-3">Song Title</th>
                    <th className="px-5 py-3">Key / BPM</th>
                    <th className="px-5 py-3">CCLI #</th>
                    <th className="px-5 py-3">Assets</th>
                    {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSongs.map((song) => (
                    <tr key={song.id} onClick={() => setSelectedSong(song)} className={`cursor-pointer transition-colors ${selectedSong?.id === song.id ? 'bg-rose-50' : 'hover:bg-stone-50'}`}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-stone-900">{song.title}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{song.artist}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 mr-2 border border-stone-200">{song.key}</span>
                        <span className="text-xs">{song.bpm} bpm</span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{song.ccli}<br/><span className="text-[10px] text-stone-400">Played: {song.lastPlayed}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-md ${song.hasLyrics ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Lyrics"><FileText size={14}/></span>
                          <span className={`p-1.5 rounded-md ${song.hasChords ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Chords"><Music size={14}/></span>
                          {song.youtube ? (
                            <a href={song.youtube} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors" title="Watch on YouTube"><Play size={14}/></a>
                          ) : (
                            <span className={`p-1.5 rounded-md ${song.hasAudio ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Audio"><FileAudio size={14}/></span>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteSong(song.id); }} className="px-2.5 py-1 text-xs font-semibold rounded-md text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors" title="Delete song">
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredSongs.length === 0 && (
                    <tr><td colSpan={isAdmin ? 5 : 4} className="px-5 py-8 text-center text-stone-500">No songs found matching &ldquo;{searchQuery}&rdquo;</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedSong ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit flex flex-col animate-in slide-in-from-right-4 duration-300">
              <div className="p-5 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-lg text-stone-900 leading-tight">{selectedSong.title}</h2>
                  <p className="text-sm font-medium text-stone-500">{selectedSong.artist}</p>
                </div>
                <button onClick={() => setSelectedSong(null)} className="text-stone-400 hover:text-stone-600 text-xs font-semibold uppercase tracking-wider">Close</button>
              </div>

              {selectedSong.youtube ? (
                <div className="bg-stone-900 aspect-video w-full relative flex items-center justify-center border-b border-stone-100">
                  <a href={selectedSong.youtube} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"><Play size={32} className="ml-1"/></div>
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Open YouTube Source</span>
                  </a>
                </div>
              ) : (
                <div className="p-5 border-b border-stone-100 bg-stone-900 text-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Rehearsal Track</span>
                    <span className="text-xs font-medium bg-stone-800 px-2 py-0.5 rounded text-rose-400">0:00 / 4:12</span>
                  </div>
                  <div className="w-full h-10 flex items-center gap-0.5 mb-4 opacity-70">
                    {Array.from({length: 40}).map((_, i) => (
                      <div key={i} className="flex-1 bg-rose-500 rounded-full" style={{ height: `${Math.max(10, Math.random() * 100)}%` }}></div>
                    ))}
                  </div>
                  <div className="flex justify-center items-center gap-6">
                    <button className="text-stone-300 hover:text-white"><SkipBack size={20}/></button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white text-stone-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
                      {isPlaying ? <Pause size={20} className="fill-current"/> : <Play size={20} className="fill-current ml-1"/>}
                    </button>
                    <button className="text-stone-300 hover:text-white"><SkipForward size={20}/></button>
                  </div>
                </div>
              )}

              <div className="p-5 border-b border-stone-100 bg-stone-50 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Arrangement Key</label>
                  <select className="w-full p-2 border border-stone-200 rounded-md text-sm font-semibold text-stone-700 bg-white outline-none focus:border-rose-500">
                    <option>{selectedSong.key} (Default)</option>
                    <option>C</option><option>D</option><option>E</option><option>F</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Original Key</label>
                  <div className="p-2 border border-stone-200 rounded-md text-sm font-medium text-stone-500 bg-stone-100">{selectedSong.originalKey || selectedSong.key}</div>
                </div>
              </div>
              <div className="p-4 bg-white flex flex-col gap-2">
                <button onClick={() => setIsChordModal(true)} className="w-full py-2 bg-stone-100 text-stone-700 rounded-md text-sm font-semibold hover:bg-stone-200 transition-colors flex justify-center items-center gap-2"><FileText size={16}/> View Chord Chart</button>
              </div>
            </div>
          ) : (
            isAdmin && (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit flex flex-col">
                <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
                  <div className="flex items-center gap-2"><Sparkles size={18} className="text-white/80" /><h3 className="font-semibold">AI Music Analyzer</h3></div>

                </div>
                <div className="p-4 bg-stone-50 border-b border-stone-200">
                  <div className="flex gap-2 bg-white p-1 rounded-lg border border-stone-200">
                    <button onClick={() => setAnalysisMode('vocals')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'vocals' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><Mic2 size={14}/> Vocals</button>
                    <button onClick={() => setAnalysisMode('chords')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'chords' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><ListMusic size={14}/> Chords</button>
                    <button onClick={() => setAnalysisMode('lyrics')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'lyrics' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><FileText size={14}/> Lyrics</button>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-4 flex-1">
                  <textarea className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-rose-500 outline-none resize-none bg-stone-50" placeholder="Paste lyrics or type a song title..." rows="3" value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)}></textarea>
                  <button onClick={handleMusicAnalysis} disabled={isAnalyzingMusic || !musicPrompt} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}>
                    {isAnalyzingMusic ? <Loader2 size={16} className="animate-spin" /> : 'Analyze Track'}
                  </button>
                  {musicAnalysisResult && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl min-h-[160px]">
                      <MarkdownRenderer content={musicAnalysisResult} />
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Music Stand Mode */}
      {isStandMode && selectedSong && (
        <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <button onClick={() => setIsStandMode(false)} className="absolute top-6 right-6 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1"><X size={16}/> Exit Stand Mode</button>
          <div className="max-w-2xl w-full text-center">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-3">{selectedSong.artist}</p>
            <h1 className="text-white font-serif text-5xl font-bold tracking-tight mb-6">{selectedSong.title}</h1>
            <div className="flex justify-center gap-6 text-stone-400 text-sm mb-10">
              <span>Key: <strong className="text-white">{selectedSong.key}</strong></span>
              <span>BPM: <strong className="text-white">{selectedSong.bpm}</strong></span>
              <span>CCLI: <strong className="text-white">{selectedSong.ccli || 'N/A'}</strong></span>
            </div>
            <div className="bg-stone-900 rounded-2xl p-8 text-left text-stone-200 text-lg leading-loose font-mono border border-stone-800">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-4">Verse 1</p>
              <p>Great is Thy faithfulness, O God my Father</p>
              <p>There is no shadow of turning with Thee</p>
              <p>Thou changest not, Thy compassions, they fail not</p>
              <p>As Thou hast been, Thou forever wilt be</p>
            </div>
            <div className="flex justify-center items-center gap-8 mt-10">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-white text-stone-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-2xl">
                {isPlaying ? <Pause size={24} className="fill-current"/> : <Play size={24} className="fill-current ml-1"/>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chord Chart Modal */}
      {isChordModal && selectedSong && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Music className="text-rose-600" size={20}/> Chord Chart — {selectedSong.title}</h2>
              <button onClick={() => setIsChordModal(false)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            <div className="bg-stone-50 rounded-lg p-5 font-mono text-sm text-stone-800 space-y-3 border border-stone-200">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Key of {selectedSong.key} • {selectedSong.bpm} BPM</p>
              <p><span className="text-rose-600 font-bold">{selectedSong.key}</span>{"    "}<span className="text-rose-600 font-bold">Am</span>{"    "}<span className="text-rose-600 font-bold">F</span>{"    "}<span className="text-rose-600 font-bold">G</span></p>
              <p className="text-stone-600">Great is Thy faith-ful-ness, O God my Fa-ther</p>
              <p><span className="text-rose-600 font-bold">{selectedSong.key}</span>{"    "}<span className="text-rose-600 font-bold">Am</span>{"    "}<span className="text-rose-600 font-bold">Dm</span>{"    "}<span className="text-rose-600 font-bold">G</span>{"    "}<span className="text-rose-600 font-bold">{selectedSong.key}</span></p>
              <p className="text-stone-600">There is no sha-dow of turn-ing with Thee</p>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => window.print()} className="px-4 py-2 bg-stone-800 text-white rounded-md text-sm font-medium hover:bg-stone-900">Print Chart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
