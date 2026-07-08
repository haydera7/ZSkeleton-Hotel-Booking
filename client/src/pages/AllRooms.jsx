import React, { useEffect, useMemo, useState } from 'react'
import { assets, facilityIcons } from '../assets/assets'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext';

const CheckBox = ({label,selected=false,onChange = () => {}}) =>{
    return  <label className='flex gap-3 items-center cursor-pointer mt-2 text-sm'>
        <input type='checkbox' checked={selected} onChange={(e)=>onChange(e.target.checked,label)}/>
        <span className='font-light select-none'>{label}</span>
    </label>
}

const RadioButton = ({label,selected=false,onChange = () => {}}) =>{
    return  <label className='flex gap-3 items-center cursor-pointer mt-2 text-sm'>
        <input type='radio' name='sortOption' checked={selected} onChange={()=>onChange(label)}/>
        <span className='font-light select-none'>{label}</span>
    </label>
}

const AllRooms = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const{rooms,navigate,formatCurrency, axios, roomsLoading, roomsError, hotel} = useAppContext();
  const detailsPath = (roomId) => `/rooms/${roomId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const searchedGuests = Number(searchParams.get('guests') || 0);
  const hasDateSearch = Boolean(checkIn && checkOut);

    const [openFilters,setOpenFilters] = useState(false);
    const [availableRoomIds, setAvailableRoomIds] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState({
       roomType : [],
       priceRange : [],
    });

    const [selectedSort, setSelectedSort] = useState('')

    const roomTypes = [
        "Single Bed",
        "Double Bed",
        "Luxury Room",
        "Family Suite",
    ];

    const priceRange = [
        '0 to 500',
        '500 to 1000',
        '1000 to 2000',
        '2000 to 3000',
    ];

    const sortOptions = [
        "Price Low to High",
        "Price High to Low",
        "Newest First"
    ];

    const formatPriceRange = (range) => {
      const [min,max] = range.split(' to ').map(Number);
      return `${formatCurrency(min)} to ${formatCurrency(max)}`;
    }

    useEffect(() => {
      let cancelled = false;

      const filterAvailableRooms = async () => {
        if (!hasDateSearch) {
          setAvailableRoomIds(null);
          setCheckingAvailability(false);
          return;
        }

        setCheckingAvailability(true);
        try {
          const results = await Promise.all(rooms.map(async (room) => {
            const { data } = await axios.post('/api/bookings/check-availability', {
              room: room._id,
              checkInDate: checkIn,
              checkOutDate: checkOut,
              guests: searchedGuests || undefined,
            });
            return data.success && data.isAvailable ? room._id : null;
          }));

          if (!cancelled) {
            setAvailableRoomIds(new Set(results.filter(Boolean)));
          }
        } catch (error) {
          if (!cancelled) setAvailableRoomIds(new Set());
        } finally {
          if (!cancelled) setCheckingAvailability(false);
        }
      };

      filterAvailableRooms();
      return () => { cancelled = true; };
    }, [axios, rooms, hasDateSearch, checkIn, checkOut, searchedGuests]);

    // Handle Changes for filters and sorting
    const handleFilterChange = (checked, value,type) =>{
       setSelectedFilters((prevFilters)=>{
         const updatedFilters = {...prevFilters};
          if(checked){
             updatedFilters[type].push(value);
          }else {
            updatedFilters[type] = updatedFilters[type].filter(item => item !== value );
          }
          return updatedFilters;
       })
    }


    const handleSortChange = (sortOption) =>{
       setSelectedSort(sortOption);
    }

    // Function to check if a room matches the selected room types
    const matchesRoomType = (room) => {
         return selectedFilters.roomType.length === 0 || selectedFilters.roomType.includes(room.roomType);
    }

    //  Function to check if a room matches the selected price ranges
     const  matchesPriceRange  = (room) => {
           return selectedFilters.priceRange.length === 0 || selectedFilters.priceRange.some(range => {
              const [min,max] = range.split(' to ').map(Number);
              return room.pricePerNight >= min && room.pricePerNight <= max;
           });
     }

     //  Function to  sort rooms based on the selected sort option
     const sortRooms = (a,b) => {
         if(selectedSort === "Price Low to High"){
             return a.pricePerNight - b.pricePerNight;
         }
         if(selectedSort === "Price High to Low" ){
           return b.pricePerNight - a.pricePerNight;
         }
         if(selectedSort === "Newest First"){
           return new Date(b.createdAt) - new Date(a.createdAt)
         }
         return 0;
     }

       //Filter and Sort based on the selectedvfilters and sort options
       const filterRooms = useMemo(()=>{
          return rooms
            .filter(room => !availableRoomIds || availableRoomIds.has(room._id))
            .filter(room => !searchedGuests || searchedGuests <= (Number(room.maxGuests) || 2))
            .filter(room => matchesRoomType(room) && matchesPriceRange(room))
            .sort(sortRooms);
       },[rooms, selectedFilters, selectedSort, availableRoomIds, searchedGuests])

      // Clear All filters 
      
      const clearFilters = () => {
         setSelectedFilters({
           roomType: [],
           priceRange: [],
         });
         setSelectedSort('');
         setSearchParams({});
      }
  return (
    <div className='flex flex-col-reverse lg:flex-row items-start 
    justify-between pt-28 md:pt-35 px-4 lg:px-24' >
      <div className='w-full'>
         <div className='flex flex-col items-start text-left'>
            <h1 className='font-playfair text-4xl md:text-[40px]'>Our Rooms</h1>
            <p className='text-sm md:text-base text-gray-500/90 mt-2 max-w-174'>
            Browse our available rooms and find the right fit for your stay.</p>
            {(searchParams.get('checkIn') || searchParams.get('guests')) && (
              <p className='text-sm text-gray-600 mt-3 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5'>
                Searching{searchParams.get('checkIn') && ` from ${searchParams.get('checkIn')}`}
                {searchParams.get('checkOut') && ` to ${searchParams.get('checkOut')}`}
                {searchParams.get('guests') && ` · ${searchParams.get('guests')} guest(s)`}
                {hasDateSearch ? ' - showing rooms available for these dates.' : ' - select a room below to check availability.'}
              </p>
            )}
         </div>

       {roomsLoading && (
         <div className='py-10 space-y-8'>
          {[1,2,3].map(item => (
            <div key={item} className='flex flex-col md:flex-row gap-6 animate-pulse'>
              <div className='h-64 md:w-1/2 rounded-xl bg-gray-100'></div>
              <div className='md:w-1/2 space-y-4'>
                <div className='h-4 bg-gray-100 rounded w-24'></div>
                <div className='h-8 bg-gray-200 rounded w-2/3'></div>
                <div className='h-4 bg-gray-100 rounded w-full'></div>
                <div className='h-4 bg-gray-100 rounded w-5/6'></div>
                <div className='h-6 bg-gray-100 rounded w-32'></div>
              </div>
            </div>
          ))}
         </div>
       )}

       {!roomsLoading && roomsError && (
         <div className='mt-10 max-w-2xl border border-red-100 bg-red-50 rounded-lg p-6'>
          <p className='font-medium text-gray-900'>Rooms could not be loaded</p>
          <p className='text-sm text-gray-600 mt-2'>Please refresh the page or contact the hotel directly. The booking system may be temporarily unavailable.</p>
         </div>
       )}

       {!roomsLoading && !roomsError && checkingAvailability && (
         <p className='text-sm text-gray-400 py-8'>Checking room availability...</p>
       )}

       {!roomsLoading && !roomsError && filterRooms.map((room)=>{
        const displayHotel = hotel || room.hotel || {};
        return (
          <div key={room._id} className='flex flex-col md:flex-row items-start py-10 gap-6
          border-b border-gray-300 last:pb-30 last:border-0'> 
              <img onClick={()=> {navigate(detailsPath(room._id)); scrollTo(0,0) }}
             src={room.images[0]} alt='hotel-img' title='View Room Details '
               className='max-h-65 md:w-1/2 rounded-xl shadow-lg object-cover cursor-pointer'
            />
               <div className='md:w-1/2 flex flex-col gap-2'> 
                 <p className='text-gray-500'>{displayHotel.city}</p>
                 <p onClick={()=> {navigate(detailsPath(room._id)); scrollTo(0,0) }}
                  className='text-gray-800 text-3xl font-playfair  cursor-pointer'>{displayHotel.name}</p>
                 <div className='flex items-center gap-1 text-gray-500 mt-2 text-sm'> 
                  <img src={assets.locationIcon} />
                  <span>{displayHotel.address}</span>
                 </div>
                 <div className='flex items-center gap-1 text-gray-500 mt-1 text-sm'>
                  <img src={assets.guestsIcon} />
                  <span>Up to {room.maxGuests || 2} guest(s)</span>
                 </div>
                 {room.description && (
                  <p className='text-sm text-gray-600 leading-6 mt-2 line-clamp-3'>{room.description}</p>
                 )}
                 {/* aminities */}
                <div className='flex flex-wrap items-center mt-3 mb-6 gap-4 '>
                 {room.amenities.map((item,index)=>(
                    <div key={index}  className='flex items-center gap-2 
                    px-3 py-2 rounded-lg bg-[#F5F5FF]'>
                    {facilityIcons[item] && <img src={facilityIcons[item]} alt={item} 
                    className='w-5 h-5'/>
                    }
                    <p className='text-xs'>{item}</p>
                    </div>
                 ))}
                </div>

                {/* Room price per night  */}
                  <p className='text-xl font-medium text-gray-700'>{formatCurrency(room.pricePerNight)} /night</p>
            </div>
          </div>
       )})}

       {!roomsLoading && !roomsError && !checkingAvailability && filterRooms.length === 0 && (
         <div className='mt-10 max-w-2xl border border-gray-200 bg-gray-50 rounded-lg p-6'>
          <p className='font-medium text-gray-900'>{rooms.length === 0 ? 'No rooms are listed yet' : 'No rooms match your search'}</p>
          <p className='text-sm text-gray-600 mt-2'>
            {rooms.length === 0
              ? 'The hotel has not published rooms yet. Please contact the hotel directly for availability.'
              : 'Try changing your dates, guest count, filters, or price range.'}
          </p>
         </div>
       )}
      </div>

      {/*Filters*/}
      <div className='bg-white  w-80 border border-gray-300 text-gray-600
      max-lg:mb-8 min-lg:mt-16'>
       <div className={`flex items-center justify-between px-5 py-2.5
       min-lg:border-b border-gray-300 ${openFilters && "border-b"}`}>
         <p className='text-base font-medium text-gray-800'>FILTERS</p>
         <div className='text-xs cursor-pointer'>
              <span  onClick={()=> setOpenFilters(!openFilters)}
               className='lg:hidden' >
              {openFilters ? 'HIDE' : 'SHOW'}</span>
              <span onClick={clearFilters} className='hidden lg:block'>CLEAR</span>
         </div>
       </div>

       <div className={`${openFilters ? 'h-auto' : "h-0 lg:h-auto"} 
       overflow-hidden transition-all duration-700`}>
         <div className='px-5 pt-5'>
           <p className='text-gray-800 font-medium pb-2 '>Popular filters</p>
            {roomTypes.map((room,index)=>(
                <CheckBox key={index} label={room} selected={selectedFilters.roomType.includes(room)}  onChange={(checked)=> handleFilterChange(checked, room, 'roomType')}/>
            ))}
         </div>

          <div className='px-5 pt-5'>
           <p className='text-gray-800 font-medium pb-2 '>Price Range</p>
            {priceRange.map((range,index)=>(
                <CheckBox key={index} label={formatPriceRange(range)} selected={selectedFilters.priceRange.includes(range)}  onChange={(checked)=> handleFilterChange(checked, range, 'priceRange')}/>
            ))}
         </div>

         <div className='px-5 pt-5 pb-7'>
           <p className='text-gray-800 font-medium pb-2 '>Sort By</p>
            {sortOptions.map((option,index)=>(
                <RadioButton key={index} label={option}  selected={selectedSort === option} onChange={() => handleSortChange(option)} />
               
            ))} 
         </div>

       </div>
      </div>
    </div>
  )
}

export default AllRooms
