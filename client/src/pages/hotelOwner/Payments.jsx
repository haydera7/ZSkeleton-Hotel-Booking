import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/Title';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const sameDay = (date, target) => {
  if(!date) return false;
  const d = new Date(date);
  return d.getFullYear() === target.getFullYear()
    && d.getMonth() === target.getMonth()
    && d.getDate() === target.getDate();
}

const totalAmount = (items) => items.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);

const Payments = () => {
  const {axios, getToken, formatCurrency} = useAppContext();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [markingPaidId, setMarkingPaidId] = useState(null);
  const [manualMethods, setManualMethods] = useState({});
  const [proofPreview, setProofPreview] = useState(null);

  // reject modal state
  const [rejectTarget, setRejectTarget] = useState(null); // booking being rejected, or null
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

  const verifyPayment = async (bookingId) => {
    setVerifyingId(bookingId);
    try {
      const {data} = await axios.patch(`/api/bookings/${bookingId}/verify-payment`, {},
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        fetchBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setVerifyingId(null);
    }
  }

  const markPaid = async (booking) => {
    const bookingId = booking._id;
    const paymentMethod = manualMethods[bookingId] || (booking.paymentMethod === 'Pay At Hotel' ? 'Cash' : booking.paymentMethod || 'Cash');
    setMarkingPaidId(bookingId);
    try {
      const {data} = await axios.patch(`/api/bookings/${bookingId}/mark-paid`, {paymentMethod},
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        fetchBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setMarkingPaidId(null);
    }
  }

  const openReject = (booking) => {
    setRejectTarget(booking);
    setRejectReason('');
  }

  const closeReject = () => {
    setRejectTarget(null);
    setRejectReason('');
  }

  const submitReject = async (e) => {
    e.preventDefault();
    if(!rejectTarget) return;
    setRejecting(true);
    try {
      const {data} = await axios.patch(`/api/bookings/${rejectTarget._id}/reject-payment`, {reason: rejectReason},
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        closeReject();
        fetchBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRejecting(false);
    }
  }

  const activeStatuses = ['pending', 'confirmed', 'checked-in'];
  const frontDeskBalances = bookings.filter(b => b.createdBy && !b.isPaid && activeStatuses.includes(b.status));
  const bankTransfers = bookings.filter(b => b.paymentMethod === 'Bank Transfer' && !b.createdBy);
  const awaitingProof = bankTransfers.filter(b => !b.paymentProof && !b.isPaid);
  const awaitingReview = bankTransfers.filter(b => b.paymentProof && !b.isPaid && !b.paymentRejected);
  const rejected = bankTransfers.filter(b => b.paymentRejected && !b.isPaid);
  const verified = bookings.filter(b => b.isPaid && (b.paymentMethod === 'Bank Transfer' || b.createdBy));
  const verifiedToday = verified.filter(b => sameDay(b.paymentVerifiedAt, new Date()));

  const totals = useMemo(() => ({
    frontDeskBalances: totalAmount(frontDeskBalances),
    awaitingReview: totalAmount(awaitingReview),
    verifiedToday: totalAmount(verifiedToday),
    rejected: totalAmount(rejected),
    awaitingProof: totalAmount(awaitingProof),
  }), [frontDeskBalances, awaitingReview, verifiedToday, rejected, awaitingProof]);

  if(loading) return <p className='mt-10 text-gray-500'>Loading payments...</p>

  return (
    <div className='pb-15 max-w-7xl'>
      <Title align='left' font='outfit' title='Payments' subtitle='Review bank-transfer
      screenshots, collect front-desk balances, and reconcile confirmed payments.' />

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8'>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Front-desk Balances</p>
          <p className='mt-2 text-2xl font-semibold text-gray-900'>{formatCurrency(totals.frontDeskBalances)}</p>
          <p className='mt-1 text-xs text-gray-500'>{frontDeskBalances.length} booking(s) to collect</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Bank Proofs Awaiting Review</p>
          <p className='mt-2 text-2xl font-semibold text-amber-700'>{formatCurrency(totals.awaitingReview)}</p>
          <p className='mt-1 text-xs text-gray-500'>{awaitingReview.length} proof(s) uploaded</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Verified Today</p>
          <p className='mt-2 text-2xl font-semibold text-green-700'>{formatCurrency(totals.verifiedToday)}</p>
          <p className='mt-1 text-xs text-gray-500'>{verifiedToday.length} payment(s) recorded</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs uppercase text-gray-400'>Rejected</p>
          <p className='mt-2 text-2xl font-semibold text-red-700'>{formatCurrency(totals.rejected)}</p>
          <p className='mt-1 text-xs text-gray-500'>{rejected.length} awaiting resubmission</p>
        </div>
      </div>

      <section className='mt-8 rounded-lg border border-gray-200 bg-white overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Front-desk Balances</h3>
            <p className='text-sm text-gray-500 mt-1'>Walk-in and pay-later balances collected by cashier.</p>
          </div>
          <span className='text-sm font-medium text-gray-800'>{formatCurrency(totals.frontDeskBalances)}</span>
        </div>
      <div className='w-full text-left overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Room</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Collected Method</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Action</th>
            </tr>
          </thead>
          <tbody className='text-sm'>
            {frontDeskBalances.map(b => (
              <tr key={b._id} className='hover:bg-gray-50/70'>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                  {b.guestName || 'Walk-in Guest'}
                  {b.guestPhone && <div className='text-xs text-gray-400'>{b.guestPhone}</div>}
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>{b.room?.roomType}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(b.totalPrice)}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center'>
                  <select
                    value={manualMethods[b._id] || (b.paymentMethod === 'Pay At Hotel' ? 'Cash' : b.paymentMethod || 'Cash')}
                    onChange={e => setManualMethods(prev => ({...prev, [b._id]: e.target.value}))}
                    className='border border-gray-300 rounded px-2 py-1 text-xs outline-none bg-white'
                  >
                    <option value='Cash'>Cash</option>
                    <option value='Bank Transfer'>Bank Transfer</option>
                    <option value='Card'>Card</option>
                  </select>
                </td>
                <td className='py-4 px-4 border-t border-gray-200 text-center'>
                  <button
                    onClick={() => markPaid(b)}
                    disabled={markingPaidId === b._id}
                    className='text-xs bg-black text-white rounded-full px-4 py-1.5 hover:opacity-90 cursor-pointer disabled:opacity-50'
                  >
                    {markingPaidId === b._id ? 'Recording...' : 'Record Payment'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {frontDeskBalances.length === 0 && <p className='text-gray-400 text-sm p-5'>No front-desk balances due.</p>}
      </div>
      </section>

      <section className='mt-8 rounded-lg border border-gray-200 bg-white overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Bank Proofs Awaiting Review</h3>
            <p className='text-sm text-gray-500 mt-1'>Open proof previews, verify real transfers, or reject with a reason.</p>
          </div>
          <span className='text-sm font-medium text-gray-800'>{formatCurrency(totals.awaitingReview)}</span>
        </div>
      <div className='w-full text-left overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Room</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Proof</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Action</th>
            </tr>
          </thead>
          <tbody className='text-sm'>
            {awaitingReview.map(b => (
              <tr key={b._id} className='hover:bg-gray-50/70'>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                  {b.user?.username || b.guestName || 'Guest'}
                  {b.guestPhone && <div className='text-xs text-gray-400'>{b.guestPhone}</div>}
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>{b.room?.roomType}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(b.totalPrice)}</td>
                <td className='py-4 px-4 border-t border-gray-200 text-center'>
                  <button type='button' onClick={() => setProofPreview(b)} className='mx-auto block cursor-pointer'>
                    <img src={b.paymentProof} alt='Payment proof' className='h-14 w-14 object-cover rounded mx-auto border border-gray-200 hover:opacity-80 transition' />
                  </button>
                </td>
                <td className='py-4 px-4 border-t border-gray-200 text-center'>
                  <div className='flex gap-2 justify-center'>
                    <button
                      onClick={() => verifyPayment(b._id)}
                      disabled={verifyingId === b._id}
                      className='text-xs bg-black text-white rounded-full px-4 py-1.5 hover:opacity-90 cursor-pointer disabled:opacity-50'
                    >
                      {verifyingId === b._id ? 'Verifying...' : 'Verify Payment'}
                    </button>
                    <button
                      onClick={() => openReject(b)}
                      className='text-xs border border-red-300 text-red-600 rounded-full px-4 py-1.5 hover:bg-red-50 cursor-pointer'
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {awaitingReview.length === 0 && <p className='text-gray-400 text-sm p-5'>Nothing to review right now.</p>}
      </div>
      </section>

      <section className='mt-8 rounded-lg border border-gray-200 bg-white overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Online Guests Awaiting Proof</h3>
            <p className='text-sm text-gray-500 mt-1'>Bank-transfer bookings created but proof is not uploaded yet.</p>
          </div>
          <span className='text-sm font-medium text-gray-800'>{formatCurrency(totals.awaitingProof)}</span>
        </div>
      <div className='w-full text-left overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Room</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Booked</th>
            </tr>
          </thead>
          <tbody className='text-sm'>
            {awaitingProof.map(b => (
              <tr key={b._id} className='hover:bg-gray-50/70'>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                  {b.user?.username || b.guestName || 'Guest'}
                  {b.guestPhone && <div className='text-xs text-gray-400'>{b.guestPhone}</div>}
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>{b.room?.roomType}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(b.totalPrice)}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center'>{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {awaitingProof.length === 0 && <p className='text-gray-400 text-sm p-5'>No pending bank transfers.</p>}
      </div>
      </section>

      <section className='mt-8 rounded-lg border border-gray-200 bg-white overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Rejected</h3>
            <p className='text-sm text-gray-500 mt-1'>Rejected payment proofs waiting for guest resubmission.</p>
          </div>
          <span className='text-sm font-medium text-red-700'>{formatCurrency(totals.rejected)}</span>
        </div>
      <div className='w-full text-left overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Room</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
              <th className='py-3 px-4 text-gray-800 font-medium'>Reason</th>
            </tr>
          </thead>
          <tbody className='text-sm'>
            {rejected.map(b => (
              <tr key={b._id} className='hover:bg-gray-50/70'>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                  {b.user?.username || b.guestName || 'Guest'}
                  {b.guestPhone && <div className='text-xs text-gray-400'>{b.guestPhone}</div>}
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>{b.room?.roomType}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(b.totalPrice)}</td>
                <td className='py-4 px-4 text-red-600 border-t border-gray-200'>{b.paymentRejectionReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rejected.length === 0 && <p className='text-gray-400 text-sm p-5'>Nothing rejected right now.</p>}
      </div>
      </section>

      <section className='mt-8 rounded-lg border border-gray-200 bg-white overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Verified Today</h3>
            <p className='text-sm text-gray-500 mt-1'>Payments verified or recorded today.</p>
          </div>
          <span className='text-sm font-medium text-green-700'>{formatCurrency(totals.verifiedToday)}</span>
        </div>
      <div className='w-full text-left overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-3 px-4 text-gray-800 font-medium'>Guest</th>
              <th className='py-3 px-4 text-gray-800 font-medium max-sm:hidden'>Room</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Amount</th>
              <th className='py-3 px-4 text-gray-800 font-medium text-center'>Verified On</th>
            </tr>
          </thead>
          <tbody className='text-sm'>
            {verifiedToday.map(b => (
              <tr key={b._id} className='hover:bg-gray-50/70'>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200'>
                  {b.user?.username || b.guestName || 'Guest'}
                </td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 max-sm:hidden'>{b.room?.roomType}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center font-medium'>{formatCurrency(b.totalPrice)}</td>
                <td className='py-4 px-4 text-gray-700 border-t border-gray-200 text-center'>
                  {b.paymentVerifiedAt ? new Date(b.paymentVerifiedAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {verifiedToday.length === 0 && <p className='text-gray-400 text-sm p-5'>No payments verified today.</p>}
      </div>
      </section>

      {proofPreview && (
        <div className='fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4' onClick={() => setProofPreview(null)}>
          <div className='bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between border-b border-gray-200 px-5 py-4'>
              <div>
                <h2 className='font-semibold text-gray-900'>Payment Proof Preview</h2>
                <p className='text-sm text-gray-500'>{proofPreview.guestName || proofPreview.user?.username || 'Guest'} · {formatCurrency(proofPreview.totalPrice)}</p>
              </div>
              <button type='button' onClick={() => setProofPreview(null)}
                className='text-gray-400 hover:text-gray-700 text-2xl leading-none cursor-pointer' aria-label='Close'>&times;</button>
            </div>
            <div className='bg-gray-50 p-4 max-h-[75vh] overflow-auto'>
              <img src={proofPreview.paymentProof} alt='Payment proof preview' className='mx-auto max-h-[68vh] rounded border border-gray-200 bg-white object-contain' />
            </div>
            <div className='flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-4'>
              <a href={proofPreview.paymentProof} target='_blank' rel='noreferrer'
                className='text-sm border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50'>Open Original</a>
              <button type='button' onClick={() => verifyPayment(proofPreview._id)}
                disabled={verifyingId === proofPreview._id}
                className='text-sm bg-black text-white rounded-full px-4 py-2 hover:opacity-90 disabled:opacity-50'>
                {verifyingId === proofPreview._id ? 'Verifying...' : 'Verify Payment'}
              </button>
              <button type='button' onClick={() => { setProofPreview(null); openReject(proofPreview); }}
                className='text-sm border border-red-300 text-red-600 rounded-full px-4 py-2 hover:bg-red-50'>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className='fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4' onClick={closeReject}>
          <form onSubmit={submitReject}
            className='bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative'
            onClick={e => e.stopPropagation()}>
            <button type='button' onClick={closeReject}
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer'
              aria-label='Close'>
              &times;
            </button>
            <h2 className='text-lg font-semibold text-gray-800 mb-1'>Reject Payment</h2>
            <p className='text-sm text-gray-500 mb-4'>
              Rejecting {rejectTarget.user?.username || rejectTarget.guestName || 'this guest'}'s payment proof.
              They'll be emailed this reason and asked to upload a new screenshot.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. The amount doesn't match the booking total"
              className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
            />
            <button type='submit' disabled={rejecting}
              className='w-full bg-red-600 text-white rounded-full py-2.5 mt-4 hover:opacity-90 transition disabled:opacity-50 cursor-pointer'>
              {rejecting ? 'Rejecting...' : 'Reject Payment'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Payments
