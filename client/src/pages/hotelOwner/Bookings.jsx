import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/Title';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

const STATUS_STYLES = {
  pending: 'bg-gray-200 text-gray-600',
  confirmed: 'bg-blue-200 text-blue-700',
  'checked-in': 'bg-green-200 text-green-700',
  'checked-out': 'bg-slate-300 text-slate-700',
  cancelled: 'bg-red-200 text-red-600',
  'no-show': 'bg-amber-200 text-yellow-700',
};

// which status buttons make sense to offer, given the current status
const NEXT_ACTIONS = {
  pending: ['cancelled'],
  confirmed: ['checked-in', 'cancelled', 'no-show'],
  'checked-in': ['checked-out'],
  'checked-out': [],
  cancelled: [],
  'no-show': [],
};

const FILTERS = [
  {label: 'All', value: 'all'},
  {label: 'Pending', value: 'pending'},
  {label: 'Confirmed', value: 'confirmed'},
  {label: 'In-house', value: 'checked-in'},
  {label: 'Checked-out', value: 'checked-out'},
  {label: 'Balance due', value: 'balance-due'},
];

const Bookings = () => {

  const {axios, getToken, formatCurrency, rooms} = useAppContext();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [walkIn, setWalkIn] = useState({
    room: '',
    guestName: '',
    guestPhone: '',
    idNumber: '',
    checkInDate: '',
    checkOutDate: '',
    guests: 1,
    paymentMethod: 'Cash',
    paymentCollectedNow: false,
  });
  const [savingWalkIn, setSavingWalkIn] = useState(false);

  const fetchBookings = async () => {
    try {
      const {data} = await axios.get('/api/bookings/admin', {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        setBookings(data.dashboardData.bookings);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (bookingId, status) => {
    // optimistic update
    setBookings(prev => prev.map(b => b._id === bookingId ? {...b, status} : b));
    try {
      const {data} = await axios.patch(`/api/bookings/${bookingId}/status`, {status},
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
      } else {
        toast.error(data.message);
        fetchBookings(); // rollback
      }
    } catch (error) {
      toast.error(error.message);
      fetchBookings();
    }
  }

  const submitWalkIn = async (e) => {
    e.preventDefault();
    if(!walkIn.room || !walkIn.guestName || !walkIn.guestPhone || !walkIn.checkInDate || !walkIn.checkOutDate){
      toast.error('Please fill in all required fields');
      return;
    }
    setSavingWalkIn(true);
    try {
      const {data} = await axios.post('/api/bookings/walk-in', walkIn,
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        setShowWalkIn(false);
        setWalkIn({room:'', guestName:'', guestPhone:'', idNumber:'', checkInDate:'', checkOutDate:'', guests:1, paymentMethod:'Cash', paymentCollectedNow:false});
        fetchBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingWalkIn(false);
    }
  }

  const paymentLabel = (booking) => {
    if(booking.isPaid) return `Paid${booking.paymentMethod ? ` (${booking.paymentMethod})` : ''}`;
    if(booking.createdBy && booking.status === 'checked-in') return 'In House - Balance Due';
    if(booking.createdBy) return 'Front-desk Balance Due';
    if(booking.paymentMethod === 'Bank Transfer' && booking.paymentProof && !booking.paymentRejected) return 'Payment Under Review';
    if(booking.paymentMethod === 'Bank Transfer' && booking.paymentRejected) return 'Proof Rejected';
    if(booking.paymentMethod === 'Bank Transfer') return 'Awaiting Bank Proof';
    if(booking.paymentMethod === 'Stripe') return 'Awaiting Stripe Payment';
    return 'Awaiting Payment';
  }

  const paymentStyle = (booking) => {
    if(booking.isPaid) return 'bg-green-200 text-green-700';
    if(booking.createdBy) return 'bg-amber-100 text-amber-700';
    if(booking.paymentMethod === 'Bank Transfer' && booking.paymentProof && !booking.paymentRejected) return 'bg-amber-100 text-amber-700';
    if(booking.paymentRejected) return 'bg-red-200 text-red-600';
    return 'bg-gray-200 text-gray-600';
  }

  const summary = useMemo(() => ({
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    inHouse: bookings.filter(b => b.status === 'checked-in').length,
    balanceDue: bookings.filter(b => !b.isPaid && !['cancelled', 'no-show', 'checked-out'].includes(b.status)).length,
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesFilter =
        activeFilter === 'all' ||
        booking.status === activeFilter ||
        (activeFilter === 'balance-due' && !booking.isPaid && !['cancelled', 'no-show', 'checked-out'].includes(booking.status));

      const matchesSearch = !term || [
        booking._id,
        booking.user?.username,
        booking.guestName,
        booking.guestPhone,
        booking.room?.roomType,
        booking.paymentMethod,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(term));

      return matchesFilter && matchesSearch;
    });
  }, [bookings, activeFilter, searchTerm]);

  const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

  if(loading) return <p className='mt-10 text-gray-500'>Loading bookings...</p>

  return (
    <div className='pb-15 max-w-7xl'>
      <div className='flex items-start justify-between flex-wrap gap-4'>
        <Title align='left' font='outfit' title='Bookings' subtitle='Check guests in and out,
        and record walk-in bookings before cashier payment collection.' />
        <button onClick={() => setShowWalkIn(s => !s)}
          className='bg-primary text-white px-5 py-2 rounded mt-2 cursor-pointer whitespace-nowrap'>
          {showWalkIn ? 'Close' : '+ New Walk-in Booking'}
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8'>
        <div className='border border-gray-200 bg-white rounded-lg p-4'>
          <p className='text-xs uppercase text-gray-400'>Pending</p>
          <p className='text-2xl font-semibold text-gray-900 mt-1'>{summary.pending}</p>
          <p className='text-xs text-gray-500 mt-1'>Waiting for payment or cancellation</p>
        </div>
        <div className='border border-gray-200 bg-white rounded-lg p-4'>
          <p className='text-xs uppercase text-gray-400'>Confirmed</p>
          <p className='text-2xl font-semibold text-blue-700 mt-1'>{summary.confirmed}</p>
          <p className='text-xs text-gray-500 mt-1'>Ready for check-in</p>
        </div>
        <div className='border border-gray-200 bg-white rounded-lg p-4'>
          <p className='text-xs uppercase text-gray-400'>In-house</p>
          <p className='text-2xl font-semibold text-green-700 mt-1'>{summary.inHouse}</p>
          <p className='text-xs text-gray-500 mt-1'>Currently checked in</p>
        </div>
        <div className='border border-gray-200 bg-white rounded-lg p-4'>
          <p className='text-xs uppercase text-gray-400'>Balance due</p>
          <p className='text-2xl font-semibold text-amber-700 mt-1'>{summary.balanceDue}</p>
          <p className='text-xs text-gray-500 mt-1'>Needs cashier collection</p>
        </div>
      </div>

      {showWalkIn && (
        <form onSubmit={submitWalkIn} className='border border-gray-300 rounded-lg p-4 mt-6 max-w-2xl'>
          <div className='w-full flex flex-col sm:flex-row sm:gap-4'>
            <div className='flex-1'>
              <p className='text-gray-800'>Guest Name</p>
              <input value={walkIn.guestName} onChange={e => setWalkIn({...walkIn, guestName: e.target.value})}
               type='text' className='border border-gray-300 mt-1 rounded p-2 w-full' required />
            </div>
            <div className='flex-1'>
              <p className='text-gray-800 mt-4 sm:mt-0'>Phone</p>
              <input value={walkIn.guestPhone} onChange={e => setWalkIn({...walkIn, guestPhone: e.target.value})}
               type='text' className='border border-gray-300 mt-1 rounded p-2 w-full' required />
            </div>
          </div>

          <p className='text-gray-800 mt-4'>ID / Passport Number</p>
          <input value={walkIn.idNumber} onChange={e => setWalkIn({...walkIn, idNumber: e.target.value})}
           type='text' className='border border-gray-300 mt-1 rounded p-2 w-full' />

          <p className='text-gray-800 mt-4'>Room</p>
          <select value={walkIn.room} onChange={e => setWalkIn({...walkIn, room: e.target.value})}
           className='border border-gray-300 mt-1 rounded p-2 w-full' required>
            <option value=''>Select a room</option>
            {rooms.map(r => (
              <option key={r._id} value={r._id}>{r.roomType} - {formatCurrency(r.pricePerNight)}/night - up to {r.maxGuests || 2} guests</option>
            ))}
          </select>
          {walkIn.room && (
            <div className='mt-4'>
              <AvailabilityCalendar roomId={walkIn.room} compact />
            </div>
          )}

          <div className='w-full flex flex-col sm:flex-row sm:gap-4 mt-4'>
            <div className='flex-1'>
              <p className='text-gray-800'>Check-in Date</p>
              <input value={walkIn.checkInDate} onChange={e => setWalkIn({...walkIn, checkInDate: e.target.value})}
               type='date' className='border border-gray-300 mt-1 rounded p-2 w-full' required />
            </div>
            <div className='flex-1'>
              <p className='text-gray-800 mt-4 sm:mt-0'>Check-out Date</p>
              <input value={walkIn.checkOutDate} onChange={e => setWalkIn({...walkIn, checkOutDate: e.target.value})}
               type='date' className='border border-gray-300 mt-1 rounded p-2 w-full' required />
            </div>
            <div className='flex-1'>
              <p className='text-gray-800 mt-4 sm:mt-0'>Guests</p>
              <input value={walkIn.guests} onChange={e => setWalkIn({...walkIn, guests: e.target.value})}
               type='number' min='1' className='border border-gray-300 mt-1 rounded p-2 w-full' required />
            </div>
          </div>

          <div className='w-full flex flex-col sm:flex-row sm:gap-4 mt-4 sm:items-end'>
            <div className='flex-1'>
              <p className='text-gray-800'>Expected Payment Method</p>
              <select value={walkIn.paymentMethod} onChange={e => setWalkIn({
                ...walkIn,
                paymentMethod: e.target.value,
                paymentCollectedNow: e.target.value === 'Pay At Hotel' ? false : walkIn.paymentCollectedNow
              })}
               className='border border-gray-300 mt-1 rounded p-2 w-full'>
                <option value='Cash'>Cash</option>
                <option value='Bank Transfer'>Bank Transfer</option>
                <option value='Card'>Card</option>
                <option value='Pay At Hotel'>Pay Later</option>
              </select>
            </div>
            <div className='flex-1 mt-4 sm:mt-0 sm:mb-2.5 text-sm text-gray-500'>
              {walkIn.paymentMethod === 'Pay At Hotel'
                ? 'Guest will be checked in now with a balance due.'
                : walkIn.paymentCollectedNow
                  ? 'Payment is recorded now; guest will be checked in immediately.'
                  : 'Cashier will collect or verify payment before check-in.'}
            </div>
          </div>

          {walkIn.paymentMethod !== 'Pay At Hotel' && (
            <label className='mt-4 flex items-center gap-2 text-sm text-gray-700 cursor-pointer'>
              <input type='checkbox' checked={walkIn.paymentCollectedNow}
                onChange={e => setWalkIn({...walkIn, paymentCollectedNow: e.target.checked})} />
              Payment collected now
            </label>
          )}

          <button className='bg-primary text-white px-8 py-2 rounded mt-6 cursor-pointer' disabled={savingWalkIn}>
            {savingWalkIn ? 'Saving...' :
              walkIn.paymentMethod === 'Pay At Hotel' ? 'Create Pay-Later Walk-in' :
              walkIn.paymentCollectedNow ? 'Create Paid Walk-in' : 'Create Walk-in Booking'}
          </button>
        </form>
      )}

      <div className='mt-8 border border-gray-200 bg-white rounded-lg'>
        <div className='p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
          <div className='flex flex-wrap gap-2'>
            {FILTERS.map(filter => (
              <button key={filter.value} type='button' onClick={() => setActiveFilter(filter.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition cursor-pointer ${
                  activeFilter === filter.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}>
                {filter.label}
              </button>
            ))}
          </div>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            type='search' placeholder='Search guest, phone, room, booking ID'
            className='w-full lg:w-80 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-gray-600' />
        </div>

      <div className='w-full text-left overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Room</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Dates</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Payment</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Status</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Actions</th>
            </tr>
          </thead>
          <tbody className='text-sm'>
            {filteredBookings.map(b => (
              <tr key={b._id} className='hover:bg-gray-50/70'>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                  <p className='font-medium text-gray-900'>{b.user?.username || b.guestName || 'Guest'}</p>
                  {b.guestPhone && <div className='text-xs text-gray-400'>{b.guestPhone}</div>}
                  <div className='text-xs text-gray-300 mt-1'>ID: {String(b._id).slice(-8)}</div>
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>
                  <p className='font-medium'>{b.room?.roomType || '-'}</p>
                  <p className='text-xs text-gray-400'>{b.guests} guest(s)</p>
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>
                  <p>{formatDate(b.checkInDate)}</p>
                  <p className='text-xs text-gray-400'>to {formatDate(b.checkOutDate)}</p>
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(b.totalPrice)}</td>
                <td className='py-4 px-4 border-t border-gray-200 text-center'>
                  <span className={`py-1 px-3 text-xs rounded-full ${paymentStyle(b)}`}>
                    {paymentLabel(b)}
                  </span>
                </td>
                <td className='py-4 px-4 border-t border-gray-200 text-center'>
                  <span className={`py-1 px-3 text-xs rounded-full ${STATUS_STYLES[b.status] || 'bg-gray-200 text-gray-600'}`}>
                    {b.status}
                  </span>
                </td>
                <td className='py-4 px-4 border-t border-gray-200 text-center'>
                  <div className='flex gap-2 justify-center flex-wrap'>
                    {NEXT_ACTIONS[b.status]?.map(nextStatus => (
                      <button key={nextStatus} onClick={() => updateStatus(b._id, nextStatus)}
                        disabled={nextStatus === 'checked-out' && !b.isPaid}
                        className='text-xs border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-100 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed'>
                        {nextStatus === 'checked-in' ? 'Check In' :
                         nextStatus === 'checked-out' ? 'Check Out' :
                         nextStatus === 'no-show' ? 'No-show' : 'Cancel'}
                      </button>
                    ))}
                    {b.status === 'pending' && !b.isPaid && (
                      <span className='text-xs text-gray-400 py-1'>
                        {b.createdBy ? 'Send guest to cashier' : 'Waiting for cashier/payment'}
                      </span>
                    )}
                    {b.status === 'checked-in' && !b.isPaid && (
                      <span className='text-xs text-gray-400 py-1'>Balance due before checkout</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <p className='text-gray-400 text-sm p-6'>No bookings yet.</p>}
        {bookings.length > 0 && filteredBookings.length === 0 && (
          <p className='text-gray-400 text-sm p-6'>No bookings match this search or filter.</p>
        )}
      </div>
      </div>
    </div>
  )
}

export default Bookings
