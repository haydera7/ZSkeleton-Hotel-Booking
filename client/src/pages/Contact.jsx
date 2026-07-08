import React, { useState } from 'react'
import Title from '../components/Title'
import InquiryModal from '../components/InquiryModal'
import MapEmbed from '../components/MapEmbed'
import { useAppContext } from '../context/AppContext'

const Contact = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { hotel } = useAppContext();

  const fullAddress = hotel ? `${hotel.address}, ${hotel.city}` : '';

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
      <Title align='left' title='Contact Us' subtitle="Have a question? We'd
      love to hear from you." />

      <div className='flex flex-col md:flex-row gap-10 mt-10'>
        <div className='md:w-1/2 flex flex-col gap-3 text-gray-600'>
          {hotel ? (
            <>
              <p><strong>Address:</strong> {fullAddress}</p>
              <p><strong>Phone:</strong> {hotel.contact}</p>
              {hotel.email && <p><strong>Email:</strong> {hotel.email}</p>}
            </>
          ) : (
            <p className='text-gray-400'>Loading contact details...</p>
          )}
          <button onClick={() => setIsOpen(true)}
            className='bg-primary hover:bg-primary-dull text-white rounded-full px-8 py-3 cursor-pointer transition-all mt-2 self-start'>
            Send us a Message
          </button>
        </div>
        <div className='md:w-1/2'>
          <MapEmbed query={fullAddress} />
        </div>
      </div>

      <InquiryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        type='general'
        title='Contact Us'
      />
    </div>
  );
};

export default Contact