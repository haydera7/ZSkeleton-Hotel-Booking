import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets, facilityIcons, roomCommonData } from '../assets/assets';
import BookingWidget from '../components/BookingWidget';
import { useAppContext } from '../context/AppContext';
import InquiryModal from '../components/InquiryModal';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const RoomDetails = () => {
    const {id} = useParams();
    const {rooms, formatCurrency, hotel, roomsLoading, roomsError} = useAppContext();

    const [room,setRoom] = useState(null);
    const [mainImage,setMainImage] = useState(null);
    const [isInquiryOpen, setIsInquiryOpen] = useState(false);

     useEffect(()=>{
       const room = rooms.find(room => room._id === id)
       setRoom(room || null)
       setMainImage(room?.images?.[0] || null)
     },[rooms, id])

  if(roomsLoading){
    return (
      <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
        <div className='animate-pulse max-w-5xl'>
          <div className='h-10 bg-gray-200 rounded w-2/3'></div>
          <div className='h-4 bg-gray-100 rounded w-1/2 mt-4'></div>
          <div className='grid lg:grid-cols-2 gap-6 mt-8'>
            <div className='h-96 bg-gray-100 rounded-xl'></div>
            <div className='grid grid-cols-2 gap-4'>
              {[1,2,3,4].map(item => <div key={item} className='h-44 bg-gray-100 rounded-xl'></div>)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if(roomsError){
    return (
      <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
        <div className='max-w-2xl border border-red-100 bg-red-50 rounded-lg p-6'>
          <h1 className='font-playfair text-3xl text-gray-900'>Room details are unavailable</h1>
          <p className='text-gray-600 mt-2'>We could not load room information right now. Please refresh the page or contact the hotel directly.</p>
        </div>
      </div>
    )
  }

  if(!room){
    return (
      <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
        <div className='max-w-2xl border border-gray-200 bg-gray-50 rounded-lg p-6'>
          <h1 className='font-playfair text-3xl text-gray-900'>Room not found</h1>
          <p className='text-gray-600 mt-2'>This room may no longer be available. Please return to the rooms page and choose another option.</p>
        </div>
      </div>
    )
  }

  const roomDescription = room.description?.trim()
    || `${room.roomType} at ${hotel?.name || room.hotel?.name || 'our hotel'} is prepared for a comfortable stay with practical amenities, clean bedding, and easy access to hotel services.`;
  const displayHotel = hotel || room.hotel || {};

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
        {/* Room Details */}
        <div className='flex flex-col md:flex-row items-start md:items-center gap-2'>
            <h1 className='text-3xl md:text-4xl font-playfair'>{displayHotel.name} <span className='font-inter text-sm' >({room.roomType})</span></h1>
        </div>

        {room.reviewCount > 0 && (
          <div className='flex items-center gap-1.5 mt-2 text-sm text-gray-600'>
            <img src={assets.starIconFilled} className='w-4 h-4' />
            <span className='font-medium'>{room.avgRating}</span>
            <span className='text-gray-400'>({room.reviewCount} review{room.reviewCount === 1 ? '' : 's'})</span>
          </div>
        )}

     {/* room adress  */}
        <div className='flex items-center gap-1 text-gray-500 mt-2'>
        <img src={assets.locationIcon} />
        <span>{displayHotel.address}</span>
        </div>
        <div className='flex items-center gap-1 text-gray-500 mt-2'>
        <img src={assets.guestsIcon} />
        <span>Up to {room.maxGuests || 2} guest(s)</span>
        </div>
        <p className='max-w-3xl text-gray-600 leading-7 mt-5'>{roomDescription}</p>
    
    {/* room images */}
    <div className='flex flex-col lg:flex-row mt-6 gap-6'>
        <div className='lg:w-1/2 w-full'>
           {mainImage ? (
            <img src={mainImage}
             className='w-full rounded-xl shadow-lg object-cover' />
           ) : (
            <div className='w-full min-h-80 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400'>
              Room image unavailable
            </div>
           )}
        </div>
        <div className='grid grid-cols-2 gap-4 lg:w-1/2 w-full'>
            {room?.images?.length > 1 && room.images.map((image,index)=>(
                <img onClick={()=> setMainImage(image)}
                 key={index} src={image}
                    className={`w-full rounded-xl shadow-md object-cover cursor-pointer ${mainImage === image && 'outline-3 outline-orange-500'}`}
                 />
            ))}
        </div>
    </div>

    {/* room highlights */}
     <div className='flex flex-col md:flex-row md:justify-between mt-10'>
       <div className='flex flex-col'>
        <h1 className='text-3xl md:text-4xl font-playfair'>{room.roomType} Features</h1>
        <div className='flex flex-wrap items-center mt-3 mb-6 gap-4'>
            {room.amenities?.map((item,index)=>(
                <div key={index}  className='flex items-center gap-2 px-3 py-2
                rounded-lg bg-gray-100'>
                 {facilityIcons[item] && <img src={facilityIcons[item]} className='w-5 h-5' alt={item} />}
                <p className='text-xs'>{item}</p>
                </div>
            ))}
        </div>
       </div>
       {/* room price */}
       <p className='text-2xl font-medium'>{formatCurrency(room.pricePerNight)}/night</p>
     </div>

     {hotel?.policies?.cancellationPolicy && (
      <div className='mt-8 max-w-3xl rounded-lg border border-gray-200 bg-gray-50 p-4'>
        <p className='text-sm font-medium text-gray-800'>Cancellation Policy</p>
        <p className='text-sm text-gray-600 mt-1'>{hotel.policies.cancellationPolicy}</p>
      </div>
     )}

     <div className='mt-8 max-w-3xl'>
      <AvailabilityCalendar roomId={id} />
     </div>

     {/* booking widget - no login required */}
     <BookingWidget roomId={id} />

      {/* common specifications */}
      <div className='mt-25 space-y-4'>
         {roomCommonData.map((spec,index)=>(
            <div key={index} className='flex items-start gap-2'>
            <img src={spec.icon}  alt={`${spec.title}`} className='w-6.5'/>
            <div> 
              <p className='text-base'>{spec.title}</p>
               <p className='text-gray-500'>{spec.description}</p>
            </div>
           </div>
         ))}
      </div>
    
      {/* Hotel info */}
      <div className='flex flex-col items-start gap-4'>
         <div className='flex gap-4 items-center'>
            <div>
                <p className='text-lg md:text-xl' >Hosted by  {displayHotel.name}</p>
            </div>
         </div>
         <button onClick={() => setIsInquiryOpen(true)}
          className='px-6 py-2.5 mt-4 rounded text-white bg-primary
         hover:bg-primary-dull transition-all cursor-pointer'>Contact Now</button>
      </div>

      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        type='general'
        title={`Contact ${displayHotel.name || 'the hotel'}`}
      />
    </div>
  )
}

export default RoomDetails
