import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const EVENT_TYPES = ['Wedding Reception', 'Corporate Event', 'Birthday Celebration', 'Conference', 'Other'];

const InquiryModal = ({ isOpen, onClose, type = 'general', title, presetEventType }) => {
  const { axios, user } = useAppContext();

  const emptyForm = {
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    message: '',
    eventType: presetEventType || '',
    eventDate: '',
    guests: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/inquiries', { type, ...form });
      if (data.success) {
        toast.success(data.message);
        close();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4'
      onClick={close}
    >
      <div
        className='bg-white w-full max-w-md rounded-2xl shadow-xl p-8 relative max-h-[85vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className='absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer'
          onClick={close}
          aria-label='Close'
        >
          &times;
        </button>

        <h2 className='text-xl font-semibold text-gray-800 mb-6'>{title}</h2>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            <label className='text-sm text-gray-600'>Full Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              type='text' className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm text-gray-600'>Phone Number *</label>
            <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              type='tel' className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm text-gray-600'>Email (optional)</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              type='email' className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
          </div>

          {type === 'event' && (
            <>
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-gray-600'>Event Type</label>
                <select value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}
                  className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'>
                  <option value=''>Select event type</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='flex flex-col gap-1'>
                  <label className='text-sm text-gray-600'>Preferred Date</label>
                  <input value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })}
                    type='date' className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
                </div>
                <div className='flex flex-col gap-1'>
                  <label className='text-sm text-gray-600'>Guests</label>
                  <input value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })}
                    type='number' min='1' className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
                </div>
              </div>
            </>
          )}

          {type === 'room-service' && (
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-gray-600'>Room / Booking ID</label>
              <input value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })}
                type='text' placeholder='e.g. your Booking ID'
                className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
            </div>
          )}

          <div className='flex flex-col gap-1'>
            <label className='text-sm text-gray-600'>
              {type === 'room-service' ? 'What would you like? *' : 'Message *'}
            </label>
            <textarea required rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
              className='border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition' />
          </div>

          <button type='submit' disabled={submitting}
            className='bg-black text-white rounded-full py-2.5 mt-2 hover:opacity-90 transition disabled:opacity-50 cursor-pointer'>
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InquiryModal