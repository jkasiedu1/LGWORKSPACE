import { useEffect, useRef, useState } from 'react';
import {
  Globe, Users, Calendar as CalendarIcon, Plus, Search, MoreHorizontal,
  MessageCircle, Image as ImageIcon, Send, X, ChevronDown, ChevronUp,
  Heart, ThumbsUp, Link as LinkIcon, Play, BookOpen, Smile
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  createCommunityMessage,
  createCommunityPost,
  deleteCommunityPost,
  updateCommunityPost,
  addPostReaction,
  removePostReaction,
  addCommentToPost,
  createStory,
} from '../lib/firestoreServices';
import { uploadMediaToR2 } from '../lib/mediaStorage';
import { db } from '../config/firebase';

// ─── helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPostTime(createdAt) {
  if (!createdAt) return 'Just now';
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return (text || '').match(urlRegex) || [];
}

const AVATAR_COLORS = [
  'bg-teal-500','bg-sky-500','bg-violet-500','bg-rose-500',
  'bg-amber-500','bg-emerald-500','bg-indigo-500','bg-pink-500',
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const REACTIONS = [
  { type: 'like',  emoji: '👍', label: 'Like'  },
  { type: 'love',  emoji: '❤️', label: 'Love'  },
  { type: 'pray',  emoji: '🙏', label: 'Pray'  },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, size = 10, className = '' }) {
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(name || '?')} ${className}`}>
      {getInitials(name)}
    </div>
  );
}

function LinkPreview({ url }) {
  const ytId = extractYouTubeId(url);
  const [meta, setMeta] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (ytId) return;
    // Use a CORS-friendly OG proxy
    const controller = new AbortController();
    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const html = data?.contents || '';
        const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                        || html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const imgMatch  = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                        || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        if (titleMatch) setMeta({ title: titleMatch[1], image: imgMatch?.[1], desc: descMatch?.[1] });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [url, ytId]);

  if (ytId) {
    return (
      <div className="mx-4 mb-3 rounded-xl overflow-hidden border border-stone-200 bg-black">
        {expanded ? (
          <iframe
            className="w-full aspect-video"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        ) : (
          <div className="relative aspect-video cursor-pointer" onClick={() => setExpanded(true)}>
            <img
              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="YouTube thumbnail"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <Play size={24} className="text-white ml-1" fill="white"/>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!meta) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="mx-4 mb-3 flex gap-3 rounded-xl border border-stone-200 overflow-hidden hover:bg-stone-50 transition-colors no-underline">
      {meta.image && (
        <img src={meta.image} alt="" className="w-20 h-20 object-cover shrink-0"/>
      )}
      <div className="p-3 min-w-0">
        <p className="text-xs font-bold text-stone-900 line-clamp-1">{meta.title}</p>
        {meta.desc && <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{meta.desc}</p>}
        <p className="text-[10px] text-stone-400 mt-1 truncate">{url}</p>
      </div>
    </a>
  );
}

function ReactionBar({ post, uid, onReact, onOpenPost }) {
  const [hovering, setHovering] = useState(false);
  const hoverTimeout = useRef(null);

  const myReaction = REACTIONS.find(r => (post.reactions?.[r.type] || []).includes(uid));

  const totalReactions = REACTIONS.reduce((sum, r) => sum + (post.reactions?.[r.type]?.length || 0), 0);

  const reactionSummary = REACTIONS
    .filter(r => (post.reactions?.[r.type]?.length || 0) > 0)
    .map(r => `${r.emoji} ${post.reactions[r.type].length}`)
    .join('  ');

  return (
    <>
      {totalReactions > 0 && (
        <div className="px-4 pt-2 pb-1 flex items-center gap-1 text-xs text-stone-500">
          <span>{reactionSummary}</span>
          <span className="mx-1">·</span>
          <button onClick={onOpenPost} className="hover:underline">{post.comments || 0} comment{post.comments !== 1 ? 's' : ''}</button>
        </div>
      )}
      <div className="border-t border-stone-100 flex">
        {/* Like with popover */}
        <div className="relative flex-1"
          onMouseEnter={() => { hoverTimeout.current = setTimeout(() => setHovering(true), 400); }}
          onMouseLeave={() => { clearTimeout(hoverTimeout.current); setHovering(false); }}>
          <button
            onClick={() => onReact(myReaction ? myReaction.type : 'like')}
            className={`w-full flex justify-center items-center gap-1.5 py-2.5 text-xs font-semibold rounded-none transition-colors
              ${myReaction ? 'text-teal-600' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
          >
            <span>{myReaction ? myReaction.emoji : '👍'}</span>
            <span>{myReaction ? myReaction.label : 'Like'}</span>
          </button>
          {hovering && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 bg-white border border-stone-200 rounded-full shadow-xl px-2 py-1.5 z-30">
              {REACTIONS.map(r => (
                <button
                  key={r.type}
                  title={r.label}
                  onClick={() => { onReact(r.type); setHovering(false); }}
                  className="text-xl hover:scale-125 transition-transform px-1"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onOpenPost}
          className="flex-1 flex justify-center items-center gap-1.5 py-2.5 text-stone-500 hover:bg-stone-50 text-xs font-semibold transition-colors"
        >
          <MessageCircle size={15}/> Comment
        </button>
      </div>
    </>
  );
}

function CommentThread({ post, uid, displayName, onAddComment }) {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author: displayName,
      authorId: uid,
      text: input.trim(),
      createdAt: new Date().toISOString(),
      replyTo: replyTo?.id || null,
      replyToAuthor: replyTo?.author || null,
    };
    onAddComment(post.id, comment);
    setInput('');
    setReplyTo(null);
  };

  const topLevel = (post.commentList || []).filter(c => !c.replyTo);
  const getReplies = (commentId) => (post.commentList || []).filter(c => c.replyTo === commentId);

  return (
    <div className="border-t border-stone-100 bg-stone-50/60 px-4 pt-3 pb-4 space-y-3">
      {topLevel.map(c => (
        <div key={c.id} className="space-y-2">
          <div className="flex gap-2.5">
            <Avatar name={c.author} size={7}/>
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 border border-stone-100 shadow-sm">
                <p className="text-[11px] font-bold text-stone-800">{c.author}</p>
                <p className="text-sm text-stone-700 leading-snug mt-0.5">{c.text}</p>
              </div>
              <div className="flex items-center gap-3 mt-1 px-1">
                <span className="text-[10px] text-stone-400">{formatPostTime(c.createdAt)}</span>
                <button onClick={() => setReplyTo(c)} className="text-[10px] text-stone-500 font-semibold hover:text-teal-600">Reply</button>
              </div>
            </div>
          </div>
          {getReplies(c.id).map(reply => (
            <div key={reply.id} className="flex gap-2.5 ml-9">
              <Avatar name={reply.author} size={6}/>
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 border border-stone-100 shadow-sm">
                  <p className="text-[11px] font-bold text-stone-800">{reply.author}
                    <span className="font-normal text-stone-400"> replied to </span>
                    {reply.replyToAuthor}
                  </p>
                  <p className="text-sm text-stone-700 leading-snug mt-0.5">{reply.text}</p>
                </div>
                <span className="text-[10px] text-stone-400 px-1">{formatPostTime(reply.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      <form onSubmit={handleSubmit} className="flex gap-2 items-start pt-1">
        <Avatar name={displayName} size={7}/>
        <div className="flex-1 min-w-0">
          {replyTo && (
            <div className="flex items-center gap-1 mb-1 text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full w-fit">
              Replying to {replyTo.author}
              <button type="button" onClick={() => setReplyTo(null)} className="ml-1 text-stone-400 hover:text-stone-600"><X size={10}/></button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder={`Comment as ${displayName}…`}
              className="flex-1 text-sm border border-stone-200 rounded-full px-3 py-1.5 outline-none focus:border-teal-500 bg-white"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" disabled={!input.trim()} className="text-teal-600 hover:text-teal-800 disabled:opacity-40">
              <Send size={15}/>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function PostCard({ post, uid, displayName, isPrivileged, theme, onReact, onAddComment, onEdit, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const urls = extractUrls(post.content || '');
  const ytUrl = urls.find(u => extractYouTubeId(u));
  const linkUrl = !ytUrl ? urls[0] : null;
  const canManage = isPrivileged || post.authorId === uid;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={post.author} size={10}/>
          <div>
            <p className="font-bold text-stone-900 text-sm leading-tight">{post.author}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${theme.light} ${theme.color}`}>{post.role}</span>
              <span>·</span>
              <span>{formatPostTime(post.createdAt)}</span>
              {post.edited && <span className="italic text-stone-400">· edited</span>}
            </div>
          </div>
        </div>
        {canManage && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100">
              <MoreHorizontal size={17}/>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-stone-200 rounded-xl shadow-lg z-30 overflow-hidden">
                {post.authorId === uid && (
                  <button onClick={() => { setEditing(true); setEditContent(post.content || ''); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Edit post</button>
                )}
                <button onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete post</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content / Edit */}
      {editing ? (
        <div className="px-4 pb-4">
          <textarea rows={3} value={editContent} onChange={e => setEditContent(e.target.value)}
            className="w-full resize-none border border-stone-200 rounded-xl p-3 text-sm outline-none focus:border-teal-500"
          />
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg">Cancel</button>
            <button onClick={() => { onEdit(post.id, editContent); setEditing(false); }}
              className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg ${theme.bg}`}>Save</button>
          </div>
        </div>
      ) : post.content ? (
        <div className="px-4 pb-3 text-sm text-stone-800 leading-relaxed whitespace-pre-wrap break-words">{post.content}</div>
      ) : null}

      {/* YouTube embed */}
      {ytUrl && <LinkPreview url={ytUrl}/>}
      {/* Plain link card */}
      {linkUrl && <LinkPreview url={linkUrl}/>}

      {/* Image */}
      {post.mediaUrl && post.mediaType === 'image' && (
        <div className="bg-stone-100">
          <img src={post.mediaUrl} alt={post.mediaName || 'Post image'}
            className="w-full max-h-[500px] object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
      {/* Video */}
      {post.mediaUrl && post.mediaType === 'video' && (
        <video src={post.mediaUrl} controls className="w-full max-h-[460px] bg-black"/>
      )}

      {/* Reactions + comments */}
      <ReactionBar post={post} uid={uid} onReact={(type) => onReact(post.id, type)} onOpenPost={() => setShowComments(v => !v)}/>
      {showComments && <CommentThread post={post} uid={uid} displayName={displayName} onAddComment={onAddComment}/>}
    </div>
  );
}

function StoriesBar({ stories, user, displayName, theme, onAddStory }) {
  const [viewing, setViewing] = useState(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const now = Date.now();
  const activeStories = stories.filter(s => {
    const t = s.createdAt ? new Date(s.createdAt).getTime() : 0;
    return now - t < 24 * 3_600_000;
  });

  const openStory = (story) => {
    setViewing(story);
    setProgress(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timerRef.current); setViewing(null); return 0; }
        return p + 2;
      });
    }, 100);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-3">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* Add your story */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button onClick={() => fileRef.current?.click()}
              className={`w-14 h-14 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center hover:border-teal-500 transition-colors ${theme.light}`}>
              <Plus size={20} className={theme.color}/>
            </button>
            <span className="text-[10px] text-stone-500 font-medium">Your Story</span>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const media = await uploadMediaToR2(file, 'stories');
                  await onAddStory({ ...media, author: displayName, authorId: user?.uid });
                } catch {}
                e.target.value = '';
              }}
            />
          </div>
          {activeStories.map(story => (
            <div key={story.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => openStory(story)}>
              <div className={`w-14 h-14 rounded-full border-2 p-0.5 ${theme.border}`}>
                {story.mediaType === 'image' ? (
                  <img src={story.mediaUrl} alt="" className="w-full h-full rounded-full object-cover"/>
                ) : (
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${theme.light}`}>
                    <Play size={18} className={theme.color}/>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-stone-600 font-medium max-w-[56px] truncate">{story.author?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Story viewer */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => { clearInterval(timerRef.current); setViewing(null); }}>
          <div className="relative w-full max-w-sm h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-white/30 rounded-full mx-4 mt-4">
              <div className="h-full bg-white rounded-full transition-none" style={{ width: `${progress}%` }}/>
            </div>
            <div className="flex items-center gap-2 px-4 py-2">
              <Avatar name={viewing.author} size={8}/>
              <div>
                <p className="text-white text-sm font-bold">{viewing.author}</p>
                <p className="text-white/60 text-[11px]">{formatPostTime(viewing.createdAt)}</p>
              </div>
              <button onClick={() => { clearInterval(timerRef.current); setViewing(null); }} className="ml-auto text-white/80 hover:text-white"><X size={22}/></button>
            </div>
            <div className="flex-1 flex items-center justify-center px-4 pb-4">
              {viewing.mediaType === 'image' ? (
                <img src={viewing.mediaUrl} alt="" className="w-full h-full object-contain rounded-2xl"/>
              ) : viewing.mediaType === 'video' ? (
                <video src={viewing.mediaUrl} autoPlay className="w-full h-full object-contain rounded-2xl" onEnded={() => setViewing(null)}/>
              ) : (
                <p className="text-white text-center text-lg px-6">{viewing.content}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CommunityApp({ theme, people, posts = [], setPosts, showToast, user, roleAccess = {} }) {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'You';
  const roleLabel = roleAccess?.isSeniorPastor ? 'Senior Pastor' : roleAccess?.isAdmin ? 'Admin' : 'Volunteer';
  const myInitials = getInitials(displayName);
  const isPrivileged = roleAccess?.isSeniorPastor || roleAccess?.isAdmin;
  const uid = user?.uid;

  const [newPostContent, setNewPostContent] = useState('');
  const [isPostFocused, setIsPostFocused] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessagesByContact, setChatMessagesByContact] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [stories, setStories] = useState([]);
  const photoInputRef = useRef(null);

  const contacts = people.filter(p => p.phone && p.type !== 'Child');
  const MAX_CHARS = 1000;

  // Load stories from Firestore
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      query(collection(db, 'communityStories'), orderBy('createdAt', 'desc')),
      (snap) => setStories(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt };
      }))
    );
    return unsub;
  }, []);

  // Chat subscription
  useEffect(() => {
    if (!activeChat?.id || !db) return undefined;
    setChatLoading(true);
    const threadId = String(activeChat.id);
    const unsub = onSnapshot(
      query(collection(db, 'communityMessages'), where('threadId', '==', threadId), orderBy('createdAt', 'asc')),
      (snapshot) => {
        setChatMessagesByContact(prev => ({
          ...prev,
          [threadId]: snapshot.docs.map(d => {
            const data = d.data();
            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : null;
            return { id: d.id, text: data.text || '', fromUs: Boolean(data.fromUs),
              time: ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now' };
          }),
        }));
        setChatLoading(false);
      },
      () => setChatLoading(false)
    );
    return unsub;
  }, [activeChat?.id]);

  const handlePost = async () => {
    const content = newPostContent.trim();
    if (!content) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, author: displayName, authorId: uid, role: roleLabel, createdAt: new Date().toISOString(), content, reactions: {}, comments: 0, commentList: [] };
    setPosts(prev => [optimistic, ...prev]);
    setNewPostContent('');
    setIsPostFocused(false);
    try {
      const created = await createCommunityPost({ author: displayName, authorId: uid, role: roleLabel, content, reactions: {}, comments: 0, commentList: [] });
      setPosts(prev => prev.map(p => p.id === tempId ? { ...created, createdAt: optimistic.createdAt } : p));
      showToast('Posted ✓');
    } catch {
      setPosts(prev => prev.filter(p => p.id !== tempId));
      showToast('Failed to post');
    }
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const media = await uploadMediaToR2(file, 'community');
      const post = { author: displayName, authorId: uid, role: roleLabel, content: newPostContent.trim(), reactions: {}, comments: 0, commentList: [], ...media };
      const created = await createCommunityPost(post);
      setPosts(prev => [{ ...created, createdAt: new Date().toISOString() }, ...prev]);
      setNewPostContent('');
      showToast(media.mediaType === 'video' ? 'Video posted ✓' : 'Photo posted ✓');
    } catch (err) {
      showToast(err?.message || 'Upload failed');
    }
    e.target.value = '';
  };

  const handleReact = async (postId, type) => {
    if (!uid) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const current = post.reactions?.[type] || [];
    const alreadyReacted = current.includes(uid);
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const reactions = { ...(p.reactions || {}) };
      // Remove from any existing reaction first
      REACTIONS.forEach(r => {
        if (reactions[r.type]) reactions[r.type] = reactions[r.type].filter(id => id !== uid);
      });
      if (!alreadyReacted) reactions[type] = [...(reactions[type] || []), uid];
      return { ...p, reactions };
    }));
    try {
      if (alreadyReacted) {
        await removePostReaction(postId, uid, type);
      } else {
        // Remove any other reaction first, then add
        for (const r of REACTIONS) {
          if (r.type !== type && (post.reactions?.[r.type] || []).includes(uid)) {
            await removePostReaction(postId, uid, r.type);
          }
        }
        await addPostReaction(postId, uid, type);
      }
    } catch {
      // Revert optimistic on failure
      setPosts(prev => prev.map(p => p.id === postId ? post : p));
    }
  };

  const handleAddComment = async (postId, comment) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, commentList: [...(p.commentList || []), comment], comments: (p.comments || 0) + 1 };
    }));
    try {
      await addCommentToPost(postId, comment);
    } catch {
      showToast('Failed to save comment');
    }
  };

  const handleEdit = async (postId, content) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content, edited: true } : p));
    try {
      await updateCommunityPost(postId, { content, edited: true });
      showToast('Post updated ✓');
    } catch {
      showToast('Update failed');
    }
  };

  const handleDelete = async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await deleteCommunityPost(postId);
      showToast('Post deleted');
    } catch {
      showToast('Delete failed');
    }
  };

  const handleAddStory = async (storyData) => {
    try {
      await createStory(storyData);
      showToast('Story shared ✓');
    } catch {
      showToast('Failed to share story');
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeChat?.id) return;
    const threadId = String(activeChat.id);
    const tempId = `temp-chat-${Date.now()}`;
    setChatMessagesByContact(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), { id: tempId, text, fromUs: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] }));
    setChatInput('');
    try {
      await createCommunityMessage({ threadId, contactId: threadId, contactName: activeChat.name, text, fromUs: true });
      setChatMessagesByContact(prev => ({ ...prev, [threadId]: (prev[threadId] || []).filter(m => m.id !== tempId) }));
    } catch {
      setChatMessagesByContact(prev => ({ ...prev, [threadId]: (prev[threadId] || []).filter(m => m.id !== tempId) }));
      showToast('Message failed');
    }
  };

  return (
    <>
    <div className="animate-in fade-in duration-500 text-left h-full">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Church Community</h1>
          <p className="text-stone-500 text-sm mt-1">Connect, share updates, and message members directly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* LEFT NAV */}
        <div className="hidden lg:flex flex-col gap-2">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white ${avatarColor(displayName)}`}>{myInitials}</div>
            <div>
              <p className="font-bold text-stone-900 text-sm">{displayName}</p>
              <p className="text-xs text-stone-500">{roleLabel}</p>
            </div>
          </div>
          <button className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${theme.light} ${theme.color} flex items-center gap-3`}><Globe size={16}/> News Feed</button>
        </div>

        {/* CENTER FEED */}
        <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
          {/* Stories */}
          <StoriesBar stories={stories} user={user} displayName={displayName} theme={theme} onAddStory={handleAddStory}/>

          {/* Composer */}
          <div className={`bg-white rounded-2xl border shadow-sm transition-all ${isPostFocused ? 'border-stone-300 shadow-md' : 'border-stone-200'}`}>
            <div className="p-3 flex gap-3">
              <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white ${avatarColor(displayName)}`}>{myInitials}</div>
              <textarea
                placeholder="Share an update, praise report, or prayer request…"
                className="w-full resize-none outline-none text-stone-700 placeholder:text-stone-400 pt-2 text-sm bg-transparent"
                rows={isPostFocused ? 3 : 1}
                value={newPostContent}
                maxLength={MAX_CHARS}
                onFocus={() => setIsPostFocused(true)}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
            </div>
            {isPostFocused && (
              <div className="border-t border-stone-100">
                <div className="px-3 pt-2 pb-1 flex items-center gap-1">
                  <input ref={photoInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePhotoSelected}/>
                  <button onClick={() => photoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100 transition-colors">
                    <ImageIcon size={15} className="text-emerald-500"/> Photo/Video
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100">
                    <LinkIcon size={15} className="text-sky-500"/> Link
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100">
                    <Smile size={15} className="text-amber-500"/> Emoji
                  </button>
                </div>
                <div className="px-3 pb-2 flex items-center justify-between">
                  <span className={`text-[10px] ${newPostContent.length > MAX_CHARS * 0.9 ? 'text-rose-500' : 'text-stone-400'}`}>{newPostContent.length}/{MAX_CHARS}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setIsPostFocused(false); setNewPostContent(''); }} className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-100 rounded-lg">Cancel</button>
                    <button onClick={handlePost} disabled={!newPostContent.trim()} className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity ${theme.bg}`}>Post</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feed */}
          {posts.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <p className="text-3xl mb-2">✝️</p>
              <p className="font-semibold">No posts yet</p>
              <p className="text-sm mt-1">Be the first to share something with the community.</p>
            </div>
          )}
          {posts.map(post => (
            <PostCard key={post.id} post={post} uid={uid} displayName={displayName}
              isPrivileged={isPrivileged} theme={theme}
              onReact={handleReact} onAddComment={handleAddComment}
              onEdit={handleEdit} onDelete={handleDelete}
            />
          ))}
        </div>

        {/* RIGHT — DM */}
        <div className="lg:col-span-1 order-2 lg:order-3">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col h-[420px] lg:h-[620px] lg:sticky lg:top-20 shadow-sm">
            <div className={`p-4 ${theme.bg} text-white flex justify-between items-center`}>
              <h2 className="font-bold text-sm flex items-center gap-2"><MessageCircle size={16}/> Direct Messages</h2>
              <button className="text-white/80 hover:text-white"><Plus size={18}/></button>
            </div>
            <div className="p-2 bg-stone-50 border-b border-stone-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 h-3.5 w-3.5"/>
                <input type="text" placeholder="Search…" className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:border-teal-500"/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {contacts.length === 0 && <p className="text-xs text-stone-400 p-4 text-center">No contacts with phone numbers yet.</p>}
              {contacts.map(contact => (
                <div key={contact.id} onClick={() => setActiveChat(contact)}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${activeChat?.id === contact.id ? `${theme.light}` : 'hover:bg-stone-50'}`}>
                  <div className="relative shrink-0">
                    <Avatar name={contact.name} size={9}/>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{contact.name}</p>
                    <p className="text-[11px] text-stone-500 font-mono truncate">{contact.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
    {/* Chat popup — rendered outside animate-in so position:fixed isn't broken by parent transform */}
    {activeChat && (
      <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-4 sm:right-8 sm:w-[340px] bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 flex flex-col overflow-hidden">
          <div className={`${theme.bg} p-3 text-white flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <Avatar name={activeChat.name} size={8}/>
              <div>
                <p className="font-bold text-sm">{activeChat.name}</p>
                <p className="text-[10px] opacity-80 font-mono">{activeChat.phone}</p>
              </div>
            </div>
            <button onClick={() => setActiveChat(null)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20"><X size={18}/></button>
          </div>
          <div className="h-72 bg-[#e5ddd5] p-3 overflow-y-auto flex flex-col gap-2">
            <div className="text-[9px] text-center text-stone-500 uppercase tracking-widest mb-1 font-semibold">End-to-end encrypted</div>
            {(chatMessagesByContact[String(activeChat.id)] || []).map(msg => (
              <div key={msg.id} className={`max-w-[82%] text-sm px-3 py-2 rounded-2xl shadow-sm ${msg.fromUs ? `self-end ${theme.light} ${theme.color} rounded-tr-none` : 'self-start bg-white text-stone-800 rounded-tl-none'}`}>
                {msg.text}
                <div className="text-[9px] opacity-60 mt-0.5 text-right">{msg.time}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChat} className="p-2 bg-stone-50 border-t border-stone-100 flex gap-2 items-center">
            <input type="text" className="flex-1 px-3 py-2 border border-stone-200 rounded-full text-sm outline-none focus:border-teal-500"
              placeholder={chatLoading ? 'Loading…' : 'Message'} value={chatInput} onChange={e => setChatInput(e.target.value)}/>
            <button type="submit" disabled={!chatInput.trim()} className={`${theme.bg} text-white p-2 rounded-full disabled:opacity-40`}>
              <Send size={15}/>
            </button>
          </form>
      </div>
    )}
    </>
  );
}
