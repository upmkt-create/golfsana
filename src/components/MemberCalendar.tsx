import React, { useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ca';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Task, Project } from '../types';
import { Plus } from 'lucide-react';

moment.updateLocale('ca', {
  week: {
    dow: 1, // Monday is the first day of the week.
  }
});
moment.locale('ca');

// Setup the localizer by providing the moment (or globalize, or Luxon) Object
// to the correct localizer.
const localizer = momentLocalizer(moment);

interface MemberCalendarProps {
  tasks: Task[];
  projects: Project[];
  onAddTask?: (initialDate: Date) => void;
  onAddProject?: () => void;
  onSelectTask?: (task: Task) => void;
}

export default function MemberCalendar({ tasks, projects, onAddTask, onAddProject, onSelectTask }: MemberCalendarProps) {
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  // Convert tasks to Big Calendar events
  const events = tasks.map(t => {
    const startStr = t.startDate || t.dueDate;
    const endStr = t.dueDate;

    const startDate = startStr ? moment(startStr).startOf('day').toDate() : new Date();
    const endDate = endStr ? moment(endStr).endOf('day').toDate() : new Date();

    const project = projects.find(p => p.id === t.projectId);

    return {
      id: t.id,
      title: t.title,
      start: startDate,
      end: endDate,
      allDay: true, // we treat due dates as full days mostly, unless specified
      resource: t,
      color: project ? project.color : '#3B82F6',
      status: t.status
    };
  });

  const eventStyleGetter = (event: any, start: any, end: any, isSelected: any) => {
    let backgroundColor = event.color || '#3174ad';
    
    // Lighten or cross out if done
    if (event.status === 'done') {
        backgroundColor = '#cbd5e1'; // slate-300
    }

    const style = {
      backgroundColor: backgroundColor,
      borderRadius: '2px',
      opacity: 0.9,
      color: event.status === 'done' ? '#475569' : 'white', // text color
      border: '0px',
      display: 'block',
      fontSize: '10px',
      fontWeight: '600' as const,
      textDecoration: event.status === 'done' ? 'line-through' : 'none'
    };
    return {
      style: style
    };
  };

  const handleSelectSlot = (slotInfo: any) => {
    // slotInfo.start
    if (onAddTask) {
      onAddTask(slotInfo.start);
    }
  };

  const handleSelectEvent = (event: any) => {
    if (onSelectTask && event.resource) {
      onSelectTask(event.resource);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm p-4 h-[750px] flex flex-col font-sans">
      <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Calendari del Membre</h3>
          <p className="text-xs text-slate-500">Visualització i planificació de tasques assignades (Diari, Setmanal, Mensual, Anual)</p>
        </div>
        <div className="flex gap-2">
           <button
            onClick={() => onAddProject && onAddProject()}
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs py-1.5 px-3 flex items-center gap-1.5 transition-all shadow-sm rounded-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nou Projecte</span>
          </button>
          <button
            onClick={() => onAddTask && onAddTask(new Date())}
            className="bg-[#022e5f] hover:bg-[#033b7a] text-white font-bold text-xs py-1.5 px-3 flex items-center gap-1.5 transition-all shadow-sm rounded-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Tasca</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 custom-calendar-wrapper">
        <style>{`
          .custom-calendar-wrapper .rbc-toolbar button {
            color: #475569;
            border-color: #cbd5e1;
            border-radius: 0;
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
            padding: 0.25rem 0.5rem;
            margin-right: -1px;
          }
          .custom-calendar-wrapper .rbc-toolbar button:active,
          .custom-calendar-wrapper .rbc-toolbar button.rbc-active {
            background-color: #0f172a;
            color: #ffffff;
            border-color: #0f172a;
            box-shadow: none;
          }
          .custom-calendar-wrapper .rbc-toolbar button:hover:not(.rbc-active) {
            background-color: #f1f5f9;
          }
          .custom-calendar-wrapper .rbc-header {
            padding: 0.5rem;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1e293b;
            background-color: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
          }
          .custom-calendar-wrapper .rbc-month-view,
          .custom-calendar-wrapper .rbc-time-view,
          .custom-calendar-wrapper .rbc-agenda-view {
            border: 1px solid #e2e8f0;
            border-radius: 0;
          }
          .custom-calendar-wrapper .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid #e2e8f0;
          }
          .custom-calendar-wrapper .rbc-month-row + .rbc-month-row {
            border-top: 1px solid #e2e8f0;
          }
          .custom-calendar-wrapper .rbc-today {
            background-color: #eff6ff;
          }
          .custom-calendar-wrapper .rbc-off-range-bg {
            background-color: #f8fafc;
          }
          .custom-calendar-wrapper .rbc-date-cell {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: #475569;
          }
        `}</style>
        <Calendar
          localizer={localizer}
          culture="ca"
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable={true}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          messages={{
            today: "Avui",
            previous: "Enrere",
            next: "Següent",
            month: "Mes",
            week: "Setmana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Esdeveniment",
            noEventsInRange: "No hi ha tasques en aquest rang de dates.",
            showMore: total => `+ ${total} més`
          }}
        />
      </div>
    </div>
  );
}
