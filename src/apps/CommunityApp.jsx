import { useEffect, useRef, useState } from 'react';
import {
  Globe, Users, Calendar as CalendarIcon, Plus, Search, MoreHorizontal,
  ThumbsUp, MessageCircle, Image as ImageIcon, Send, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  createCommunityMessage,
  createCommunityPost,
  deleteCommunityPost,
  updateCommunityPost
} from '../lib/firestoreServices';
import { uploadMediaToR2 } from '../lib/mediaStorage';
import { db } from '../config/firebase';

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CommunityApp({ theme, people, posts = [], setPosts, showToast, user, roleAccess = {} }) {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'You';
  const roleLabel = roleAccess?.isSeniorPastor ? 'Senior Pastor' : roleAccess?.isAdmin ? 'Admin' : 'Volunteer';
  const myInitials = getInitials(displayName);
  const [newPostContent, setNewPostContent] = useState('');
  const [actionMenuPostId, setActionMenuPostId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessagesByContact, setChatMessagesByContact] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const photoInputRef = useRef(null);

  const contacts = people.filter(p => p.phone && p.type !== 'Child');

  useEffect(() => {
    if (!activeChat?.id || !db) return undefined;

    setChatLoading(true);
    const threadId = String(activeChat.id);
    const messagesQuery = query(
      collection(db, 'communityMessages'),
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((messageDoc) => {
          const data = messageDoc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
          return {
            id: messageDoc.id,
            text: data.text || '',
            fromUs: Boolean(data.fromUs),
            time: createdAt
              ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : data.time || 'Now',
          };
        });
        setChatMessagesByContact((prev) => ({ ...prev, [threadId]: messages }));
        setChatLoading(false);
      },
      (error) => {
        console.error('[CommunityApp] Failed to subscribe to chat thread:', error);
        setChatLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeChat?.id]);

  const handlePost = async () => {
    const content = newPostContent.trim();
    if (!content) return;

    const tempId = `temp-post-${Date.now()}`;
    const optimisticPost = {
      id: tempId,
      author: displayName,
      role: roleLabel,
      time: 'Just now',
      content,
      likes: 0,
      comments: 0,
      commentList: [],
    };

    setPosts([optimisticPost, ...posts]);
    setNewPostContent('');

    try {
      const created = await createCommunityPost({
        author: displayName,
        role: roleLabel,
        time: 'Just now',
        content,
        likes: 0,
        comments: 0,
        commentList: [],
      });
      setPosts((prev) => prev.map((post) => (post.id === tempId ? created : post)));
      showToast('Posted to Community Feed');
    } catch (error) {
      console.error('[CommunityApp] Failed to create post:', error);
      setPosts((prev) => prev.filter((post) => post.id !== tempId));
      showToast('Failed to post update');
    }
  };

  const handleLike = async (postId) => {
    const targetPost = posts.find((post) => post.id === postId);
    if (!targetPost) return;
    const nextLikes = (targetPost.likes || 0) + 1;
    setPosts(posts.map((post) => (post.id === postId ? { ...post, likes: nextLikes } : post)));
    if (typeof postId === 'string') {
      try {
        await updateCommunityPost(postId, { likes: nextLikes });
      } catch (error) {
        console.error('[CommunityApp] Failed to like post:', error);
      }
    }
  };

  const handleToggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    const targetPost = posts.find((post) => post.id === postId);
    if (!targetPost) return;
    const nextComments = (targetPost.comments || 0) + 1;
    const nextCommentList = [...(targetPost.commentList || []), { id: Date.now(), author: displayName, text }];
    setPosts(posts.map(p => {
      if (p.id !== postId) return p;
      return { ...p, comments: nextComments, commentList: nextCommentList };
    }));
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    if (typeof postId === 'string') {
      try {
        await updateCommunityPost(postId, { comments: nextComments, commentList: nextCommentList });
      } catch (error) {
        console.error('[CommunityApp] Failed to save comment:', error);
      }
    }
  };

  const handlePhotoVideo = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mediaMeta = await uploadMediaToR2(file, 'community');
      const post = {
        author: displayName,
        role: roleLabel,
        time: 'Just now',
        content: newPostContent.trim(),
        likes: 0,
        comments: 0,
        commentList: [],
        ...mediaMeta,
      };

      const created = await createCommunityPost(post);
      setPosts([created, ...posts]);
      setNewPostContent('');
      showToast(mediaMeta.mediaType === 'video' ? 'Video posted to Community Feed' : 'Photo posted to Community Feed');
    } catch (error) {
      console.error('[CommunityApp] Failed to post media:', error);
      showToast(error?.message || 'Failed to post media');
    }

    e.target.value = '';
  };

  const handleOpenEdit = (post) => {
    setActionMenuPostId(null);
    setEditingPostId(post.id);
    setEditContent(post.content || '');
  };

  const handleSaveEdit = async (postId) => {
    const nextContent = editContent.trim();
    setPosts(posts.map(p => (
      p.id === postId ? { ...p, content: nextContent, time: 'Just now (edited)' } : p
    )));
    if (typeof postId === 'string') {
      try {
        await updateCommunityPost(postId, { content: nextContent, time: 'Just now (edited)' });
      } catch (error) {
        console.error('[CommunityApp] Failed to update post:', error);
      }
    }
    setEditingPostId(null);
    setEditContent('');
    showToast('Post updated');
  };

  const handleDeletePost = async (postId) => {
    const postToDelete = posts.find(p => p.id === postId);
    if (typeof postId === 'string') {
      try {
        await deleteCommunityPost(postId);
      } catch (error) {
        console.error('[CommunityApp] Failed to delete post:', error);
        showToast('Failed to delete post');
        return;
      }
    }
    setPosts(posts.filter(p => p.id !== postId));
    setActionMenuPostId(null);
    if (editingPostId === postId) {
      setEditingPostId(null);
      setEditContent('');
    }
    showToast('Post deleted');
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeChat?.id) return;

    const threadId = String(activeChat.id);
    const tempId = `temp-chat-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text,
      fromUs: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessagesByContact((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), optimisticMessage],
    }));
    setChatInput('');

    try {
      await createCommunityMessage({
        threadId,
        contactId: threadId,
        contactName: activeChat.name,
        text,
        fromUs: true,
      });
      setChatMessagesByContact((prev) => ({
        ...prev,
        [threadId]: (prev[threadId] || []).filter((message) => message.id !== tempId),
      }));
    } catch (error) {
      console.error('[CommunityApp] Failed to send chat message:', error);
      setChatMessagesByContact((prev) => ({
        ...prev,
        [threadId]: (prev[threadId] || []).filter((message) => message.id !== tempId),
      }));
      showToast('Message failed to send. Please retry.');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 text-left h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Church Community</h1>
          <p className="text-stone-500 text-sm mt-1">Connect, share updates, and message members directly via their linked phone numbers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT NAV */}
        <div className="hidden lg:flex flex-col gap-2">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${theme.bg} text-white`}>{myInitials}</div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">{displayName}</h3>
              <p className="text-xs text-stone-500">{roleLabel}</p>
            </div>
          </div>
          <button className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme.light} ${theme.color} flex items-center gap-3`}><Globe size={18}/> News Feed</button>
          <button className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors flex items-center gap-3"><Users size={18}/> Groups &amp; Ministries</button>
          <button className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors flex items-center gap-3"><CalendarIcon size={18}/> Events</button>
        </div>

        {/* CENTER FEED */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${theme.bg} text-white`}>{myInitials}</div>
              <textarea
                placeholder="Share an update, praise report, or prayer request..."
                className="w-full resize-none outline-none text-stone-700 placeholder:text-stone-400 pt-2 text-sm"
                rows="2"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-stone-100">
              <input ref={photoInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePhotoSelected} />
              <button onClick={handlePhotoVideo} className="text-stone-500 hover:bg-stone-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors">
                <ImageIcon size={16} className="text-emerald-500"/> Photo/Video
              </button>
              <button onClick={handlePost} disabled={!newPostContent.trim()} className={`px-4 py-1.5 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-50 ${theme.bg}`}>Post</button>
            </div>
          </div>

          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-sm">{post.author.charAt(0)}</div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm leading-tight">{post.author}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-stone-600">{post.role}</span>
                      <span>•</span>
                      <span>{post.time}</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <button onClick={() => setActionMenuPostId(actionMenuPostId === post.id ? null : post.id)} className="text-stone-400 hover:text-stone-600"><MoreHorizontal size={18}/></button>
                  {actionMenuPostId === post.id && (
                    <div className="absolute right-0 mt-1 w-28 bg-white border border-stone-200 rounded-lg shadow-lg z-20 overflow-hidden">
                      <button onClick={() => handleOpenEdit(post)} className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Edit</button>
                      <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                    </div>
                  )}
                </div>
              </div>
              {editingPostId === post.id ? (
                <div className="px-4 pb-4">
                  <textarea
                    rows="3"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full resize-none border border-stone-200 rounded-lg p-3 text-sm outline-none focus:border-teal-500"
                    placeholder="Update your post..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => { setEditingPostId(null); setEditContent(''); }} className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-md">Cancel</button>
                    <button onClick={() => handleSaveEdit(post.id)} className={`px-3 py-1.5 text-xs font-semibold text-white rounded-md ${theme.bg}`}>Save</button>
                  </div>
                </div>
              ) : post.content ? (
                <div className="px-4 pb-3 text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{post.content}</div>
              ) : null}
              {post.mediaUrl && post.mediaType === 'image' && (
                <div className="px-4 pb-4">
                  <img
                    src={post.mediaUrl}
                    alt={post.mediaName || 'Uploaded post image'}
                    className="w-full rounded-xl border border-stone-200 max-h-[460px] object-cover"
                  />
                </div>
              )}
              {post.mediaUrl && post.mediaType === 'video' && (
                <div className="px-4 pb-4">
                  <video
                    src={post.mediaUrl}
                    controls
                    className="w-full rounded-xl border border-stone-200 max-h-[460px] bg-black"
                  />
                </div>
              )}
              <div className="px-4 py-2 border-t border-stone-100 flex justify-between text-xs text-stone-500">
                <span>{post.likes} Likes</span>
                <span>{post.comments} Comments</span>
              </div>
              <div className="px-2 py-1.5 border-t border-stone-100 flex justify-between">
                <button onClick={() => handleLike(post.id)} className="flex-1 flex justify-center items-center gap-2 py-2 text-stone-500 hover:bg-stone-50 hover:text-teal-600 rounded-md font-semibold text-xs transition-colors"><ThumbsUp size={16}/> Like</button>
                <button onClick={() => handleToggleComments(post.id)} className="flex-1 flex justify-center items-center gap-2 py-2 text-stone-500 hover:bg-stone-50 hover:text-teal-600 rounded-md font-semibold text-xs transition-colors">
                  <MessageCircle size={16}/> Comment {expandedComments[post.id] ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                </button>
              </div>
              {expandedComments[post.id] && (
                <div className="px-4 pb-3 border-t border-stone-100 space-y-2 pt-2">
                  {(post.commentList || []).map(c => (
                    <div key={c.id} className="flex gap-2 text-xs">
                      <span className="font-bold text-stone-700">{c.author}:</span>
                      <span className="text-stone-600">{c.text}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input type="text" placeholder="Write a comment…" className="flex-1 text-xs border border-stone-200 rounded-full px-3 py-1.5 outline-none focus:border-teal-500" value={commentInputs[post.id] || ''} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id); }} />
                    <button onClick={() => handleAddComment(post.id)} className="text-teal-600 hover:text-teal-800"><Send size={14}/></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* RIGHT SIDEBAR – DM / WhatsApp style */}
        <div className="lg:col-span-1 order-2 lg:order-3">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[420px] lg:h-[600px] lg:sticky lg:top-20">
            <div className="p-4 bg-teal-600 text-white flex justify-between items-center">
              <h2 className="font-bold text-sm flex items-center gap-2"><MessageCircle size={18}/> Direct Messages</h2>
              <button className="text-white/80 hover:text-white"><Plus size={18}/></button>
            </div>
            <div className="p-3 bg-stone-50 border-b border-stone-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 h-3.5 w-3.5" />
                <input type="text" placeholder="Search a number or name..." className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-md text-xs outline-none focus:border-teal-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {contacts.map(contact => (
                <div key={contact.id} onClick={() => setActiveChat(contact)} className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${activeChat?.id === contact.id ? 'bg-teal-50' : 'hover:bg-stone-50'}`}>
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center shrink-0 text-stone-500 font-bold text-sm relative">
                    {contact.name.charAt(0)}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-sm font-bold text-stone-900 truncate">{contact.name}</h4>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate font-mono tracking-tight">{contact.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CHAT POPUP */}
      {activeChat && (
        <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-4 sm:right-8 sm:w-[340px] bg-white rounded-xl shadow-2xl border border-stone-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
          <div className="bg-teal-600 p-3 text-white flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">{activeChat.name.charAt(0)}</div>
              <div>
                <div className="font-bold text-sm leading-tight">{activeChat.name}</div>
                <div className="text-[10px] opacity-90 font-mono mt-0.5">{activeChat.phone}</div>
              </div>
            </div>
            <button onClick={() => setActiveChat(null)} className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/20 transition-colors"><X size={18}/></button>
          </div>
          <div className="h-72 sm:h-72 bg-[#efeae2] p-4 overflow-y-auto flex flex-col gap-3">
            <div className="bg-emerald-100 text-emerald-700 text-[10px] text-center py-1 px-3 rounded-full mx-auto shadow-sm mb-2 uppercase font-bold tracking-wider">Messages are end-to-end encrypted</div>
            {(chatMessagesByContact[String(activeChat.id)] || []).map(msg => (
              <div key={msg.id} className={`${msg.fromUs ? 'self-end bg-emerald-100 text-emerald-700' : 'self-start bg-white text-stone-800'} p-2.5 rounded-lg ${msg.fromUs ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-[85%] text-sm shadow-sm border border-stone-100`}>
                {msg.text}
                <div className="text-[9px] text-stone-400 mt-1 text-right">{msg.time}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChat} className="p-2.5 bg-stone-50 border-t border-stone-200 flex gap-2 items-center">
            <button type="button" className="text-stone-400 hover:text-teal-600 p-1"><Plus size={20}/></button>
            <input type="text" className="flex-1 px-3 py-2 border border-stone-200 rounded-full text-sm outline-none focus:border-teal-500 shadow-inner" placeholder={chatLoading ? 'Loading messages...' : 'Message'} value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit" disabled={!chatInput.trim()} className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              <Send size={16} className="ml-0.5"/>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
