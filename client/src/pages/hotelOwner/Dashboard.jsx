import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  'checked-in': 'bg-green-100 text-green-700',
  'checked-out': 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  'no-show': 'bg-amber-100 text-amber-700',
};

const sameDay = (date, target) => {
  const d = new Date(date);
  return d.getFullYear() === target.getFullYear()
    && d.getMonth() === target.getMonth()
    && d.getDate() === target.getDate();
}

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

const Dashboard = () => {
  const {formatCurrency, user, getToken, axios, rooms} = useAppContext();

  const [dashboardData, setDashboardData] = useState({
    bookings: [],
    totalBookings: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const {data} = await axios.get('/api/bookings/admin', {headers:{Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        setDashboardData(data.dashboardData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if(user) fetchDashboardData();
  }, [user]);

  const metrics = useMemo(() => {
    const today = new Date();
    const bookings = dashboardData.bookings || [];
    const activeBookings = bookings.filter(b => !['cancelled', 'no-show'].includes(b.status));
    const arrivals = activeBookings.filter(b => sameDay(b.checkInDate, today) && ['confirmed', 'pending'].includes(b.status));
    const departures = activeBookings.filter(b => sameDay(b.checkOutDate, today) && b.status === 'checked-in');
    const pendingPayments = activeBookings.filter(b => !b.isPaid);
    const occupied = activeBookings.filter(b => b.status === 'checked-in');
    const revenueToday = activeBookings
      .filter(b => b.isPaid && b.paymentVerifiedAt && sameDay(b.paymentVerifiedAt, today))
      .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);

    return {arrivals, departures, pendingPayments, occupied, revenueToday};
  }, [dashboardData.bookings]);

  const recentBookings = (dashboardData.bookings || []).slice(0, 8);

  if(loading) return <p className='mt-10 text-gray-500'>Loading dashboard...</p>

  return (
    <div className='pb-15 max-w-7xl'>
      <Title align='left' font='outfit' title='Dashboard' subtitle='A front-desk view of today&apos;s arrivals, departures, room occupancy, payment work, and revenue.' />

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-8'>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Today&apos;s Arrivals</p>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>{metrics.arrivals.length}</p>
          <p className='mt-1 text-xs text-gray-500'>Confirmed or pending for today</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Today&apos;s Departures</p>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>{metrics.departures.length}</p>
          <p className='mt-1 text-xs text-gray-500'>Checked-in guests leaving today</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Pending Payments</p>
          <p className='mt-2 text-3xl font-semibold text-amber-700'>{metrics.pendingPayments.length}</p>
          <p className='mt-1 text-xs text-gray-500'>{formatCurrency(dashboardData.pendingRevenue || 0)} outstanding</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Occupied Rooms</p>
          <p className='mt-2 text-3xl font-semibold text-green-700'>{metrics.occupied.length}</p>
          <p className='mt-1 text-xs text-gray-500'>{rooms?.length ? `${rooms.length} rooms listed` : 'Current in-house count'}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Revenue Today</p>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>{formatCurrency(metrics.revenueToday)}</p>
          <p className='mt-1 text-xs text-gray-500'>{formatCurrency(dashboardData.totalRevenue || 0)} total collected</p>
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6 mt-8'>
        <div className='rounded-lg border border-gray-200 bg-white'>
          <div className='border-b border-gray-200 px-5 py-4'>
            <h2 className='font-semibold text-gray-900'>Today&apos;s Operations</h2>
            <p className='text-sm text-gray-500 mt-1'>Arrivals, departures, and in-house balances that need attention.</p>
          </div>

          <div className='p-5 space-y-5'>
            <div>
              <div className='flex items-center justify-between'>
                <p className='font-medium text-gray-800'>Arrivals</p>
                <span className='text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1'>{metrics.arrivals.length}</span>
              </div>
              <div className='mt-3 space-y-2'>
                {metrics.arrivals.slice(0, 4).map(booking => (
                  <div key={booking._id} className='flex items-center justify-between rounded border border-gray-100 px-3 py-2'>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{booking.guestName || booking.user?.username || 'Guest'}</p>
                      <p className='text-xs text-gray-400'>{booking.room?.roomType || 'Room'} · {booking.guests} guest(s)</p>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 ${STATUS_STYLES[booking.status]}`}>{booking.status}</span>
                  </div>
                ))}
                {metrics.arrivals.length === 0 && <p className='text-sm text-gray-400'>No arrivals scheduled today.</p>}
              </div>
            </div>

            <div>
              <div className='flex items-center justify-between'>
                <p className='font-medium text-gray-800'>Departures</p>
                <span className='text-xs rounded-full bg-slate-50 text-slate-700 px-2 py-1'>{metrics.departures.length}</span>
              </div>
              <div className='mt-3 space-y-2'>
                {metrics.departures.slice(0, 4).map(booking => (
                  <div key={booking._id} className='flex items-center justify-between rounded border border-gray-100 px-3 py-2'>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{booking.guestName || booking.user?.username || 'Guest'}</p>
                      <p className='text-xs text-gray-400'>{booking.room?.roomType || 'Room'} · checkout today</p>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 ${booking.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {booking.isPaid ? 'Paid' : 'Balance due'}
                    </span>
                  </div>
                ))}
                {metrics.departures.length === 0 && <p className='text-sm text-gray-400'>No departures due today.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white overflow-hidden'>
          <div className='border-b border-gray-200 px-5 py-4 flex items-center justify-between'>
            <div>
              <h2 className='font-semibold text-gray-900'>Recent Bookings</h2>
              <p className='text-sm text-gray-500 mt-1'>Latest reservations and walk-ins across the hotel.</p>
            </div>
            <span className='text-xs rounded-full bg-gray-100 text-gray-600 px-3 py-1'>{dashboardData.totalBookings} total</span>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-left'>
              <thead className='bg-gray-50 text-sm'>
                <tr>
                  <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
                  <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Stay</th>
                  <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
                  <th className='py-3 px-4 text-gray-800 font-medium text-center'>Status</th>
                </tr>
              </thead>
              <tbody className='text-sm'>
                {recentBookings.map((item) => (
                  <tr key={item._id} className='hover:bg-gray-50/70'>
                    <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                      <p className='font-medium text-gray-900'>{item.user?.username || item.guestName || 'Walk-in Guest'}</p>
                      <p className='text-xs text-gray-400'>{item.room?.roomType || '-'}</p>
                    </td>
                    <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>
                      <p>{formatDate(item.checkInDate)} to {formatDate(item.checkOutDate)}</p>
                      <p className='text-xs text-gray-400'>{item.guests} guest(s)</p>
                    </td>
                    <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(item.totalPrice)}</td>
                    <td className='py-4 px-4 border-t border-gray-200 text-center'>
                      <div className='flex flex-col items-center gap-1'>
                        <span className={`py-1 px-3 text-xs rounded-full ${STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-700'}`}>{item.status}</span>
                        <span className={`py-1 px-3 text-xs rounded-full ${item.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentBookings.length === 0 && <p className='text-sm text-gray-400 p-5'>No bookings yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
