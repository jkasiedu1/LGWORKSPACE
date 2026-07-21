import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Loader2, Search, UploadCloud, Music,
  FileText, FileAudio, Mic2, ListMusic, Play, Pause,
  X, Trash2, ChevronDown, ChevronUp, MonitorPlay,
  History, BookOpen, Plus, SkipBack, SkipForward,
  Copy, Check, Pencil, Save,
} from 'lucide-react';
import { callAI } from '../lib/gemini';
import {
  createSong, deleteSong,
  updateSongVocalPart, removeSongVocalPart,
  createSongAnalysis, deleteSongAnalysis, subscribeSongAnalyses, updateSongAnalysis,
} from '../lib/firestoreServices';
import { uploadAudioToR2 } from '../lib/mediaStorage';
import MarkdownRenderer from '../components/MarkdownRenderer.jsx';
import { auth } from '../config/firebase';

// ── Static config ────────────────────────────────────────────────────────────

const VOCAL_PARTS = [
  { id: 'soprano', label: 'Soprano', range: 'C4 – G5', abbr: 'S', bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    badgeBg: 'bg-rose-100'    },
  { id: 'alto',    label: 'Alto',    range: 'G3 – E5', abbr: 'A', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badgeBg: 'bg-amber-100'   },
  { id: 'tenor',   label: 'Tenor',   range: 'C3 – A4', abbr: 'T', bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     badgeBg: 'bg-sky-100'     },
  { id: 'bass',    label: 'Bass',    range: 'E2 – E4', abbr: 'B', bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badgeBg: 'bg-violet-100'  },
  { id: 'fullMix', label: 'Full Mix', range: null,     abbr: 'F', bg: 'bg-stone-50',   border: 'border-stone-200',   text: 'text-stone-700',   badgeBg: 'bg-stone-100'   },
];

const ANALYSIS_MODES = [
  { id: 'vocals',      label: 'Vocals',   Icon: Mic2     },
  { id: 'chords',      label: 'Chords',   Icon: ListMusic },
  { id: 'lyrics',      label: 'Lyrics',   Icon: FileText  },
  { id: 'harmony',     label: 'Harmony',  Icon: Music     },
  { id: 'arrangement', label: 'Arrange',  Icon: BookOpen  },
];

const MODE_COLORS = {
  vocals:      'bg-rose-100 text-rose-700',
  chords:      'bg-amber-100 text-amber-700',
  lyrics:      'bg-sky-100 text-sky-700',
  harmony:     'bg-violet-100 text-violet-700',
  arrangement: 'bg-emerald-100 text-emerald-700',
};

const KEYS    = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
const SEASONS = ['','Advent','Christmas','Epiphany','Lent','Easter','Pentecost','Ordinary Time'];
const EMPTY_SONG = { title:'', artist:'', key:'C', bpm:120, ccli:'', youtube:'', tags:'', season:'', theme:'' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1].split(/[?&]/)[0];
      return u.searchParams.get('v');
    }
  } catch {}
  return null;
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MusicApp({ theme, isAdmin, songs, setSongs, globalSearch, showToast }) {
  // Search
  const [searchQuery, setSearchQuery]   = useState('');
  // Add modal
  const [isAddModal, setIsAddModal]     = useState(false);
  const [newSong, setNewSong]           = useState(EMPTY_SONG);
  // Selection
  const [selectedSong, setSelectedSong] = useState(null);
  const [activeTab, setActiveTab]       = useState('studio');
  // Vocal parts upload
  const [uploadingPart, setUploadingPart]       = useState(null);
  const [pendingUploadPart, setPendingUploadPart] = useState(null);
  const fileInputRef = useRef(null);
  // AI analysis
  const [analysisMode, setAnalysisMode]           = useState('vocals');
  const [musicPrompt, setMusicPrompt]             = useState('');
  const [isAnalyzingMusic, setIsAnalyzingMusic]   = useState(false);
  const [analysisResult, setAnalysisResult]       = useState(null);
  const [saveAnalysisEnabled, setSaveAnalysisEnabled] = useState(true);
  const [isEditingCurrentResult, setIsEditingCurrentResult] = useState(false);
  const [editedCurrentResult, setEditedCurrentResult] = useState('');
  const [copiedCurrentResult, setCopiedCurrentResult] = useState(false);
  // Analysis history (live Firestore)
  const [analyses, setAnalyses]                   = useState([]);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState(null);
  const [editingAnalysisId, setEditingAnalysisId] = useState(null);
  const [editingAnalysisText, setEditingAnalysisText] = useState('');
  const [copiedAnalysisId, setCopiedAnalysisId]   = useState(null);
  // Music Stand
  const [isStandMode, setIsStandMode] = useState(false);

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

  // Keep selectedSong in sync when Firestore pushes updates
  useEffect(() => {
    if (!selectedSong) return;
    const updated = songs.find((s) => s.id === selectedSong.id);
    if (updated) setSelectedSong(updated);
  }, [songs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live subscription to analyses subcollection
  useEffect(() => {
    if (!selectedSong?.id) { setAnalyses([]); return; }
    const unsub = subscribeSongAnalyses(selectedSong.id, setAnalyses);
    return () => unsub?.();
  }, [selectedSong?.id]);

  const filteredSongs = songs.filter((s) =>
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ccli?.includes(searchQuery)
  );

  // ── Song CRUD ──────────────────────────────────────────────────────────────

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setActiveTab('studio');
    setAnalysisResult(null);
    setMusicPrompt('');
  };

  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist) return;
    const tagsArray = newSong.tags ? newSong.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const payload = { ...newSong, tags: tagsArray, bpm: Number(newSong.bpm) || 120, lastPlayed: 'Never' };
    const tempId = `temp-${Date.now()}`;
    setSongs((prev) => [{ id: tempId, ...payload }, ...prev]);
    setIsAddModal(false);
    setNewSong(EMPTY_SONG);
    try {
      const created = await createSong(payload);
      setSongs((prev) => prev.map((s) => (s.id === tempId ? created : s)));
      showToast('Song added to library');
    } catch (err) {
      console.error('[MusicApp] createSong failed:', err);
      setSongs((prev) => prev.filter((s) => s.id !== tempId));
      showToast('Failed to add song');
    }
  };

  const handleDeleteSong = async (songId) => {
    const removed = songs.find((s) => s.id === songId);
    if (!removed) return;
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    if (selectedSong?.id === songId) setSelectedSong(null);
    try {
      await deleteSong(String(songId));
      showToast('Song removed');
    } catch {
      setSongs((prev) => [removed, ...prev]);
      showToast('Failed to remove song');
    }
  };

  // ── Vocal part upload ──────────────────────────────────────────────────────

  const triggerVocalUpload = (partId) => {
    setPendingUploadPart(partId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingUploadPart || !selectedSong) return;
    const part = pendingUploadPart;
    setPendingUploadPart(null);
    setUploadingPart(part);
    try {
      const result = await uploadAudioToR2(file, 'music');
      await updateSongVocalPart(selectedSong.id, part, {
        url: result.mediaUrl,
        name: file.name,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth?.currentUser?.email || '',
      });
      showToast(`${VOCAL_PARTS.find((p) => p.id === part)?.label} part uploaded`);
    } catch (err) {
      console.error('[MusicApp] Vocal upload failed:', err);
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setUploadingPart(null);
    }
  };

  const handleDeleteVocalPart = async (partId) => {
    if (!selectedSong) return;
    try {
      await removeSongVocalPart(selectedSong.id, partId);
      showToast('Part removed');
    } catch {
      showToast('Failed to remove part');
    }
  };

  // ── AI Analysis ────────────────────────────────────────────────────────────

  const prefillFromSong = () => {
    if (!selectedSong) return;
    const lines = [
      `Song: "${selectedSong.title}" by ${selectedSong.artist}`,
      `Key: ${selectedSong.key} | BPM: ${selectedSong.bpm}`,
      selectedSong.ccli   ? `CCLI: ${selectedSong.ccli}` : '',
      selectedSong.tags?.length ? `Tags: ${selectedSong.tags.join(', ')}` : '',
      selectedSong.season ? `Liturgical Season: ${selectedSong.season}` : '',
      selectedSong.theme  ? `Theme: ${selectedSong.theme}` : '',
      selectedSong.youtube ? `YouTube: ${selectedSong.youtube}` : '',
      `\nPlease analyze the ${analysisMode} aspects of this song.`,
    ].filter(Boolean);
    setMusicPrompt(lines.join('\n'));
  };

  const handleMusicAnalysis = async () => {
    if (!musicPrompt.trim()) return;
    setIsAnalyzingMusic(true);
    setAnalysisResult(null);

    let fullPrompt = musicPrompt;

    // Enrich with YouTube oEmbed metadata if song has a YouTube URL
    const ytId = extractYouTubeId(selectedSong?.youtube);
    if (ytId) {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`
        );
        if (res.ok) {
          const meta = await res.json();
          fullPrompt += `\n\n[YouTube — Title: "${meta.title}", Channel: "${meta.author_name}"]`;
        }
      } catch { /* oEmbed is best-effort */ }
    }

    const systemCtx = `You are a professional choir director, arranger, and worship music specialist with expertise in SATB choral writing, congregational worship, and contemporary Christian music. The user is asking about the "${analysisMode}" aspect of a song. Provide highly practical, actionable guidance. Use markdown formatting (## headers, **bold** key terms, bullet points). Be specific: include voice ranges in scientific pitch notation (e.g. C4, G5), actual chord names with inversions, breath mark suggestions, dynamic markings, sectional cues, and harmony part-writing notes where relevant.`;

    const result = await callAI(fullPrompt, systemCtx, null, { maxTokens: 3000 });
    setAnalysisResult(result);
    setIsAnalyzingMusic(false);

    // Persist if enabled, a real song is selected, and the AI didn't return an error string
    const isAiError = !result || result.startsWith('AI ') || result.startsWith('AI features') || result.startsWith('AI service');
    if (saveAnalysisEnabled && selectedSong?.id && !isAiError) {
      try {
        await createSongAnalysis(selectedSong.id, {
          mode: analysisMode,
          prompt: musicPrompt,
          result,
          createdBy: auth?.currentUser?.uid || '',
        });
      } catch (err) {
        console.error('[MusicApp] Failed to persist analysis:', err);
      }
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (!selectedSong) return;
    try {
      await deleteSongAnalysis(selectedSong.id, analysisId);
      if (expandedAnalysisId === analysisId) setExpandedAnalysisId(null);
      if (editingAnalysisId === analysisId) setEditingAnalysisId(null);
      showToast('Analysis deleted');
    } catch {
      showToast('Failed to delete analysis');
    }
  };

  const handleSaveAnalysisEdit = async (analysisId) => {
    if (!selectedSong) return;
    try {
      await updateSongAnalysis(selectedSong.id, analysisId, { result: editingAnalysisText });
      setEditingAnalysisId(null);
      showToast('Analysis updated');
    } catch {
      showToast('Failed to update analysis');
    }
  };

  const handleCopyAnalysis = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAnalysisId(id);
      setTimeout(() => setCopiedAnalysisId(null), 2000);
    });
  };

  const handleCopyCurrentResult = () => {
    const text = isEditingCurrentResult ? editedCurrentResult : analysisResult;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCurrentResult(true);
      setTimeout(() => setCopiedCurrentResult(false), 2000);
    });
  };

  // ── Sub-renderers ──────────────────────────────────────────────────────────

  const renderVocalPartCard = (part) => {
    const songPart = selectedSong?.vocalParts?.[part.id];
    const isUploading = uploadingPart === part.id;
    return (
      <div key={part.id} className={`rounded-xl border ${part.border} ${part.bg} p-4 flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${part.badgeBg} ${part.text}`}>
              {part.abbr}
            </span>
            <div>
              <p className={`font-semibold text-sm ${part.text}`}>{part.label}</p>
              {part.range && <p className="text-[11px] text-stone-400 font-mono">{part.range}</p>}
            </div>
          </div>
          {isAdmin && songPart && (
            <button
              onClick={() => handleDeleteVocalPart(part.id)}
              className="p-1 text-stone-300 hover:text-red-500 transition-colors"
              title="Remove part"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {songPart ? (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-stone-400 truncate" title={songPart.name}>{songPart.name}</p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={songPart.url} className="w-full" style={{ height: '32px' }} />
          </div>
        ) : isAdmin ? (
          <button
            onClick={() => triggerVocalUpload(part.id)}
            disabled={isUploading}
            className="w-full py-2 border-2 border-dashed border-stone-300 rounded-lg text-xs font-medium text-stone-400 hover:border-stone-400 hover:text-stone-600 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
            {isUploading ? 'Uploading…' : 'Upload Audio'}
          </button>
        ) : (
          <p className="text-[11px] text-stone-400 italic text-center py-2">Not yet uploaded</p>
        )}
      </div>
    );
  };

  const renderAnalysisHistory = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <History size={14} className="text-stone-400" />
        <span className="text-xs font-semibold text-stone-600">Analysis History</span>
        <span className="ml-auto text-xs text-stone-400">{analyses.length} saved</span>
      </div>
      {analyses.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-6 bg-stone-50 rounded-xl border border-stone-100">
          No analyses saved yet. Run an analysis with Save enabled.
        </p>
      ) : (
        analyses.map((a) => (
          <div key={a.id} className="border border-stone-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
              onClick={() => setExpandedAnalysisId((prev) => (prev === a.id ? null : a.id))}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${MODE_COLORS[a.mode] || 'bg-stone-100 text-stone-600'}`}>
                  {a.mode}
                </span>
                <span className="text-xs text-stone-400 truncate">{formatDate(a.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAnalysis(a.id); }}
                    className="p-1 text-stone-300 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                {expandedAnalysisId === a.id
                  ? <ChevronUp size={14} className="text-stone-400" />
                  : <ChevronDown size={14} className="text-stone-400" />}
              </div>
            </button>
            {expandedAnalysisId === a.id && (
              <div className="border-t border-stone-100">
                {a.prompt && (
                  <p className="text-xs text-stone-400 italic px-4 pt-3 pb-3 border-b border-stone-100 leading-relaxed">
                    "{a.prompt.slice(0, 140)}{a.prompt.length > 140 ? '…' : ''}"
                  </p>
                )}
                <div className="flex items-center gap-1.5 justify-end px-3 py-2 border-b border-stone-100 bg-stone-50/50">
                  {editingAnalysisId === a.id ? (
                    <>
                      <button
                        onClick={() => handleSaveAnalysisEdit(a.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-600"
                      >
                        <Save size={11} /> Save
                      </button>
                      <button
                        onClick={() => setEditingAnalysisId(null)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                      >
                        <X size={11} /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {isAdmin && (
                        <button
                          onClick={() => { setEditingAnalysisId(a.id); setEditingAnalysisText(a.result); }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                          title="Edit"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyAnalysis(a.result, a.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                        title="Copy to clipboard"
                      >
                        {copiedAnalysisId === a.id ? <><Check size={11} className="text-green-500" /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                    </>
                  )}
                </div>
                <div className="px-4 py-4">
                  {editingAnalysisId === a.id ? (
                    <textarea
                      className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none bg-white leading-relaxed font-mono"
                      rows={10}
                      value={editingAnalysisText}
                      onChange={(e) => setEditingAnalysisText(e.target.value)}
                    />
                  ) : (
                    <MarkdownRenderer content={a.result} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderAIPanel = () => (
    <div className="flex flex-col gap-4">
      {/* Mode selector */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
        {ANALYSIS_MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setAnalysisMode(id)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              analysisMode === id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Your Question</label>
          {selectedSong && (
            <button onClick={prefillFromSong} className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              Pre-fill from song ↗
            </button>
          )}
        </div>
        <textarea
          className="w-full p-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none resize-none bg-stone-50 leading-relaxed"
          placeholder={
            selectedSong
              ? `Ask about "${selectedSong.title}" — vocals, chords, harmony, arrangement…`
              : 'Paste lyrics, type a song title, or ask any choir / worship music question…'
          }
          rows={4}
          value={musicPrompt}
          onChange={(e) => setMusicPrompt(e.target.value)}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {selectedSong && (
          <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
            <button
              type="button"
              onClick={() => setSaveAnalysisEnabled((v) => !v)}
              className={`w-9 h-5 rounded-full relative transition-colors ${saveAnalysisEnabled ? 'bg-rose-500' : 'bg-stone-300'}`}
              aria-label="Toggle save analysis"
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${saveAnalysisEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs font-medium text-stone-600">Save</span>
          </label>
        )}
        <button
          onClick={handleMusicAnalysis}
          disabled={isAnalyzingMusic || !musicPrompt.trim()}
          className="flex-1 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-40"
        >
          {isAnalyzingMusic
            ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
            : <><Sparkles size={15} /> Analyze</>}
        </button>
      </div>

      {/* Current result */}
      {analysisResult && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-end gap-1.5 px-3 py-2 border-b border-stone-200 bg-white">
            {isEditingCurrentResult ? (
              <>
                <button
                  onClick={() => { setAnalysisResult(editedCurrentResult); setIsEditingCurrentResult(false); }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-600"
                >
                  <Save size={12} /> Save
                </button>
                <button
                  onClick={() => setIsEditingCurrentResult(false)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                >
                  <X size={12} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setEditedCurrentResult(analysisResult); setIsEditingCurrentResult(true); }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                  title="Edit"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={handleCopyCurrentResult}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                  title="Copy to clipboard"
                >
                  {copiedCurrentResult ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </>
            )}
          </div>
          <div className="p-4">
            {isEditingCurrentResult ? (
              <textarea
                className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none bg-white leading-relaxed font-mono"
                rows={12}
                value={editedCurrentResult}
                onChange={(e) => setEditedCurrentResult(e.target.value)}
              />
            ) : (
              <MarkdownRenderer content={analysisResult} />
            )}
          </div>
        </div>
      )}

      {/* History */}
      {selectedSong && (
        <div className="pt-4 border-t border-stone-100">
          {renderAnalysisHistory()}
        </div>
      )}
    </div>
  );

  // ── YouTube ID for selected song ───────────────────────────────────────────
  const ytId = extractYouTubeId(selectedSong?.youtube);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left relative">
      {/* Hidden audio file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.aac,.flac,.m4a"
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Page header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Music Library</h1>
          <p className="text-stone-500 text-sm mt-1">Choir workspace — vocal parts, AI analysis, YouTube embed.</p>
        </div>
        <div className="flex gap-2">
          {selectedSong && (
            <button
              onClick={() => setIsStandMode(true)}
              className={`px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 flex items-center gap-2 shadow-sm`}
            >
              <MonitorPlay size={15} /> Music Stand
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setIsAddModal(true)}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2 shadow-sm"
            >
              <Plus size={15} /> Add Song
            </button>
          )}
        </div>
      </div>

      {/* ── Add Song Modal ── */}
      {isAddModal && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Music className="text-rose-600" size={20} /> Add New Song
              </h2>
              <button onClick={() => setIsAddModal(false)} className="text-stone-400 hover:text-stone-700"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Song Title *" className="w-full p-3 border border-stone-200 rounded-xl outline-none focus:border-rose-500 text-sm" value={newSong.title} onChange={(e) => setNewSong({ ...newSong, title: e.target.value })} />
              <input type="text" placeholder="Artist / Composer *" className="w-full p-3 border border-stone-200 rounded-xl outline-none focus:border-rose-500 text-sm" value={newSong.artist} onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Key</label>
                  <select className="w-full p-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500 bg-white" value={newSong.key} onChange={(e) => setNewSong({ ...newSong, key: e.target.value })}>
                    {KEYS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">BPM</label>
                  <input type="number" placeholder="120" className="w-full p-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500" value={newSong.bpm} onChange={(e) => setNewSong({ ...newSong, bpm: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">CCLI #</label>
                  <input type="text" placeholder="0000000" className="w-full p-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500" value={newSong.ccli} onChange={(e) => setNewSong({ ...newSong, ccli: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Liturgical Season</label>
                  <select className="w-full p-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500 bg-white" value={newSong.season} onChange={(e) => setNewSong({ ...newSong, season: e.target.value })}>
                    {SEASONS.map((s) => <option key={s} value={s}>{s || '— None —'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Theme</label>
                  <input type="text" placeholder="e.g. Praise, Communion" className="w-full p-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-rose-500" value={newSong.theme} onChange={(e) => setNewSong({ ...newSong, theme: e.target.value })} />
                </div>
              </div>
              <input type="text" placeholder="Tags (comma-separated, e.g. worship, contemporary, CCLI)" className="w-full p-2.5 border border-stone-200 rounded-xl outline-none focus:border-rose-500 text-sm" value={newSong.tags} onChange={(e) => setNewSong({ ...newSong, tags: e.target.value })} />
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>
                <input type="url" placeholder="YouTube URL (optional)" className="w-full pl-10 p-2.5 border border-stone-200 rounded-xl outline-none focus:border-rose-500 text-sm" value={newSong.youtube} onChange={(e) => setNewSong({ ...newSong, youtube: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsAddModal(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleAddSong} disabled={!newSong.title || !newSong.artist} className="px-5 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">Add to Library</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* Left: Song Catalog */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex items-center gap-3">
            <h3 className="font-semibold text-stone-800 flex-shrink-0">Song Catalog</h3>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Search title, artist, CCLI…"
                className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:border-rose-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="w-full text-sm text-left">
              <thead className="border-b border-stone-100 text-stone-500 text-xs font-semibold sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-4 py-3">Song</th>
                  <th className="px-4 py-3">Key/BPM</th>
                  <th className="px-4 py-3">Parts</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredSongs.map((song) => {
                  const parts = song.vocalParts || {};
                  const isSelected = selectedSong?.id === song.id;
                  return (
                    <tr
                      key={song.id}
                      onClick={() => handleSelectSong(song)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-rose-50' : 'hover:bg-stone-50'}`}
                    >
                      <td className={`px-4 py-3 ${isSelected ? 'border-l-2 border-rose-500' : ''}`}>
                        <p className="font-semibold text-stone-900 text-sm leading-tight">{song.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{song.artist}</p>
                        {song.season && <span className="text-[10px] font-medium text-violet-500">{song.season}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-700 mr-1">{song.key}</span>
                        <span className="text-xs text-stone-400">{song.bpm}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {VOCAL_PARTS.map((p) => (
                            <span
                              key={p.id}
                              className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-bold ${parts[p.id] ? `${p.badgeBg} ${p.text}` : 'bg-stone-100 text-stone-300'}`}
                              title={`${p.label}${parts[p.id] ? ' — uploaded' : ' — not uploaded'}`}
                            >
                              {p.abbr}
                            </span>
                          ))}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSong(song.id); }}
                            className="p-1.5 text-stone-300 hover:text-red-500 transition-colors"
                            title="Delete song"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredSongs.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-stone-400 text-sm">
                      {searchQuery ? `No results for "${searchQuery}"` : 'No songs in library yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {songs.length > 0 && (
            <div className="px-4 py-2 bg-stone-50 border-t border-stone-100">
              <p className="text-xs text-stone-400">{songs.length} {songs.length === 1 ? 'song' : 'songs'} in library</p>
            </div>
          )}
        </div>

        {/* Right: Song Detail or standalone AI panel */}
        <div className="xl:col-span-3 space-y-4">
          {selectedSong ? (
            <>
              {/* Song header */}
              <div className="bg-stone-900 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-5 flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl font-bold text-white tracking-tight leading-tight">{selectedSong.title}</h2>
                    <p className="text-stone-400 text-sm mt-0.5">{selectedSong.artist}</p>
                    {selectedSong.theme && <p className="text-stone-500 text-xs mt-1 italic">{selectedSong.theme}</p>}
                  </div>
                  <button onClick={() => setSelectedSong(null)} className="flex-shrink-0 p-1.5 text-stone-500 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="px-5 pb-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-stone-800 rounded-full text-xs font-bold text-white">{selectedSong.key}</span>
                  <span className="px-3 py-1 bg-stone-800 rounded-full text-xs font-medium text-stone-300">{selectedSong.bpm} BPM</span>
                  {selectedSong.ccli && <span className="px-3 py-1 bg-stone-800 rounded-full text-xs text-stone-300">CCLI {selectedSong.ccli}</span>}
                  {selectedSong.season && <span className="px-3 py-1 bg-violet-900/60 rounded-full text-xs font-medium text-violet-300">{selectedSong.season}</span>}
                  {selectedSong.tags?.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-stone-800/70 rounded-full text-xs text-stone-400">{tag}</span>
                  ))}
                </div>
                {/* Tab bar */}
                <div className="border-t border-stone-800 flex">
                  {[
                    { id: 'studio',   label: '🎙  Choir Studio' },
                    { id: 'analysis', label: '✦  AI Analysis'   },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === id ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Studio tab */}
              {activeTab === 'studio' && (
                <div className="space-y-4">
                  {/* YouTube inline embed */}
                  {ytId && (
                    <div className="bg-black rounded-2xl overflow-hidden shadow-sm">
                      <div className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                          title={selectedSong.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Vocal Parts */}
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                          <Mic2 size={16} className="text-rose-500" /> Vocal Parts
                        </h3>
                        <p className="text-xs text-stone-400 hidden sm:block">Singers reference their own part below</p>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {VOCAL_PARTS.map(renderVocalPartCard)}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Analysis tab */}
              {activeTab === 'analysis' && (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className={`${theme.bg} px-5 py-4 flex items-center gap-2`}>
                    <Sparkles size={16} className="text-white/80" />
                    <h3 className="font-semibold text-white">AI Choir Analyzer</h3>
                    <span className="ml-auto text-white/50 text-xs">DeepSeek · context-aware</span>
                  </div>
                  <div className="p-5">
                    {renderAIPanel()}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No song selected — standalone AI panel */
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className={`${theme.bg} px-5 py-4 flex items-center gap-2`}>
                <Sparkles size={16} className="text-white/80" />
                <h3 className="font-semibold text-white">AI Music Analyzer</h3>
                <span className="ml-auto text-white/50 text-xs">Select a song for context-aware analysis</span>
              </div>
              <div className="p-5">
                {renderAIPanel()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Music Stand Mode ── */}
      {isStandMode && selectedSong && (
        <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 overflow-y-auto">
          <button
            onClick={() => setIsStandMode(false)}
            className="absolute top-6 right-6 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <X size={16} /> Exit
          </button>
          <div className="max-w-3xl w-full text-center py-8">
            <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-3">{selectedSong.artist}</p>
            <h1 className="text-white font-serif text-5xl font-bold tracking-tight mb-4">{selectedSong.title}</h1>
            <div className="flex justify-center flex-wrap gap-5 text-stone-400 text-sm mb-8">
              <span>Key: <strong className="text-white">{selectedSong.key}</strong></span>
              <span>BPM: <strong className="text-white">{selectedSong.bpm}</strong></span>
              {selectedSong.ccli && <span>CCLI: <strong className="text-white">{selectedSong.ccli}</strong></span>}
              {selectedSong.season && <span className="text-violet-400">{selectedSong.season}</span>}
            </div>

            {/* Vocal parts players in stand mode */}
            {Object.keys(selectedSong.vocalParts || {}).length > 0 && (
              <div className="mb-8 flex flex-wrap justify-center gap-3">
                {VOCAL_PARTS.filter((p) => selectedSong.vocalParts?.[p.id]).map((p) => (
                  <div key={p.id} className="bg-stone-900 border border-stone-800 rounded-xl p-3 min-w-[180px] text-left">
                    <p className={`text-xs font-bold mb-2 ${p.text}`}>{p.label}</p>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={selectedSong.vocalParts[p.id].url} className="w-full" style={{ height: '32px' }} />
                  </div>
                ))}
              </div>
            )}

            {/* YouTube link in stand mode */}
            {ytId && (
              <a
                href={selectedSong.youtube}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>
                Open on YouTube
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
