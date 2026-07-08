import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const Hero = () => {

    const {navigate, hotel, hotelError} = useAppContext()

    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [guests, setGuests] = useState('');

    const onSearch = (e) => {
        e.preventDefault();
        if(checkInDate && checkOutDate && checkInDate >= checkOutDate){
            toast.error('Check-out date must be after check-in date');
            return;
        }
        const params = new URLSearchParams();
        if(checkInDate) params.set('checkIn', checkInDate);
        if(checkOutDate) params.set('checkOut', checkOutDate);
        if(guests) params.set('guests', guests);
        navigate(`/rooms${params.toString() ? `?${params.toString()}` : ''}`)
    }

  return (
    <div className='flex flex-col items-start justify-center px-6
    md:px-16 lg:px-24 xl:px-32 text-white bg-[url("/src/assets/heroImage.png")] 
    bg-no-repeat bg-cover bg-center h-screen'>
       <p className='bg-[#49B9FF]/50 px-3.5 py-1 rounded-full mt-20'>Welcome to {hotel?.name || 'our hotel'}</p>
       <h1 className='font-playfair text-2xl md:text-5xl md:text-[56px] md:leading-[56px]
       font-bold md:font-extrabold max-w-xl mt-4'>Your Comfortable Stay in {hotel?.city || 'Ethiopia'}</h1>
       <p className='max-w-130 mt-2 text-sm md:text-base'>
       {hotel?.description || 'Warm hospitality, comfortable rooms, and easy access to the city - book your stay today.'}
       </p>
       {hotelError && (
        <p className='mt-3 max-w-130 rounded-md bg-white/90 px-4 py-2 text-sm text-gray-700'>
          Hotel details are temporarily limited. You can still search rooms or contact us for help.
        </p>
       )}

       <form onSubmit={onSearch} className='bg-white text-gray-500 rounded-lg px-6 py-4 mt-8  flex flex-col md:flex-row max-md:items-start gap-4 max-md:mx-auto'>

            <div>
                <div className='flex items-center gap-2'>
                   <img src={assets.calenderIcon} className='h-4'/>
                    <label htmlFor="checkIn">Check in</label>
                </div>
                <input value={checkInDate} onChange={e => setCheckInDate(e.target.value)}
                 min={new Date().toISOString().split('T')[0]}
                 id="checkIn" type="date" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} className='h-4'/>
                    <label htmlFor="checkOut">Check out</label>
                </div>
                <input value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)}
                 min={checkInDate || new Date().toISOString().split('T')[0]}
                 id="checkOut" type="date" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div className='flex md:flex-col max-md:gap-2 max-md:items-center'>
                <label htmlFor="guests">Guests</label>
                <input value={guests} onChange={e => setGuests(e.target.value)}
                 min={1} max={4} id="guests" type="number" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none  max-w-16" placeholder="1" />
            </div>

            <button className='flex items-center justify-center gap-1 rounded-md bg-black py-3 px-4 text-white my-auto cursor-pointer max-md:w-full max-md:py-1' >
                <img src={assets.searchIcon} alt='searchIcon' className='h-7'/>
                <span>Search</span>
            </button>
        </form>
    </div>
  )
}

export default Hero
