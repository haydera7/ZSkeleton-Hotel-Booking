import React, { useEffect, useState } from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

const MyBookings = () => {

    const {axios, getToken, user, formatCurrency} = useAppContext()
    const [searchParams] = useSearchParams()
    const [bookings, setBookings] = useState([]);

    // guest lookup (no account) state - prefilled if we arrived here right
    // after booking/payment (e.g. ?bookingId=...&phone=...)
    const [lookupId, setLookupId] = useState(searchParams.get('bookingId') || '');
    const [lookupPhone, setLookupPhone] = useState(searchParams.get('phone') || '');
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupDone, setLookupDone] = useState(false);

    const [proofFile, setProofFile] = useState({}); // { [bookingId]: File }
    const [uploadingId, setUploadingId] = useState(null);
    const [reviewForms, setReviewForms] = useState({});
    const [reviewingId, setReviewingId] = useState(null);

    const fetchUserBookings = async () => {
           try {
             const {data} = await axios.get('/api/bookings/user', {headers: {Authorization: `Bearer ${await getToken()}`}})
             if(data.success){
                setBookings(data.bookings)
             }else{
                toast.error(data.message)
             }
           } catch (error) {
             toast.error(error.message)
           }
    }

    useEffect(()=>{
        if(user){
            fetchUserBookings()
        }
    },[user])

    const runLookup = async (bookingId, phone) => {
        setLookingUp(true);
        try {
            const {data} = await axios.get('/api/bookings/lookup', {
                params: { bookingId: bookingId.trim(), phone: phone.trim() }
            });
            if(data.success){
                setBookings([data.booking]);
                setLookupDone(true);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLookingUp(false);
        }
    }

    const lookupBooking = (e) => {
        e.preventDefault();
        runLookup(lookupId, lookupPhone);
    }

    const syncStripeReturn = async (bookingId, phone, sessionId) => {
        setLookingUp(true);
        try {
            const {data} = await axios.post('/api/bookings/stripe-sync', {
                bookingId: bookingId.trim(),
                phone: phone.trim(),
                sessionId,
            });
            if(data.success){
                setBookings([data.booking]);
                setLookupDone(true);
                toast.success(data.message);
                return true;
            }
            toast.error(data.message);
            return false;
        } catch (error) {
            toast.error(error.message);
            return false;
        } finally {
            setLookingUp(false);
        }
    }

    // Arrived here straight from a booking/payment with both values already
    // known (e.g. from BookingWidget's "View My Booking" button, or the
    // Stripe success redirect) - just show the result immediately.
    useEffect(() => {
        const idFromUrl = searchParams.get('bookingId');
        const phoneFromUrl = searchParams.get('phone');
        const sessionIdFromUrl = searchParams.get('session_id');
        if(idFromUrl && phoneFromUrl && sessionIdFromUrl){
            syncStripeReturn(idFromUrl, phoneFromUrl, sessionIdFromUrl);
            return;
        }
        if(!user && idFromUrl && phoneFromUrl){
            runLookup(idFromUrl, phoneFromUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePayment = async (bookingId) => {
        try {
            const {data} = await axios.post('/api/bookings/stripe-payment', {bookingId})
                if(data.success){
                    window.location.href  = data.url;
                } else {
                    toast.error(data.message);
                }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const submitProof = async (booking) => {
        const bookingId = booking._id;
        const file = proofFile[bookingId];
        if(!file){
            toast.error('Please choose a screenshot first');
            return;
        }
        setUploadingId(bookingId);
        try {
            const formData = new FormData();
            formData.append('proof', file);
            formData.append('phone', booking.guestPhone || lookupPhone);
            const {data} = await axios.post(`/api/bookings/${bookingId}/payment-proof`, formData, {
                headers: {'Content-Type': 'multipart/form-data'}
            });
            if(data.success){
                toast.success(data.message);
                setBookings(prev => prev.map(b => b._id === bookingId ? data.booking : b));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setUploadingId(null);
        }
    }

    const submitReview = async (booking) => {
        const form = reviewForms[booking._id] || {};
        const rating = form.rating || booking.review?.rating || 5;
        const comment = form.comment || '';

        if(!comment.trim()){
            toast.error('Please write a short review');
            return;
        }

        setReviewingId(booking._id);
        try {
            const {data} = await axios.post(`/api/bookings/${booking._id}/review`, {
                phone: booking.guestPhone || lookupPhone,
                rating,
                comment,
            });
            if(data.success){
                toast.success(data.message);
                setBookings(prev => prev.map(b => b._id === booking._id ? data.booking : b));
                setReviewForms(prev => ({...prev, [booking._id]: {rating, comment: ''}}));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setReviewingId(null);
        }
    }

    const renderReviewSection = (booking) => {
        if(booking.status !== 'checked-out') return null;

        if(booking.review?.rating){
            return (
                <div className='mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 max-w-md'>
                    <p className='text-sm font-medium text-gray-700'>Your review</p>
                    <p className='text-xs text-gray-500 mt-1'>{booking.review.rating}/5 stars</p>
                    {booking.review.comment && <p className='text-sm text-gray-600 mt-2'>"{booking.review.comment}"</p>}
                </div>
            );
        }

        const form = reviewForms[booking._id] || {rating: 5, comment: ''};
        return (
            <div className='mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 max-w-md'>
                <p className='text-sm font-medium text-gray-700'>Review your stay</p>
                <div className='flex flex-col sm:flex-row gap-2 mt-2'>
                    <select value={form.rating} onChange={e => setReviewForms(prev => ({
                        ...prev,
                        [booking._id]: {...form, rating: Number(e.target.value)}
                    }))}
                        className='border border-gray-300 rounded px-2 py-1 text-sm outline-none'>
                        {[5,4,3,2,1].map(rating => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <input value={form.comment} onChange={e => setReviewForms(prev => ({
                        ...prev,
                        [booking._id]: {...form, comment: e.target.value}
                    }))}
                        type='text' maxLength={600} placeholder='How was your stay?'
                        className='flex-1 border border-gray-300 rounded px-3 py-1 text-sm outline-none' />
                    <button onClick={() => submitReview(booking)} disabled={reviewingId === booking._id}
                        className='bg-primary hover:bg-primary-dull text-white rounded px-4 py-1.5 text-sm cursor-pointer disabled:opacity-50'>
                        {reviewingId === booking._id ? 'Saving...' : 'Submit'}
                    </button>
                </div>
            </div>
        );
    }

    const renderPaymentSection = (booking) => {
        if(booking.isPaid){
            return (
                <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-green-500'></div>
                    <p className='text-sm text-green-500'>Paid</p>
                </div>
            );
        }

        if(booking.paymentMethod === 'Bank Transfer'){
            if(booking.paymentRejected){
                return (
                    <div className='flex flex-col items-center gap-2 max-w-48'>
                        <div className='flex items-center gap-2'>
                            <div className='h-3 w-3 rounded-full bg-red-500'></div>
                            <p className='text-sm text-red-500'>Payment Rejected</p>
                        </div>
                        <p className='text-xs text-gray-500 text-center'>{booking.paymentRejectionReason}</p>
                        <input type='file' accept='image/*'
                            onChange={e => setProofFile(prev => ({...prev, [booking._id]: e.target.files[0]}))}
                            className='text-xs' />
                        <button onClick={() => submitProof(booking)} disabled={uploadingId === booking._id}
                            className='px-4 py-1.5 text-xs border border-gray-400 rounded-full hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50'>
                            {uploadingId === booking._id ? 'Uploading...' : 'Upload New Proof'}
                        </button>
                    </div>
                );
            }
            if(booking.paymentProof){
                return (
                    <div className='flex flex-col items-center gap-1'>
                        <div className='flex items-center gap-2'>
                            <div className='h-3 w-3 rounded-full bg-amber-500'></div>
                            <p className='text-sm text-amber-600'>Awaiting Verification</p>
                        </div>
                        <a href={booking.paymentProof} target='_blank' rel='noreferrer' className='text-xs text-gray-400 underline'>
                            View submitted proof
                        </a>
                    </div>
                );
            }
            return (
                <div className='flex flex-col items-center gap-2'>
                    <div className='flex items-center gap-2'>
                        <div className='h-3 w-3 rounded-full bg-red-500'></div>
                        <p className='text-sm text-red-500'>Unpaid</p>
                    </div>
                    <input type='file' accept='image/*'
                        onChange={e => setProofFile(prev => ({...prev, [booking._id]: e.target.files[0]}))}
                        className='text-xs' />
                    <button onClick={() => submitProof(booking)} disabled={uploadingId === booking._id}
                        className='px-4 py-1.5 text-xs border border-gray-400 rounded-full hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50'>
                        {uploadingId === booking._id ? 'Uploading...' : 'Upload Proof'}
                    </button>
                </div>
            );
        }

        return (
            <div className='flex flex-col items-center gap-2'>
                <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-red-500'></div>
                    <p className='text-sm text-red-500'>Unpaid</p>
                </div>
                <button onClick={() => handlePayment(booking._id)}
                    className='px-4 py-1.5 text-xs border border-gray-400 rounded-full hover:bg-gray-50 transition-all cursor-pointer'>
                    Pay Now
                </button>
            </div>
        );
    }

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            'checked-in': 'Checked in',
            'checked-out': 'Checked out',
            cancelled: 'Cancelled',
            'no-show': 'No-show',
        };
        return labels[status] || 'Pending';
    }

    const getStatusStyle = (status) => {
        const styles = {
            pending: 'bg-amber-50 text-amber-700 ring-amber-200',
            confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
            'checked-in': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
            'checked-out': 'bg-slate-100 text-slate-700 ring-slate-200',
            cancelled: 'bg-red-50 text-red-700 ring-red-200',
            'no-show': 'bg-orange-50 text-orange-700 ring-orange-200',
        };
        return styles[status] || styles.pending;
    }

    const getPaymentState = (booking) => {
        if(booking.isPaid) return {
            label: `Paid${booking.paymentMethod ? ` by ${booking.paymentMethod}` : ''}`,
            style: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        };
        if(booking.paymentMethod === 'Bank Transfer' && booking.paymentRejected) return {
            label: 'Proof rejected',
            style: 'bg-red-50 text-red-700 ring-red-200',
        };
        if(booking.paymentMethod === 'Bank Transfer' && booking.paymentProof) return {
            label: 'Proof under review',
            style: 'bg-amber-50 text-amber-700 ring-amber-200',
        };
        if(booking.paymentMethod === 'Bank Transfer') return {
            label: 'Bank proof needed',
            style: 'bg-red-50 text-red-700 ring-red-200',
        };
        return {
            label: 'Payment needed',
            style: 'bg-red-50 text-red-700 ring-red-200',
        };
    }

    const getNextAction = (booking) => {
        if(booking.status === 'cancelled') return 'This booking has been cancelled.';
        if(booking.status === 'no-show') return 'Marked as no-show by the hotel.';
        if(booking.status === 'checked-out') {
            return booking.review?.rating ? 'Thanks for reviewing your stay.' : 'Share a review for your stay.';
        }
        if(!booking.isPaid){
            if(booking.paymentMethod === 'Bank Transfer'){
                if(booking.paymentRejected) return 'Upload a corrected payment proof.';
                if(booking.paymentProof) return 'Hotel staff will verify your bank proof.';
                return 'Upload your bank transfer proof within 24 hours.';
            }
            return 'Complete payment to confirm your booking.';
        }
        if(booking.status === 'checked-in') return 'You are currently checked in.';
        if(booking.status === 'confirmed') return 'Your room is reserved. Bring your ID at check-in.';
        return 'Waiting for hotel confirmation.';
    }

  return (
    <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl_32 bg-slate-50 min-h-screen'>

        <Title title='My Bookings' subtitle='Easily manage your past, current, and 
        upcoming hotel reservations in one place. Plan your trips seamlessly with
        just a few clicks ' align='left' />

        {!user && (
            <form onSubmit={lookupBooking} className='mt-8 max-w-3xl border border-gray-200 bg-white rounded-lg p-5 flex flex-col gap-3 shadow-sm'>
                <p className='text-sm text-gray-600'>
                    Booked without an account? Enter the Booking ID shown on your payment screen
                    and your phone number to check its status.
                </p>
                <div className='flex flex-col sm:flex-row gap-3 '>
                    <input value={lookupId} onChange={e => setLookupId(e.target.value)}
                        type='text' placeholder='Booking ID' required
                        className='flex-1 border border-gray-300 rounded px-3 py-2 outline-none' />
                    <input value={lookupPhone} onChange={e => setLookupPhone(e.target.value)}
                        type='tel' placeholder='Phone Number' required
                        className='flex-1 border border-gray-300 rounded px-3 py-2 outline-none' />
                    <button type='submit' disabled={lookingUp}
                        className='bg-primary hover:bg-primary-dull text-white rounded px-6 py-2 cursor-pointer disabled:opacity-60 whitespace-nowrap'>
                        {lookingUp ? 'Searching...' : 'Find Booking'}
                    </button>
                </div>
            </form>
        )}

        {(user || lookupDone) && (
        <div className='max-w-6xl mt-8 w-full text-gray-800'>
            <div className='hidden lg:grid grid-cols-[2.2fr_1.1fr_1.3fr] gap-6 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400'>
                <p>Reservation</p>
                <p>Stay Dates</p>
                <p>Payment & Action</p>
            </div>
            
            <div className='space-y-4'>
            {bookings?.map((booking)=>{
                const paymentState = getPaymentState(booking);
                return (
                <div key={booking._id} className='grid grid-cols-1 lg:grid-cols-[2.2fr_1.1fr_1.3fr] gap-5 w-full rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm'>
                 <div className='flex flex-col sm:flex-row gap-4'>
                    <img src={booking.room?.images?.[0]} alt={booking.room?.roomType || 'Booked room'} className='w-full sm:w-44 h-48 sm:h-32 rounded-lg shadow-sm object-cover bg-gray-100'/>
                    <div className='flex flex-col gap-2 min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(booking.status)}`}>
                                {getStatusLabel(booking.status)}
                            </span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${paymentState.style}`}>
                                {paymentState.label}
                            </span>
                        </div>
                        <div>
                            <p className='font-playfair text-2xl leading-tight text-gray-950'>{booking.hotel?.name}</p>
                            <p className='text-sm font-medium text-gray-600'>{booking.room?.roomType}</p>
                        </div>
                        <div className='flex items-start gap-2 text-sm text-gray-500'>
                            <img src={assets.locationIcon} className='w-4 mt-0.5' />
                            <span>{booking.hotel?.address}</span>
                        </div>
                        <div className='flex items-center gap-2 text-sm text-gray-500'>
                            <img src={assets.guestsIcon} className='w-4' />
                            <span>{booking.guests} guest{Number(booking.guests) === 1 ? '' : 's'}</span>
                        </div>
                        <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 mt-1'>
                            <p className='text-xs uppercase tracking-wide text-gray-400'>Booking ID</p>
                            <p className='text-sm font-semibold text-gray-800 break-all'>{booking._id}</p>
                        </div>
                    </div>
                 </div>
                  <div className='grid grid-cols-2 lg:grid-cols-1 gap-3 lg:self-center'>
                     <div className='rounded-lg border border-gray-200 bg-white px-3 py-3'>
                        <p className='text-xs uppercase tracking-wide text-gray-400'>Check-in</p>
                         <p className='text-gray-900 text-sm font-medium mt-1'>
                         {new Date(booking.checkInDate).toDateString()}
                         </p>
                     </div>
                     <div className='rounded-lg border border-gray-200 bg-white px-3 py-3'>
                        <p className='text-xs uppercase tracking-wide text-gray-400'>Check-out</p>
                         <p className='text-gray-900 text-sm font-medium mt-1'>
                         {new Date(booking.checkOutDate).toDateString()}
                         </p>
                     </div>
                  </div>
                   <div className='flex flex-col gap-3 lg:self-center rounded-lg bg-slate-50 border border-slate-100 p-4'>
                      <div>
                        <p className='text-xs uppercase tracking-wide text-gray-400'>Total</p>
                        <p className='text-xl font-semibold text-gray-950 mt-1'>{formatCurrency(booking.totalPrice)}</p>
                      </div>
                      <div>
                        <p className='text-xs uppercase tracking-wide text-gray-400'>Next action</p>
                        <p className='text-sm text-gray-700 mt-1'>{getNextAction(booking)}</p>
                      </div>
                      <div className='flex justify-start lg:justify-center border-t border-slate-200 pt-3'>
                        {renderPaymentSection(booking)}
                      </div>
                   </div>
                   <div className='lg:col-span-3'>
                    {renderReviewSection(booking)}
                   </div>
                </div>
            )})}
            </div>

            {bookings.length === 0 && (
                <div className='rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center'>
                    <p className='text-gray-500 text-sm'>No bookings found.</p>
                </div>
            )}
        </div>
        )}
    </div>
  )
}

export default MyBookings
