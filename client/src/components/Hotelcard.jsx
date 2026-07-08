import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
const Hotelcard = ({room,index}) => {
  const {formatCurrency, hotel} = useAppContext();
  const displayHotel = hotel || room.hotel || {};
  return (
    <Link to={'/rooms/' + room._id} onClick={()=> scrollTo(0,0)} key={room._id} 
    className='group relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'>
        <div className='relative aspect-[4/3] overflow-hidden bg-gray-100'>
          <img src={room.images?.[0]} alt={room.roomType}
            className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
          />
          {!room.reviewCount && <p className='px-3 py-1 absolute top-3 left-3 text-xs bg-white/95
          text-gray-800 font-medium rounded-full shadow-sm'>New</p>}
          {room.reviewCount > 0 && (
            <div className='absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs text-gray-800 shadow-sm'>
              <img src={assets.starIconFilled} alt='' className='h-3.5 w-3.5' />
              <span>{room.avgRating}</span>
              <span className='text-gray-400'>({room.reviewCount})</span>
            </div>
          )}
        </div>

        <div className='flex min-h-70 flex-col p-5'>
            <div>
              <p className='font-playfair text-2xl font-medium leading-tight text-gray-900'>{room.roomType}</p>
              <p className='text-xs text-gray-400 mt-1'>{displayHotel.name}</p>
            </div>

            <div className='mt-4 space-y-2 text-sm'>
              <div className='flex items-start gap-2'>
                  <img src={assets.locationIcon} alt='' className='mt-0.5 h-4 w-4 shrink-0 opacity-70' /> 
                  <span className='leading-5'>{displayHotel.address}</span>
              </div>
              <div className='flex items-center gap-2'>
                  <img src={assets.guestsIcon} alt='' className='h-4 w-4 shrink-0 opacity-70' /> 
                  <span>Up to {room.maxGuests || 2} guest(s)</span>
              </div>
            </div>

            <p className='mt-4 min-h-12 text-sm leading-6 text-gray-500'>
              {room.description || 'Comfortable room with practical amenities for a relaxed stay.'}
            </p>

            <div className='mt-auto flex items-center justify-between gap-4 pt-5'>
               <p className='leading-tight'>
                <span className='block text-xs text-gray-400'>From</span>
                <span className='text-2xl font-semibold text-gray-900'>{formatCurrency(room.pricePerNight)}</span>
                <span className='text-sm text-gray-500'> / night</span>
               </p> 
               <span className='rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition group-hover:border-gray-900 group-hover:bg-gray-900 group-hover:text-white'>
                Book
               </span>
            </div>
        </div>
    </Link>
  )
}

export default Hotelcard
