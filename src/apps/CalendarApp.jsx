import { useState } from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { db } from '../config/firebase';
import { createEvent } from '../lib/firestoreServices';
import { validateCalendarEvent } from '../lib/validation';
import { useAuth } from '../hooks/useAuth';

export default function CalendarApp({ theme, events, setEvents, isAdmin, showToast }) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Meeting' });

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
      setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Meeting' });
    } catch (error) {
      console.error(error);
      showToast('Failed to schedule event.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Master Calendar</h1>
          <p className="text-stone-500 text-sm mt-1">{monthLabel}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsAdding(true)} className={`px-4 py-2.5 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center justify-center gap-2 w-full sm:w-auto`}>
            <Plus size={16}/> New Event
          </button>
        )}
      </div>

      {isAdding && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><CalendarIcon className="text-orange-500"/> Schedule Event</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Event Title" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                <input type="time" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAddEvent} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Event</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="block lg:hidden space-y-3">
        {sortedEvents.length > 0 ? (
          sortedEvents.slice(0, 12).map((event) => (
            <div key={`mobile-${event.id}`} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">{event.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">{event.date} {event.time ? `• ${event.time}` : ''}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${theme.light} ${theme.color} font-bold uppercase tracking-wider`}>{event.type || 'Event'}</span>
              </div>
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
        <div className="grid grid-cols-7 grid-rows-5 bg-stone-200 gap-px">
          {Array.from({ length: 35 }).map((_, i) => {
            const dayNum = i - firstDayOfMonth + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
            const formattedDate = isCurrentMonth ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}` : null;
            const daysEvents = events.filter(e => e.date === formattedDate);

            return (
              <div key={i} className={`min-h-[120px] p-2 ${isCurrentMonth ? 'bg-white hover:bg-stone-50' : 'bg-stone-50 text-transparent'} transition-colors`}>
                <span className={`text-sm font-medium ${isCurrentMonth ? 'text-stone-700' : 'text-stone-300'}`}>{isCurrentMonth ? dayNum : ''}</span>
                <div className="mt-1 space-y-1">
                  {daysEvents.map(event => (
                    <div key={event.id} className={`text-[10px] px-2 py-1 rounded bg-orange-50 border-l-2 ${theme.border} truncate font-bold text-orange-700 shadow-sm`} title={`${event.time} - ${event.title}`}>
                      {event.time} - {event.title}
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
