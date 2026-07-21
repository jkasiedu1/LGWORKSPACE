import { useState } from 'react';
import { Plus, Calendar as CalendarIcon, Trash2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { db } from '../config/firebase';
import { createEvent, deleteEvent, updateEvent } from '../lib/firestoreServices';
import { validateCalendarEvent } from '../lib/validation';
import { useAuth } from '../hooks/useAuth';

export default function CalendarApp({ theme, events, setEvents, isAdmin, showToast }) {
  const { user } = useAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: '', date: today.toISOString().split('T')[0], time: '10:00', type: 'Meeting' });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const sortedEvents = [...events].sort((a, b) => {
    const left = `${a.date || ''} ${a.time || ''}`;
    const right = `${b.date || ''} ${b.time || ''}`;
    return left.localeCompare(right);
  });

  const handleAddEvent = async () => {
    const validationResult = validateCalendarEvent(newEvent);
    if (!validationResult.valid) {
      showToast(validationResult.message);
      return;
    }

    try {
      const createdEvent = await createEvent(newEvent, user?.email);

      if (!db) {
        setEvents([...events, { id: createdEvent.id, ...newEvent }]);
      }

      setIsAdding(false);
      showToast('Event Scheduled');
      setNewEvent({ title: '', date: today.toISOString().split('T')[0], time: '10:00', type: 'Meeting' });
    } catch (error) {
      console.error(error);
      showToast('Failed to schedule event.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    const validationResult = validateCalendarEvent(editingEvent);
    if (!validationResult.valid) {
      showToast(validationResult.message);
      return;
    }
    try {
      await updateEvent(String(editingEvent.id), editingEvent, user?.email);
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? editingEvent : e));
      showToast('Event updated');
      setEditingEvent(null);
    } catch (error) {
      console.error('[CalendarApp] Failed to update event:', error);
      showToast('Failed to update event.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!isAdmin) return;

    const eventToDelete = events.find((event) => event.id === eventId);
    if (!eventToDelete) return;

    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    try {
      await deleteEvent(String(eventId), eventToDelete, user?.email);
      showToast('Event removed');
    } catch (error) {
      console.error('[CalendarApp] Failed to remove event:', error);
      setEvents((prev) => [eventToDelete, ...prev]);
      showToast('Failed to remove event.');
    }
  };

  const EVENT_TYPES = ['Meeting', 'Service', 'Conference', 'Prayer', 'Youth', 'Outreach', 'Rehearsal', 'Other'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Master Calendar</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={prevMonth} className="p-1 rounded-md hover:bg-stone-100 text-stone-500 transition-colors"><ChevronLeft size={16} /></button>
            <p className="text-stone-500 text-sm font-medium min-w-[160px] text-center">{monthLabel}</p>
            <button onClick={nextMonth} className="p-1 rounded-md hover:bg-stone-100 text-stone-500 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setIsAdding(true)} className="px-4 py-2.5 bg-stone-900 text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus size={16}/> New Event
          </button>
        )}
      </div>

      {(isAdding || editingEvent) && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="text-orange-500"/>
              {editingEvent ? 'Edit Event' : 'Schedule Event'}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event Title"
                className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500"
                value={editingEvent ? editingEvent.title : newEvent.title}
                onChange={e => editingEvent ? setEditingEvent({...editingEvent, title: e.target.value}) : setNewEvent({...newEvent, title: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600"
                  value={editingEvent ? editingEvent.date : newEvent.date}
                  onChange={e => editingEvent ? setEditingEvent({...editingEvent, date: e.target.value}) : setNewEvent({...newEvent, date: e.target.value})}
                />
                <input
                  type="time"
                  className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600"
                  value={editingEvent ? editingEvent.time : newEvent.time}
                  onChange={e => editingEvent ? setEditingEvent({...editingEvent, time: e.target.value}) : setNewEvent({...newEvent, time: e.target.value})}
                />
              </div>
              <select
                className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600"
                value={editingEvent ? editingEvent.type : newEvent.type}
                onChange={e => editingEvent ? setEditingEvent({...editingEvent, type: e.target.value}) : setNewEvent({...newEvent, type: e.target.value})}
              >
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setIsAdding(false); setEditingEvent(null); }} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button
                  onClick={editingEvent ? handleSaveEdit : handleAddEvent}
                  className="px-4 py-2 bg-stone-900 text-white rounded-md font-medium text-sm hover:opacity-90"
                >
                  {editingEvent ? 'Save Changes' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="block lg:hidden space-y-3">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => (
            <div key={`mobile-${event.id}`} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">{event.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">{event.date} {event.time ? `• ${event.time}` : ''}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${theme.light} ${theme.color} font-bold uppercase tracking-wider`}>{event.type || 'Event'}</span>
              </div>
              {isAdmin && (
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => setEditingEvent({...event})} className="text-xs font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1"><Pencil size={12} /> Edit</button>
                  <button onClick={() => handleDeleteEvent(event.id)} className="text-xs font-semibold text-rose-700 hover:text-rose-800 inline-flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-sm text-stone-500">No events this month.</div>
        )}
      </div>

      <div className="hidden lg:block bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6 bg-stone-200 gap-px">
          {Array.from({ length: 42 }).map((_, i) => {
            const dayNum = i - firstDayOfMonth + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
            const formattedDate = isCurrentMonth ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}` : null;
            const daysEvents = events.filter(e => e.date === formattedDate);
            const isToday = isCurrentMonth && dayNum === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

            return (
              <div key={i} className={`min-h-[110px] p-2 ${isCurrentMonth ? 'bg-white hover:bg-stone-50' : 'bg-stone-50'} transition-colors`}>
                <span className={`text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-orange-500 text-white' : isCurrentMonth ? 'text-stone-700' : 'text-stone-300'}`}>
                  {isCurrentMonth ? dayNum : ''}
                </span>
                <div className="mt-1 space-y-1">
                  {daysEvents.map(event => (
                    <div key={event.id} className={`text-[10px] px-2 py-1 rounded bg-orange-50 border-l-2 ${theme.border} font-bold text-orange-700 shadow-sm group relative`} title={`${event.time} - ${event.title}`}>
                      <div className="truncate">{event.time} - {event.title}</div>
                      {isAdmin && (
                        <div className="hidden group-hover:flex items-center gap-1 mt-0.5">
                          <button onClick={() => setEditingEvent({...event})} className="text-[9px] text-sky-700 hover:text-sky-800">Edit</button>
                          <span className="text-stone-300">·</span>
                          <button onClick={() => handleDeleteEvent(event.id)} className="text-[9px] text-rose-700 hover:text-rose-800">Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
