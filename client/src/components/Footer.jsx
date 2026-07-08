import React from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import BrandLogo from './BrandLogo'

const Footer = () => {
  const { hotel } = useAppContext();

  return (
    <footer className='bg-[#F6F9FC] text-gray-500/80 px-6 md:px-16 lg:px-24 xl:px-32 pt-14'>
            <div className='mx-auto grid max-w-7xl grid-cols-1 gap-10 border-b border-gray-200 pb-10 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]'>
                <div className='max-w-sm'>
                    <div className='flex items-center gap-3'>
                      <BrandLogo className='text-gray-900' textClassName='font-playfair font-normal' />
                    </div>
                    <p className='mt-5 text-sm leading-6'>
                       {hotel?.description || `Comfortable rooms and warm hospitality in ${hotel?.city || 'Ethiopia'}.`}
                    </p>
                    {hotel?.city && (
                      <p className='mt-4 text-sm font-medium text-gray-700'>{hotel.city}, Ethiopia</p>
                    )}
                </div>

                <div>
                    <p className='font-playfair text-lg text-gray-800'>Explore</p>
                    <ul className='mt-4 flex flex-col gap-3 text-sm'>
                        <li><Link to="/rooms">Rooms</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                    </ul>
                </div>

                <div>
                    <p className='font-playfair text-lg text-gray-800'>Support</p>
                    <ul className='mt-4 flex flex-col gap-3 text-sm'>
                        <li><Link to="/my-bookings">Find My Booking</Link></li>
                        {hotel?.policies?.cancellationPolicy && <li>Cancellation Policy</li>}
                        {hotel?.policies?.checkInTime && <li>Check-in {hotel.policies.checkInTime}</li>}
                        {hotel?.policies?.checkOutTime && <li>Check-out {hotel.policies.checkOutTime}</li>}
                    </ul>
                </div>

                <div className='max-w-80'>
                    <p className='font-playfair text-lg text-gray-800'>Get In Touch</p>
                    <p className='mt-4 text-sm leading-6'>
                        {hotel?.address}{hotel?.city ? `, ${hotel.city}` : ''}
                    </p>
                    {hotel?.contact && <p className='text-sm mt-1'>{hotel.contact}</p>}
                    {hotel?.email && <p className='text-sm mt-1'>{hotel.email}</p>}
                </div>
            </div>
            <div className='mx-auto flex max-w-7xl flex-col md:flex-row gap-2 items-center justify-between py-6 text-sm'>
                <p>© {new Date().getFullYear()} {hotel?.name || 'Our Hotel'}. All rights reserved.</p>
                <Link to="/my-bookings" className='text-gray-700 hover:text-primary'>Find My Booking</Link>
            </div>
        </footer>
  )
}

export default Footer
