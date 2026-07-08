import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const ETHIOPIAN_REGIONS = [
  'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela',
  'Harari', 'Oromia', 'Sidama', 'Somali', 'South Ethiopia', 'South West Ethiopia', 'Tigray',
];

const emptyDetails = {
  fullName: '', gender: '', phone: '', nationality: '',
  idNumber: '', region: '', countryOfResidence: '', visaNumber: '',
  email: '', specialRequests: '',
};

const STEPS = [
  { key: 'search', number: 1, label: 'Dates' },
  { key: 'details', number: 2, label: 'Guest Details' },
  { key: 'payment', number: 3, label: 'Payment' },
  { key: 'done', number: 4, label: 'Done' },
];

// Step-based public booking widget: search -> guest details -> payment -> done.
// Works entirely without login (an already-logged-in visitor's account gets
// linked automatically since the backend accepts the auth token if present).
const BookingWidget = ({ roomId, className = '' }) => {
  const { axios, getToken, user, formatCurrency, formatEtbCurrency, navigate, hotel } = useAppContext();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState('search'); // search | details | payment | done
  const [checkInDate, setCheckInDate] = useState(() => searchParams.get('checkIn') || '');
  const [checkOutDate, setCheckOutDate] = useState(() => searchParams.get('checkOut') || '');
  const [guests, setGuests] = useState(() => searchParams.get('guests') || 1);
  const [checking, setChecking] = useState(false);

  const [details, setDetails] = useState(emptyDetails);
  const [submitting, setSubmitting] = useState(false);

  const [booking, setBooking] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const currentStepIndex = Math.max(STEPS.findIndex(item => item.key === step), 0);

  // Prefill from the logged-in account, if any - still fully optional.
  useEffect(() => {
    if (user) {
      setDetails(d => ({ ...d, fullName: d.fullName || user.name || '', email: d.email || user.email || '' }));
    }
  }, [user]);

  const checkAvailability = async (e) => {
    e.preventDefault();
    if (checkInDate >= checkOutDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }
    setChecking(true);
    try {
      const { data } = await axios.post('/api/bookings/check-availability', { room: roomId, checkInDate, checkOutDate, guests });
      if (data.success) {
        if (data.isAvailable) {
          toast.success('Room is available');
          setStep('details');
        } else {
          toast.error('Room is not available for those dates');
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setChecking(false);
    }
  };

  const submitDetails = async (e) => {
    e.preventDefault();

    if (!details.fullName || !details.gender || !details.phone || !details.nationality) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (details.nationality === 'foreign' && (!details.idNumber || !details.countryOfResidence)) {
      toast.error('Passport number and country of residence are required for foreign guests');
      return;
    }

    setSubmitting(true);
    try {
      const headers = {};
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const { data } = await axios.post('/api/bookings/guest-book', {
        room: roomId, checkInDate, checkOutDate, guests,
        fullName: details.fullName,
        gender: details.gender,
        phone: details.phone,
        nationality: details.nationality,
        idNumber: details.idNumber,
        region: details.region,
        countryOfResidence: details.countryOfResidence,
        visaNumber: details.visaNumber,
        email: details.email,
        specialRequests: details.specialRequests,
      }, { headers });

      if (data.success) {
        setBooking(data.booking);
        setStep('payment');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const payWithStripe = async () => {
    setRedirectingToStripe(true);
    try {
      const { data } = await axios.post('/api/bookings/stripe-payment', { bookingId: booking._id });
      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message);
        setRedirectingToStripe(false);
      }
    } catch (error) {
      toast.error(error.message);
      setRedirectingToStripe(false);
    }
  };

  const submitProof = async (e) => {
    e.preventDefault();
    if (!proofFile) {
      toast.error('Please attach a screenshot of the transfer');
      return;
    }
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      formData.append('phone', details.phone);
      const { data } = await axios.post(`/api/bookings/${booking._id}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        toast.success(data.message);
        setBooking(data.booking);
        setStep('done');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploadingProof(false);
    }
  };

  return (
    <div className={`bg-white shadow-[0px_0px_20px_rgba(15,23,42,0.10)] border border-gray-100 p-6 rounded-xl mx-auto mt-16 max-w-3xl ${className}`}>
      <div className='mb-6'>
        <p className='text-xs font-medium uppercase tracking-wide text-gray-400'>Book this room</p>
        <div className='mt-3 grid grid-cols-4 gap-2'>
          {STEPS.map((item, index) => {
            const isActive = item.key === step;
            const isComplete = index < currentStepIndex;
            return (
              <div key={item.key} className='min-w-0'>
                <div className={`h-1.5 rounded-full ${isActive || isComplete ? 'bg-primary' : 'bg-gray-200'}`}></div>
                <div className='mt-2 flex items-center gap-2'>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive || isComplete ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.number}
                  </span>
                  <span className={`truncate text-xs sm:text-sm ${isActive ? 'font-semibold text-gray-900' : isComplete ? 'text-gray-700' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {step === 'search' && (
        <form onSubmit={checkAvailability} className='flex flex-col gap-5'>
          <div>
            <h3 className='text-lg font-medium text-gray-800'>Choose your stay dates</h3>
            <p className='text-sm text-gray-500 mt-1'>Check availability first. If the room is open, you will continue to guest details.</p>
          </div>
          <div className='flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6'>
          <div className='flex flex-col flex-1'>
            <label htmlFor='checkInDate' className='font-medium text-gray-700'>Check-In</label>
            <input onChange={(e) => setCheckInDate(e.target.value)} value={checkInDate}
              min={new Date().toISOString().split('T')[0]}
              type='date' id='checkInDate'
              className='rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' required />
          </div>
          <div className='flex flex-col flex-1'>
            <label htmlFor='checkOutDate' className='font-medium text-gray-700'>Check-Out</label>
            <input onChange={(e) => setCheckOutDate(e.target.value)} value={checkOutDate}
              min={checkInDate} disabled={!checkInDate}
              type='date' id='checkOutDate'
              className='rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' required />
          </div>
          <div className='flex flex-col'>
            <label htmlFor='guests' className='font-medium text-gray-700'>Guests</label>
            <input onChange={(e) => setGuests(e.target.value)} value={guests}
              type='number' min='1' id='guests'
              className='max-w-20 rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' required />
          </div>
          <button type='submit' disabled={checking}
            className='bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white
            rounded-md w-full md:w-auto md:px-10 py-3 text-base cursor-pointer disabled:opacity-60'>
            {checking ? 'Checking...' : 'Check Availability'}
          </button>
          </div>
        </form>
      )}

      {step === 'details' && (
        <form onSubmit={submitDetails} className='flex flex-col gap-5'>
          <div>
            <h3 className='text-lg font-medium text-gray-800'>Guest details</h3>
            <p className='text-sm text-gray-500 mt-1'>Use the same phone number later to find this booking or upload payment proof.</p>
          </div>

          <div className='grid sm:grid-cols-2 gap-4'>
            <div className='flex flex-col'>
              <label className='text-sm text-gray-600'>Full Name *</label>
              <input value={details.fullName} onChange={e => setDetails({ ...details, fullName: e.target.value })}
                type='text' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' required />
            </div>
            <div className='flex flex-col'>
              <label className='text-sm text-gray-600'>Gender *</label>
              <select value={details.gender} onChange={e => setDetails({ ...details, gender: e.target.value })}
                className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' required>
                <option value=''>Select</option>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
                <option value='other'>Other</option>
              </select>
            </div>
            <div className='flex flex-col'>
              <label className='text-sm text-gray-600'>Phone Number *</label>
              <input value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })}
                type='tel' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' required />
            </div>
            <div className='flex flex-col'>
              <label className='text-sm text-gray-600'>Email (optional)</label>
              <input value={details.email} onChange={e => setDetails({ ...details, email: e.target.value })}
                type='email' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' />
            </div>
          </div>

          <div>
            <label className='text-sm text-gray-600 block mb-2'>Nationality *</label>
            <div className='flex gap-6'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='radio' name='nationality' value='ethiopian'
                  checked={details.nationality === 'ethiopian'}
                  onChange={() => setDetails({ ...details, nationality: 'ethiopian' })} required />
                Ethiopian
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='radio' name='nationality' value='foreign'
                  checked={details.nationality === 'foreign'}
                  onChange={() => setDetails({ ...details, nationality: 'foreign' })} />
                Foreign National
              </label>
            </div>
          </div>

          {details.nationality === 'ethiopian' && (
            <div className='grid sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4'>
              <div className='flex flex-col'>
                <label className='text-sm text-gray-600'>National ID Number (optional)</label>
                <input value={details.idNumber} onChange={e => setDetails({ ...details, idNumber: e.target.value })}
                  type='text' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' />
              </div>
              <div className='flex flex-col'>
                <label className='text-sm text-gray-600'>Region (optional)</label>
                <select value={details.region} onChange={e => setDetails({ ...details, region: e.target.value })}
                  className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none'>
                  <option value=''>Select region</option>
                  {ETHIOPIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}

          {details.nationality === 'foreign' && (
            <div className='grid sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4'>
              <div className='flex flex-col'>
                <label className='text-sm text-gray-600'>Passport Number *</label>
                <input value={details.idNumber} onChange={e => setDetails({ ...details, idNumber: e.target.value })}
                  type='text' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' required />
              </div>
              <div className='flex flex-col'>
                <label className='text-sm text-gray-600'>Country of Residence *</label>
                <input value={details.countryOfResidence} onChange={e => setDetails({ ...details, countryOfResidence: e.target.value })}
                  type='text' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' required />
              </div>
              <div className='flex flex-col sm:col-span-2'>
                <label className='text-sm text-gray-600'>Visa Number (optional)</label>
                <input value={details.visaNumber} onChange={e => setDetails({ ...details, visaNumber: e.target.value })}
                  type='text' className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' />
              </div>
            </div>
          )}

          <div className='flex flex-col'>
            <label className='text-sm text-gray-600'>Special Requests (optional)</label>
            <textarea value={details.specialRequests} onChange={e => setDetails({ ...details, specialRequests: e.target.value })}
              rows={3} className='rounded border border-gray-300 px-3 py-2 mt-1 outline-none' />
          </div>

          <div className='flex items-center gap-4 mt-2'>
            <button type='button' onClick={() => setStep('search')}
              className='text-sm text-gray-500 hover:underline cursor-pointer'>
              &larr; Back
            </button>
            <button type='submit' disabled={submitting}
              className='bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white
              rounded-md px-10 py-3 text-base cursor-pointer disabled:opacity-60 ml-auto'>
              {submitting ? 'Please wait...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      )}

      {step === 'payment' && booking && (
        <div className='flex flex-col gap-5'>
          <div>
            <h3 className='text-lg font-medium text-gray-800'>Payment instructions</h3>
            <p className='text-sm text-gray-500 mt-1'>Your booking request has been created. Complete payment now so the hotel can confirm it.</p>
          </div>
          <div className='rounded-lg border border-primary/20 bg-primary/5 p-4'>
            <p className='text-xs uppercase tracking-wide text-gray-500'>Booking ID</p>
            <p className='mt-1 break-all text-lg font-semibold text-gray-800'>{booking._id}</p>
            <p className='mt-2 text-xs text-gray-500'>
              Save this ID. You'll need it with your phone number to return to this booking.
            </p>
          </div>
          <p className='text-sm text-gray-500'>
            Total due: <span className='font-medium text-gray-800'>{formatCurrency(booking.totalPrice)}</span>
          </p>
          {hotel?.policies?.cancellationPolicy && (
            <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm'>
              <p className='font-medium text-gray-800'>Cancellation Policy</p>
              <p className='text-gray-600 mt-1'>{hotel.policies.cancellationPolicy}</p>
            </div>
          )}

          {booking.nationality === 'foreign' ? (
            <div className='flex flex-col gap-4'>
              <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700'>
                <p className='font-medium text-gray-800'>Card payment</p>
                <ol className='mt-2 list-decimal space-y-1 pl-4 text-gray-600'>
                  <li>Click Pay with Card to open the secure Stripe checkout.</li>
                  <li>Complete payment before the session expires.</li>
                  <li>After payment, you will return to My Bookings to see the updated status.</li>
                </ol>
              </div>
              <p className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3'>
                Payment session expires soon. Complete card payment now to keep this room reserved.
              </p>
              {hotel?.currency && hotel.currency !== 'USD' && (
                <p className='text-xs text-gray-500 -mt-2'>
                  Charged in USD at checkout: approximately{' '}
                  <span className='font-medium text-gray-700'>
                    ${(booking.totalPrice / (hotel?.usdExchangeRate || 1)).toFixed(2)}
                  </span>{' '}
                  (rate: {hotel.usdExchangeRate} ETB = $1)
                </p>
              )}
              <button onClick={payWithStripe} disabled={redirectingToStripe}
                className='bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white
                rounded-md px-10 py-3 text-base cursor-pointer disabled:opacity-60 w-full sm:w-auto'>
                {redirectingToStripe ? 'Redirecting...' : 'Pay with Card (Stripe)'}
              </button>
            </div>
          ) : (
            <form onSubmit={submitProof} className='flex flex-col gap-4'>
              <div className='bg-gray-50 rounded-lg p-4 text-sm text-gray-700'>
                <p className='font-medium mb-2 text-gray-800'>Bank transfer details</p>
                <p className='text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3'>
                  Upload proof within 24 hours to keep this room reserved.
                </p>
                {hotel?.bankDetails?.accountNumber ? (
                  <>
                    <p>Bank: {hotel.bankDetails.bankName}</p>
                    <p>Account Name: {hotel.bankDetails.accountName}</p>
                    <p>Account Number: {hotel.bankDetails.accountNumber}</p>
                    <div className='mt-4 border-t border-gray-200 pt-3'>
                      <p className='font-medium text-gray-800'>What to do next</p>
                      <ol className='mt-2 list-decimal space-y-1 pl-4 text-gray-600'>
                        <li>Transfer exactly <span className='font-medium text-gray-800'>{formatEtbCurrency(booking.totalPrice)}</span>.</li>
                        <li>Take a clear screenshot or photo of the transfer receipt.</li>
                        <li>Upload the proof below. Staff will verify it before confirming your booking.</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <p className='text-amber-600'>Bank details aren't set up yet - please contact the hotel directly to arrange payment.</p>
                )}
              </div>
              <div className='flex flex-col'>
                <label className='text-sm text-gray-600'>Upload Payment Screenshot *</label>
                <input type='file' accept='image/*' onChange={e => setProofFile(e.target.files[0])}
                  className='mt-1 text-sm' required />
              </div>
              <button type='submit' disabled={uploadingProof}
                className='bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white
                rounded-md px-10 py-3 text-base cursor-pointer disabled:opacity-60 w-full sm:w-auto'>
                {uploadingProof ? 'Uploading...' : 'Submit Payment Proof'}
              </button>
            </form>
          )}
        </div>
      )}

    {step === 'done' && (
  <div className='text-center py-6 '>
    <h3 className='text-lg font-medium text-gray-800'>Payment proof submitted</h3>
    <p className='text-sm text-gray-500 mt-2'>
      Your payment proof has been submitted. We'll confirm your booking shortly.
      Your booking reference is <span className='font-medium text-gray-700'>{booking._id}</span>.
    </p>
    <div className='flex items-center justify-center gap-6 mt-6'>
      <button onClick={() => navigate('/')}
        className='text-sm text-gray-500 hover:underline cursor-pointer'>
        Back to Home
      </button>
      <button
        onClick={() => navigate(`/my-bookings?bookingId=${booking._id}&phone=${encodeURIComponent(details.phone)}`)}
        className='bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white
        rounded-md px-6 py-2.5 text-sm cursor-pointer'>
        View My Booking
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default BookingWidget
