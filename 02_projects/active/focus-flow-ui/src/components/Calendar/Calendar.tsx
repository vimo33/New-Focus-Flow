import { useState, useEffect } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
} from 'date-fns';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color: 'primary' | 'emerald' | 'rose' | 'indigo' | 'amber' | 'teal';
  type: 'task' | 'event' | 'focus-block';
  isActive?: boolean;
  projectName?: string;
}

interface TimeSlot {
  hour: number;
  label: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const TIME_SLOTS: TimeSlot[] = Array.from({ length: 13 }, (_, i) => ({
  hour: i + 9, // Start at 9 AM
  label: `${String(i + 9).padStart(2, '0')}:00`,
}));

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getColorClasses = (color: CalendarEvent['color']) => {
  switch (color) {
    case 'primary':
      return 'bg-primary text-white shadow-lg shadow-primary/20 ring-1 ring-white/20';
    case 'emerald':
      return 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-300';
    case 'rose':
      return 'bg-rose-500/10 dark:bg-rose-500/20 border-l-4 border-rose-500 text-rose-700 dark:text-rose-300';
    case 'indigo':
      return 'bg-indigo-500/10 dark:bg-indigo-500/20 border-l-4 border-indigo-500 text-indigo-700 dark:text-indigo-300';
    case 'amber':
      return 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 text-amber-700 dark:text-amber-300';
    case 'teal':
      return 'bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/50 border-dashed text-teal-700 dark:text-teal-300';
    default:
      return 'bg-slate-200 dark:bg-surface-dark border border-slate-300 dark:border-border-dark text-slate-700 dark:text-slate-300';
  }
};

const getTimeClasses = (color: CalendarEvent['color']) => {
  switch (color) {
    case 'primary':
      return 'text-blue-100 opacity-90';
    case 'emerald':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'rose':
      return 'text-rose-600 dark:text-rose-400';
    case 'indigo':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'amber':
      return 'text-amber-600 dark:text-amber-400';
    case 'teal':
      return 'text-teal-600 dark:text-teal-400';
    default:
      return 'text-slate-500 dark:text-slate-500';
  }
};

const calculateEventPosition = (startTime: Date, endTime: Date) => {
  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();

  // Each hour slot is 80px (h-20 = 5rem = 80px)
  const pixelsPerHour = 80;
  const pixelsPerMinute = pixelsPerHour / 60;

  // Calculate top position (offset from 9 AM)
  const offsetHours = startHour - 9;
  const top = offsetHours * pixelsPerHour + startMinute * pixelsPerMinute;

  // Calculate height
  const durationMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);
  const height = durationMinutes * pixelsPerMinute;

  return { top: `${top}px`, height: `${height}px` };
};

const getCurrentTimePosition = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour < 9 || currentHour >= 22) return null;

  const pixelsPerHour = 80;
  const pixelsPerMinute = pixelsPerHour / 60;
  const offsetHours = currentHour - 9;
  const top = offsetHours * pixelsPerHour + currentMinute * pixelsPerMinute;

  return `${top}px`;
};

// ============================================================================
// Sub-components
// ============================================================================

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSave: (event: Partial<CalendarEvent>) => void;
}

function EventModal({ isOpen, onClose, selectedDate, onSave }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<'event' | 'task' | 'reminder'>('event');
  const [startTime, setStartTime] = useState('12:30');
  const [endTime, setEndTime] = useState('13:30');

  if (!isOpen || !selectedDate) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = setMinutes(setHours(selectedDate, startHour), startMinute);
    const end = setMinutes(setHours(selectedDate, endHour), endMinute);

    onSave({
      title,
      startTime: start,
      endTime: end,
      color: eventType === 'event' ? 'indigo' : eventType === 'task' ? 'emerald' : 'amber',
      type: eventType === 'reminder' ? 'event' : eventType,
    });

    setTitle('');
    setStartTime('12:30');
    setEndTime('13:30');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      data-testid="event-modal-overlay"
    >
      <div
        className="w-80 bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-slate-200 dark:border-border-dark p-4"
        onClick={(e) => e.stopPropagation()}
        data-testid="event-modal"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">Quick Add</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            data-testid="event-modal-close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <input
          className="w-full mb-3 bg-transparent border-b border-slate-200 dark:border-border-dark pb-1 text-lg font-medium focus:outline-none focus:border-primary placeholder-slate-400"
          placeholder="Add title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="event-title-input"
          autoFocus
        />

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setEventType('event')}
            className={`px-2 py-1 text-xs rounded font-medium ${
              eventType === 'event'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 cursor-pointer'
            }`}
            data-testid="event-type-event"
          >
            Event
          </button>
          <button
            onClick={() => setEventType('task')}
            className={`px-2 py-1 text-xs rounded font-medium ${
              eventType === 'task'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 cursor-pointer'
            }`}
            data-testid="event-type-task"
          >
            Task
          </button>
          <button
            onClick={() => setEventType('reminder')}
            className={`px-2 py-1 text-xs rounded font-medium ${
              eventType === 'reminder'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 cursor-pointer'
            }`}
            data-testid="event-type-reminder"
          >
            Reminder
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          <span>{format(selectedDate, 'EEE, MMM d')}</span>
          <span>•</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-transparent border-none outline-none text-xs"
            data-testid="event-start-time"
          />
          <span>-</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-transparent border-none outline-none text-xs"
            data-testid="event-end-time"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            data-testid="event-modal-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-blue-600"
            data-testid="event-modal-save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface CalendarEventCardProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
}

function CalendarEventCard({ event, onEventClick }: CalendarEventCardProps) {
  const position = calculateEventPosition(event.startTime, event.endTime);
  const colorClasses = getColorClasses(event.color);
  const timeClasses = getTimeClasses(event.color);

  return (
    <div
      className={`absolute left-1 right-1 rounded-md px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity ${colorClasses}`}
      style={position}
      onClick={() => onEventClick?.(event)}
      data-testid={`calendar-event-${event.id}`}
    >
      <div className="flex justify-between items-start mb-0.5">
        <p className="text-xs font-bold leading-tight">{event.title}</p>
        {event.isActive && (
          <span className="bg-white/20 p-0.5 rounded text-[10px]">Active</span>
        )}
      </div>
      <p className={`text-[10px] ${timeClasses} mt-0.5`}>
        {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
      </p>
      {event.projectName && event.color === 'primary' && (
        <p className="text-xs text-blue-100 mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">folder</span>
          {event.projectName}
        </p>
      )}
      {event.description && event.color !== 'primary' && (
        <p className={`text-[10px] ${timeClasses} mt-2 line-clamp-2 leading-tight`}>
          {event.description}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function Calendar() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<string | null>(getCurrentTimePosition());

  useEffect(() => {
    loadScheduledTasks();

    // Update current time indicator every minute
    const interval = setInterval(() => {
      setCurrentTimeTop(getCurrentTimePosition());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadScheduledTasks = async () => {
    setLoading(true);
    try {
      // Fetch scheduled tasks from API
      const response = await api.getTasks('scheduled');

      // Convert tasks to calendar events
      const taskEvents: CalendarEvent[] = response.tasks
        .filter(task => task.due_date)
        .map(task => {
          // Parse due_date and create event times
          const dueDate = new Date(task.due_date!);
          const startTime = setHours(setMinutes(dueDate, 0), 9); // Default to 9 AM
          const endTime = setHours(setMinutes(dueDate, 0), 10); // Default 1 hour duration

          return {
            id: task.id,
            title: task.title,
            description: task.description,
            startTime,
            endTime,
            color: (task.priority === 'high' ? 'emerald' : 'indigo') as CalendarEvent['color'],
            type: 'task' as const,
            projectName: task.metadata?.project_name,
          };
        });

      setEvents(taskEvents);
    } catch (error) {
      console.error('Failed to load scheduled tasks:', error);
      // Set demo events on error
      setEvents(getDemoEvents());
    } finally {
      setLoading(false);
    }
  };

  // Demo events for UI demonstration
  const getDemoEvents = (): CalendarEvent[] => {
    const monday = addDays(weekStart, 0);
    const tuesday = addDays(weekStart, 1);
    const wednesday = addDays(weekStart, 2);
    const thursday = addDays(weekStart, 3);
    const friday = addDays(weekStart, 4);
    const saturday = addDays(weekStart, 5);

    return [
      {
        id: '1',
        title: 'Focus Block',
        startTime: setHours(setMinutes(monday, 0), 9),
        endTime: setHours(setMinutes(monday, 0), 10),
        color: 'indigo',
        type: 'focus-block',
      },
      {
        id: '2',
        title: 'Q3 Report Analysis',
        startTime: setHours(setMinutes(monday, 0), 13),
        endTime: setHours(setMinutes(monday, 15), 14),
        color: 'emerald',
        type: 'task',
      },
      {
        id: '3',
        title: 'Design Review',
        startTime: setHours(setMinutes(tuesday, 0), 10),
        endTime: setHours(setMinutes(tuesday, 45), 10),
        color: 'indigo',
        type: 'event',
      },
      {
        id: '4',
        title: 'Team Sync',
        startTime: setHours(setMinutes(wednesday, 0), 10),
        endTime: setHours(setMinutes(wednesday, 45), 10),
        color: 'rose',
        type: 'event',
      },
      {
        id: '5',
        title: 'Deep Work: Coding',
        startTime: setHours(setMinutes(wednesday, 0), 13),
        endTime: setHours(setMinutes(wednesday, 0), 15),
        color: 'primary',
        type: 'focus-block',
        isActive: isToday(wednesday),
        projectName: 'Project Alpha',
      },
      {
        id: '6',
        title: 'Sprint Planning',
        description: 'Review backlog items and assign priority for next week.',
        startTime: setHours(setMinutes(thursday, 0), 9),
        endTime: setHours(setMinutes(thursday, 0), 11),
        color: 'indigo',
        type: 'event',
      },
      {
        id: '7',
        title: 'Client Review',
        startTime: setHours(setMinutes(friday, 0), 14),
        endTime: setHours(setMinutes(friday, 0), 15),
        color: 'amber',
        type: 'event',
      },
      {
        id: '8',
        title: 'Hiking Trip',
        startTime: setHours(setMinutes(saturday, 0), 13),
        endTime: setHours(setMinutes(saturday, 0), 15),
        color: 'teal',
        type: 'event',
      },
    ];
  };

  const handlePreviousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const handleToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  const handleCreateEvent = () => {
    setSelectedDate(new Date());
    setIsModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: eventData.title || 'New Event',
      startTime: eventData.startTime || new Date(),
      endTime: eventData.endTime || new Date(),
      color: eventData.color || 'indigo',
      type: eventData.type || 'event',
    };

    setEvents(prev => [...prev, newEvent]);
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.startTime, date));
  };

  const weekDays = getWeekDays();
  const currentMonthYear = format(weekStart, 'MMMM yyyy');

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-background-light dark:bg-background-dark" data-testid="calendar">
      {/* Header Control Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark z-10">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold tracking-tight">{currentMonthYear}</h2>
          <div className="flex items-center bg-slate-100 dark:bg-surface-dark rounded-lg p-1 border border-slate-200 dark:border-border-dark">
            <button
              onClick={handlePreviousWeek}
              className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md text-slate-600 dark:text-slate-400 transition-colors"
              data-testid="calendar-prev-week"
              aria-label="Previous week"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              data-testid="calendar-today"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md text-slate-600 dark:text-slate-400 transition-colors"
              data-testid="calendar-next-week"
              aria-label="Next week"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">
              search
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-surface-dark border-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-64 placeholder-slate-500"
              placeholder="Search events..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="calendar-search"
            />
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-border-dark mx-2"></div>
          <button
            onClick={handleCreateEvent}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-primary/25"
            data-testid="create-event-button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="hidden sm:inline">Create Event</span>
          </button>
        </div>
      </header>

      {/* Calendar Grid Container */}
      <div className="flex flex-1 overflow-auto relative flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-[60px_1fr] sticky top-0 z-20 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-border-dark shadow-sm">
          <div className="p-4 text-xs font-medium text-slate-400 dark:text-slate-500 text-center border-r border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark">
            GMT-5
          </div>
          <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-border-dark bg-white dark:bg-surface-dark">
            {weekDays.map((day, idx) => {
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={idx}
                  className={`p-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                    isCurrentDay ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                  data-testid={`calendar-day-header-${idx}`}
                >
                  <p
                    className={`text-xs font-medium uppercase mb-1 ${
                      isCurrentDay ? 'text-primary font-bold' : 'text-slate-500'
                    }`}
                  >
                    {DAYS_OF_WEEK[idx]}
                  </p>
                  {isCurrentDay ? (
                    <div className="size-8 bg-primary text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-primary/30">
                      <p className="text-lg font-bold">{format(day, 'd')}</p>
                    </div>
                  ) : (
                    <p className={`text-lg font-semibold ${idx >= 5 ? 'text-slate-400' : ''}`}>
                      {format(day, 'd')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Grid Body */}
        <div className="flex flex-1 relative min-h-[1000px]">
          {/* Time Axis */}
          <div className="w-[60px] flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark">
            {TIME_SLOTS.map((slot) => (
              <div key={slot.hour} className="h-20 border-b border-transparent relative group">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-background-light dark:bg-background-dark px-1">
                  {slot.label}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200 dark:divide-border-dark relative">
            {/* Horizontal Grid Lines (Overlay) */}
            <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot.hour}
                  className="h-20 border-b border-slate-200 dark:border-border-dark"
                ></div>
              ))}
            </div>

            {/* Current Time Indicator Line */}
            {currentTimeTop && isToday(weekStart) && (
              <div
                className="absolute left-0 w-full flex items-center z-20 pointer-events-none"
                style={{ top: currentTimeTop }}
              >
                <div className="h-[2px] w-full bg-primary shadow-[0_0_4px_rgba(19,127,236,0.6)]"></div>
                <div className="absolute -left-1.5 size-3 bg-primary rounded-full ring-2 ring-white dark:ring-background-dark"></div>
              </div>
            )}

            {/* Day Columns */}
            {weekDays.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              const isWeekend = dayIdx >= 5;

              return (
                <div
                  key={dayIdx}
                  className={`relative p-1 ${isCurrentDay ? 'bg-primary/5' : ''} ${
                    isWeekend ? 'bg-slate-50/50 dark:bg-black/20' : ''
                  }`}
                  data-testid={`calendar-day-column-${dayIdx}`}
                >
                  {dayEvents.map((event) => (
                    <CalendarEventCard key={event.id} event={event} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        onSave={handleSaveEvent}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-dark rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Loading calendar...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
export { Calendar };
