import React from 'react'
import Hotelcard from './Hotelcard'
import Title from './Title'
import { useAppContext } from '../context/AppContext'

const FeaturedDestination = () => {
  
  const {rooms,navigate, roomsLoading, roomsError} = useAppContext();

  if(roomsLoading){
    return (
      <section className='px-6 md:px-16 lg:px-24 bg-slate-50 py-16 md:py-20'>
        <Title title='Featured Rooms' subtitle='A closer look at some of our most popular room types.' />
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-12 w-full max-w-7xl mx-auto'>
          {[1,2,3,4].map(item => (
            <div key={item} className='bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse'>
              <div className='h-48 bg-gray-100'></div>
              <div className='p-4 space-y-3'>
                <div className='h-5 bg-gray-200 rounded w-2/3'></div>
                <div className='h-4 bg-gray-100 rounded'></div>
                <div className='h-4 bg-gray-100 rounded w-1/2'></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if(roomsError){
    return (
      <section className='px-6 md:px-16 lg:px-24 bg-slate-50 py-16 md:py-20'>
        <Title title='Featured Rooms' subtitle='A closer look at some of our most popular room types.' />
        <div className='mt-10 max-w-xl text-center border border-red-100 bg-white rounded-lg p-6'>
          <p className='font-medium text-gray-900'>Rooms are temporarily unavailable</p>
          <p className='text-sm text-gray-600 mt-2'>Please refresh the page or contact the hotel directly for current availability.</p>
        </div>
      </section>
    )
  }

  if(rooms.length === 0){
    return (
      <section className='px-6 md:px-16 lg:px-24 bg-slate-50 py-16 md:py-20'>
        <Title title='Featured Rooms' subtitle='A closer look at some of our most popular room types.' />
        <div className='mt-10 max-w-xl text-center border border-gray-200 bg-white rounded-lg p-6'>
          <p className='font-medium text-gray-900'>Rooms will be available soon</p>
          <p className='text-sm text-gray-600 mt-2'>The hotel has not published rooms yet. Please contact the hotel directly for availability.</p>
        </div>
      </section>
    )
  }

  return (
    <section className='px-6 md:px-16 lg:px-24 bg-slate-50 py-16 md:py-20'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-5'>
          <Title align='left' title='Featured Rooms' subtitle='A closer look at some of our most popular room types.' />
          <button onClick={()=>{navigate('/rooms'); scrollTo(0,0)}} className='px-4 py-2 text-sm font-medium border border-gray-300
          rounded bg-white hover:bg-gray-50 transition-all cursor-pointer self-start md:self-auto'>
              View All Rooms
          </button>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-10'>
           {rooms.slice(0,4).map((room,index)=>(
            <Hotelcard key={room._id} room={room} index={index}/>
           ))} 
        </div>
      </div>
    </section>
  )
}

export default FeaturedDestination
