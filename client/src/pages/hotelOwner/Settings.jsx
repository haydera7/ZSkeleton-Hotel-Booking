import React, { useEffect, useState } from 'react'
import Title from '../../components/Title';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const Settings = () => {

  const {axios, getToken, fetchHotel: refreshSharedHotel} = useAppContext()

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingRate, setRefreshingRate] = useState(false);
  const [rateInfo, setRateInfo] = useState({updatedAt: null, source: null});
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    contact: '',
    email: '',
    description: '',
    amenities: '',      // comma-separated in the UI, split into an array on save
    checkInTime: '14:00',
    checkOutTime: '12:00',
    cancellationPolicy: '',
    currency: 'ETB',
    usdExchangeRate: 140,
    bankName: '',
    accountName: '',
    accountNumber: '',
  });

  const fetchHotel = async () => {
    try {
      const {data} = await axios.get('/api/hotel');
      if(data.success){
        const h = data.hotel;
        setForm({
          name: h.name || '',
          address: h.address || '',
          city: h.city || '',
          contact: h.contact || '',
          email: h.email || '',
          description: h.description || '',
          amenities: (h.amenities || []).join(', '),
          checkInTime: h.policies?.checkInTime || '14:00',
          checkOutTime: h.policies?.checkOutTime || '12:00',
          cancellationPolicy: h.policies?.cancellationPolicy || '',
          currency: h.currency || 'ETB',
          usdExchangeRate: h.usdExchangeRate || 140,
          bankName: h.bankDetails?.bankName || '',
          accountName: h.bankDetails?.accountName || '',
          accountNumber: h.bankDetails?.accountNumber || '',
        });
        setRateInfo({updatedAt: h.usdExchangeRateUpdatedAt || null, source: h.usdExchangeRateSource || null});
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const refreshExchangeRate = async () => {
    setRefreshingRate(true);
    try {
      const {data} = await axios.post('/api/hotel/refresh-exchange-rate', {}, {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        setForm(prev => ({...prev, usdExchangeRate: data.hotel.usdExchangeRate}));
        setRateInfo({updatedAt: data.hotel.usdExchangeRateUpdatedAt, source: data.hotel.usdExchangeRateSource});
        refreshSharedHotel();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRefreshingRate(false);
    }
  }

  useEffect(() => {
    fetchHotel();
  }, []);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        name: form.name,
        address: form.address,
        city: form.city,
        contact: form.contact,
        email: form.email,
        description: form.description,
        amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean),
        policies: {
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
          cancellationPolicy: form.cancellationPolicy,
        },
        currency: form.currency,
        usdExchangeRate: Number(form.usdExchangeRate) || 140,
        bankDetails: {
          bankName: form.bankName,
          accountName: form.accountName,
          accountNumber: form.accountNumber,
        },
      };

      const {data} = await axios.put('/api/hotel', payload, {headers: {Authorization: `Bearer ${token}`}});

      if(data.success){
        toast.success(data.message || "Hotel settings updated");
        setLastSavedAt(new Date());
        fetchHotel(); // refresh the form from the server
        refreshSharedHotel(); // refresh the shared hotel/currency context site-wide
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  if(loading){
    return <p className='mt-10 text-gray-500'>Loading hotel settings...</p>
  }

  const FieldLabel = ({children, helper}) => (
    <div>
      <p className='text-sm font-medium text-gray-800'>{children}</p>
      {helper && <p className='text-xs text-gray-500 mt-1'>{helper}</p>}
    </div>
  )

  const Section = ({title, subtitle, children}) => (
    <section className='rounded-lg border border-gray-200 bg-white p-5 md:p-6 shadow-sm'>
      <div className='mb-5'>
        <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
        {subtitle && <p className='text-sm text-gray-500 mt-1'>{subtitle}</p>}
      </div>
      {children}
    </section>
  )

  return (
    <form onSubmit={onSubmitHandler} className='max-w-5xl pb-12'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <Title align='left' font='outfit' title='Hotel Settings' subtitle='This information appears on the public website, booking flow, guest emails, and staff screens.' />
        <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm'>
          <p className='font-medium text-gray-800'>{saving ? 'Saving changes...' : 'Settings status'}</p>
          <p className='text-xs text-gray-500 mt-1'>
            {lastSavedAt ? `Last saved ${lastSavedAt.toLocaleTimeString()}` : 'No changes saved in this session'}
          </p>
        </div>
      </div>

      <div className='mt-8 space-y-6'>
        <Section title='Hotel Identity' subtitle='Used on the homepage, footer, room pages, booking emails, and guest-facing headings.'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <FieldLabel helper='Use the real trading name guests recognize.'>Hotel Name</FieldLabel>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
               type='text' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' required />
            </div>
            <div>
              <FieldLabel helper='Shown in search, footer, and location summaries.'>City</FieldLabel>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})}
               type='text' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' required />
            </div>
          </div>

          <div className='mt-4'>
            <FieldLabel helper='Short public description. Keep it useful and specific.'>Description</FieldLabel>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
             rows={4} className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
          </div>

          <div className='mt-4'>
            <FieldLabel helper='Separate amenities with commas. These describe the hotel broadly.'>Amenities</FieldLabel>
            <input value={form.amenities} onChange={e => setForm({...form, amenities: e.target.value})}
             type='text' placeholder='Free WiFi, Free Breakfast, Parking, Pool'
             className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
          </div>
        </Section>

        <Section title='Contact & Location' subtitle='Displayed to guests in the footer, contact pages, and booking support areas.'>
          <div>
            <FieldLabel helper='Use a precise location guests can recognize or copy into maps.'>Address</FieldLabel>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
             type='text' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' required />
          </div>
          <div className='grid gap-4 sm:grid-cols-2 mt-4'>
            <div>
              <FieldLabel helper='Shown for direct guest support.'>Contact Phone</FieldLabel>
              <input value={form.contact} onChange={e => setForm({...form, contact: e.target.value})}
               type='text' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' required />
            </div>
            <div>
              <FieldLabel helper='Optional, but useful for inquiry and confirmation emails.'>Contact Email</FieldLabel>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
               type='email' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
            </div>
          </div>
        </Section>

        <Section title='Currency & Stripe' subtitle='Room prices are entered in ETB. Guests can view ETB or USD, and Stripe charges are converted to USD using this rate.'>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div>
              <FieldLabel helper='Default display currency for guests. Prices remain stored in ETB.'>Currency</FieldLabel>
              <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
               className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary'>
                <option value='ETB'>ETB (Ethiopian Birr)</option>
                <option value='USD'>USD</option>
              </select>
            </div>
            <div className='sm:col-span-2'>
              <FieldLabel helper='How many Ethiopian birr equal $1. Used for USD display and Stripe checkout.'>ETB to USD Exchange Rate</FieldLabel>
              <div className='flex flex-col sm:flex-row sm:items-center gap-2 mt-2'>
                <input value={form.usdExchangeRate} onChange={e => setForm({...form, usdExchangeRate: e.target.value})}
                 type='number' step='0.01' min='0.01' className='border border-gray-300 rounded-lg p-2.5 w-full sm:w-48 outline-none focus:border-primary' />
                <button type='button' onClick={refreshExchangeRate} disabled={refreshingRate}
                 className='px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50 whitespace-nowrap'>
                  {refreshingRate ? 'Refreshing...' : 'Refresh Now'}
                </button>
              </div>
              <p className='text-xs text-gray-400 mt-2'>
                {rateInfo.updatedAt
                  ? `Last updated ${new Date(rateInfo.updatedAt).toLocaleString()} (${rateInfo.source === 'auto' ? 'auto-refreshed' : 'manually set'})`
                  : 'Not refreshed yet - using the default rate'}
              </p>
            </div>
          </div>
        </Section>

        <Section title='Bank Transfer Details' subtitle='Shown to Ethiopian guests during payment. Keep these details accurate before accepting bookings.'>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div>
              <FieldLabel>Bank Name</FieldLabel>
              <input value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})}
               type='text' placeholder='Commercial Bank of Ethiopia' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
            </div>
            <div>
              <FieldLabel>Account Name</FieldLabel>
              <input value={form.accountName} onChange={e => setForm({...form, accountName: e.target.value})}
               type='text' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
            </div>
            <div>
              <FieldLabel>Account Number</FieldLabel>
              <input value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})}
               type='text' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
            </div>
          </div>
        </Section>

        <Section title='Policies' subtitle='Shown on room details and payment screens so guests understand important rules before paying.'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <FieldLabel helper='Standard earliest check-in time.'>Check-in Time</FieldLabel>
              <input value={form.checkInTime} onChange={e => setForm({...form, checkInTime: e.target.value})}
               type='time' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
            </div>
            <div>
              <FieldLabel helper='Standard latest check-out time.'>Check-out Time</FieldLabel>
              <input value={form.checkOutTime} onChange={e => setForm({...form, checkOutTime: e.target.value})}
               type='time' className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
            </div>
          </div>
          <div className='mt-4'>
            <FieldLabel helper='Example: Free cancellation until 24 hours before arrival; late cancellations may be charged one night.'>Cancellation Policy</FieldLabel>
            <textarea value={form.cancellationPolicy} onChange={e => setForm({...form, cancellationPolicy: e.target.value})}
             rows={3} className='border border-gray-300 mt-2 rounded-lg p-2.5 w-full outline-none focus:border-primary' />
          </div>
        </Section>
      </div>

      <div className='sticky bottom-0 mt-8 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-4 -mx-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-xs text-gray-500'>
          {saving ? 'Saving hotel settings...' : 'Changes affect the public site and booking flow after saving.'}
        </p>
        <button className='bg-primary text-white px-8 py-2.5 rounded-lg cursor-pointer disabled:opacity-60' disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

export default Settings
