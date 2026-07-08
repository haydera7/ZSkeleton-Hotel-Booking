import React, { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../context/AppContext'

const dayMs = 24 * 60 * 60 * 1000;

const toKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const monthLabel = (date) => date.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

const statusClass = (status) => {
  if(status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
  if(status === 'checked-in') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

const AvailabilityCalendar = ({roomId, compact=false}) => {
  const {axios} = useAppContext();
  const [month, setMonth] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = useMemo(() => {
    const date = new Date(month);
    date.setDate(1);
    return date;
  }, [month]);

  const to = useMemo(() => {
    const date = new Date(month);
    date.setMonth(date.getMonth() + 2);
    date.setDate(0);
    return date;
  }, [month]);

  useEffect(() => {
    if(!roomId) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    const fetchCalendar = async () => {
      setLoading(true);
      setError('');
      try {
        const {data} = await axios.get(`/api/rooms/${roomId}/calendar`, {
          params: {from: toKey(from), to: toKey(new Date(to.getTime() + dayMs))},
        });
        if(!cancelled){
          if(data.success){
            setEvents(data.events || []);
          } else {
            setError(data.message || 'Calendar could not be loaded');
          }
        }
      } catch (err) {
        if(!cancelled) setError(err.message || 'Calendar could not be loaded');
      } finally {
        if(!cancelled) setLoading(false);
      }
    }

    fetchCalendar();
    return () => { cancelled = true; };
  }, [axios, roomId, from, to]);

  const blockedByDay = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      for(let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + dayMs)){
        map[toKey(cursor)] = event.status;
      }
    });
    return map;
  }, [events]);

  const days = useMemo(() => {
    const firstDay = new Date(month);
    firstDay.setDate(1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array(startOffset).fill(null),
      ...Array.from({length: daysInMonth}, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
    ];
  }, [month]);

  const changeMonth = (direction) => {
    setMonth(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${compact ? 'p-3 sm:p-4' : 'p-4'}`}>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='font-medium text-gray-800'>Availability Calendar</p>
          <p className='text-xs text-gray-500'>Green dates are open. Colored dates are reserved.</p>
        </div>
        <div className='flex items-center gap-2'>
          <button type='button' onClick={() => changeMonth(-1)}
            className='h-8 w-8 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-700'>‹</button>
          <button type='button' onClick={() => changeMonth(1)}
            className='h-8 w-8 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-700'>›</button>
        </div>
      </div>

      <p className='text-sm font-semibold text-gray-800 mt-4'>{monthLabel(month)}</p>
      <div className='grid grid-cols-7 gap-1 mt-3 text-center text-[11px] font-medium uppercase text-gray-400'>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className='grid grid-cols-7 gap-1.5 mt-1'>
        {days.map((date, index) => {
          if(!date) return <span key={`empty-${index}`} className='aspect-square'></span>;
          const key = toKey(date);
          const status = blockedByDay[key];
          const isPast = date < new Date(new Date().setHours(0,0,0,0));
          return (
            <span key={key}
              title={status ? `Reserved: ${status}` : isPast ? 'Past date' : 'Available'}
              className={`aspect-square rounded-md border text-xs font-medium flex items-center justify-center ${
                status ? statusClass(status) :
                isPast ? 'bg-gray-50 text-gray-300 border-gray-100' :
                'bg-green-50 text-green-700 border-green-100'
              }`}>
              {date.getDate()}
            </span>
          )
        })}
      </div>

      <div className='flex flex-wrap gap-3 mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500'>
        <span className='flex items-center gap-1'><i className='h-3 w-3 rounded bg-green-100 border border-green-200'></i>Available</span>
        <span className='flex items-center gap-1'><i className='h-3 w-3 rounded bg-amber-100 border border-amber-200'></i>Pending</span>
        <span className='flex items-center gap-1'><i className='h-3 w-3 rounded bg-red-100 border border-red-200'></i>Reserved</span>
        <span className='flex items-center gap-1'><i className='h-3 w-3 rounded bg-blue-100 border border-blue-200'></i>In-house</span>
      </div>
      {loading && <p className='text-xs text-gray-400 mt-3'>Loading calendar...</p>}
      {error && <p className='text-xs text-red-500 mt-3'>{error}</p>}
    </div>
  )
}

export default AvailabilityCalendar
