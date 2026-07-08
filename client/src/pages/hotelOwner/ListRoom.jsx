import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'
import { assets } from '../../assets/assets'

const AMENITIES = ['Free WiFi', 'Free Breakfast', 'Room Service', 'Mountain View', 'Pool Access', 'Free View'];

const emptyEditForm = {
  roomType: '',
  description: '',
  pricePerNight: '',
  maxGuests: 2,
  amenities: [],
  isAvailable: true,
};

const emptyCreateForm = {
  roomType:'',
  description:'',
  pricePerNight: '',
  maxGuests: 2,
  amenities: {
    'Free WiFi' : false,
    'Free Breakfast' : false,
    'Room Service' : false,
    'Mountain View' : false,
    'Pool Access' : false,
  }
};

const emptyImages = {1: null, 2: null, 3: null, 4: null};

const ListRoom = () => {

    const [rooms,setRooms] = useState([])
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [editRoom, setEditRoom] = useState(null);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [deleteRoom, setDeleteRoom] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreateForm);
    const [images, setImages] = useState(emptyImages);
    const [creating, setCreating] = useState(false);
    const {axios,getToken,user,formatCurrency,isAdmin,fetchRooms: refreshPublicRooms} = useAppContext()

    const fetchAdminRooms= async () =>{
        setLoading(true);
        try {
           const {data} = await axios.get('/api/rooms/admin',  {headers:{Authorization: `Bearer ${await getToken()}`}})

           if(data.success){
            setRooms(data.rooms)
           }else {
             toast.error(data.message)
           }
        } catch (error) {
            toast.error(error.message)
        } finally {
          setLoading(false);
        }
    }

  const toggleAvailblity = async (roomId) => {
   setRooms(prevRooms =>
      prevRooms.map(room =>
         room._id === roomId
            ? { ...room, isAvailable: !room.isAvailable }
            : room
      )
   );

   try {
      const {data} = await axios.post(
         '/api/rooms/toggle-availbility',
         {roomId},
         {headers:{Authorization: `Bearer ${await getToken()}`}}
      );

     if(data.success){
            toast.success(data.message)
            fetchAdminRooms()
            refreshPublicRooms?.()
          }else{
              fetchAdminRooms()
               toast.error(data.message) 
            }

   } catch (error) {
      fetchAdminRooms()
      toast.error(error.message)
   }
} 

  const openEdit = (room) => {
    setEditRoom(room);
    setEditForm({
      roomType: room.roomType || '',
      description: room.description || '',
      pricePerNight: room.pricePerNight || '',
      maxGuests: room.maxGuests || 2,
      amenities: room.amenities || [],
      isAvailable: Boolean(room.isAvailable),
    });
  }

  const toggleAmenity = (amenity) => {
    setEditForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(item => item !== amenity)
        : [...prev.amenities, amenity],
    }));
  }

  const submitEdit = async (e) => {
    e.preventDefault();
    if(!editRoom) return;
    if(!editForm.roomType.trim() || !editForm.description.trim() || !editForm.pricePerNight || !editForm.maxGuests || editForm.amenities.length === 0){
      toast.error('Please fill in room type, description, price, guests, and amenities');
      return;
    }

    setUpdatingId(editRoom._id);
    try {
      const {data} = await axios.put(`/api/rooms/${editRoom._id}`, {
        ...editForm,
        pricePerNight: Number(editForm.pricePerNight),
        maxGuests: Number(editForm.maxGuests),
      }, {headers:{Authorization: `Bearer ${await getToken()}`}});

      if(data.success){
        toast.success(data.message);
        setEditRoom(null);
        fetchAdminRooms();
        refreshPublicRooms?.();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const confirmDelete = async () => {
    if(!deleteRoom) return;
    setDeletingId(deleteRoom._id);
    try {
      const {data} = await axios.delete(`/api/rooms/${deleteRoom._id}`, {
        headers:{Authorization: `Bearer ${await getToken()}`}
      });
      if(data.success){
        toast.success(data.message);
        setDeleteRoom(null);
        fetchAdminRooms();
        refreshPublicRooms?.();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  const submitCreate = async (e) => {
    e.preventDefault();
    const selectedAmenities = Object.keys(createForm.amenities).filter(key => createForm.amenities[key]);
    if(!createForm.roomType || !createForm.description.trim() || !createForm.pricePerNight || !createForm.maxGuests || selectedAmenities.length === 0 || !Object.values(images).some(image => image)){
      toast.error('Please fill in room type, description, price, guests, amenities, and at least one image');
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('roomType', createForm.roomType);
      formData.append('description', createForm.description);
      formData.append('pricePerNight', createForm.pricePerNight);
      formData.append('maxGuests', createForm.maxGuests);
      formData.append('amenities', JSON.stringify(selectedAmenities));
      Object.keys(images).forEach((key)=> {
        images[key] && formData.append('images', images[key]);
      });

      const {data} = await axios.post('/api/rooms/', formData, {headers:{Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        setCreateForm(emptyCreateForm);
        setImages(emptyImages);
        setShowCreate(false);
        fetchAdminRooms();
        refreshPublicRooms?.();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

    useEffect(()=>{
         if(user){
            fetchAdminRooms()
         }
    },[user])

    const summary = useMemo(() => ({
      total: rooms.length,
      active: rooms.filter(room => room.isAvailable).length,
      hidden: rooms.filter(room => !room.isAvailable).length,
      avgPrice: rooms.length ? Math.round(rooms.reduce((sum, room) => sum + Number(room.pricePerNight || 0), 0) / rooms.length) : 0,
    }), [rooms]);

  return (
    <div className='pb-12 max-w-7xl'>
       <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <Title align='left' font='outfit' title='Rooms' subtitle='Add, view, edit, hide, or delete rooms from one place. Keep room information current so guests see accurate prices, capacity, and amenities.'/>
        <button type='button' onClick={() => setShowCreate(true)} disabled={!isAdmin}
          className='rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dull disabled:opacity-40 disabled:cursor-not-allowed'>
          + Add Room
        </button>
       </div>

       <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8'>
        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs uppercase text-gray-400'>Total Rooms</p>
          <p className='text-2xl font-semibold text-gray-900 mt-1'>{summary.total}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs uppercase text-gray-400'>Available Online</p>
          <p className='text-2xl font-semibold text-emerald-700 mt-1'>{summary.active}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs uppercase text-gray-400'>Hidden Rooms</p>
          <p className='text-2xl font-semibold text-amber-700 mt-1'>{summary.hidden}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs uppercase text-gray-400'>Average Price</p>
          <p className='text-2xl font-semibold text-gray-900 mt-1'>{formatCurrency(summary.avgPrice)}</p>
        </div>
       </div>

       {loading ? (
        <p className='mt-10 text-gray-500'>Loading rooms...</p>
       ) : rooms.length === 0 ? (
        <div className='mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center'>
          <p className='font-medium text-gray-900'>No rooms listed yet</p>
          <p className='text-sm text-gray-500 mt-1'>Add your first room so guests can start booking.</p>
        </div>
       ) : (
        <div className='mt-8 grid grid-cols-1 xl:grid-cols-2 gap-5'>
          {rooms.map((room)=>(
            <article key={room._id} className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
              <div className='flex flex-col sm:flex-row'>
                <div className='relative sm:w-48 shrink-0'>
                  <img src={room.images?.[0]} alt={room.roomType} className='h-52 sm:h-full w-full object-cover bg-gray-100' />
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium ${
                    room.isAvailable ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-white'
                  }`}>
                    {room.isAvailable ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div className='flex flex-1 flex-col gap-3 p-5'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <h3 className='font-playfair text-2xl text-gray-950'>{room.roomType}</h3>
                      <p className='text-sm text-gray-500'>Up to {room.maxGuests || 2} guest{Number(room.maxGuests || 2) === 1 ? '' : 's'}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-lg font-semibold text-gray-900'>{formatCurrency(room.pricePerNight)}</p>
                      <p className='text-xs text-gray-400'>per night</p>
                    </div>
                  </div>

                  {room.description && (
                    <p className='text-sm text-gray-600 leading-6 line-clamp-2'>{room.description}</p>
                  )}

                  <div className='flex flex-wrap gap-2'>
                    {room.amenities?.slice(0, 4).map((amenity) => (
                      <span key={amenity} className='rounded-full bg-slate-50 border border-gray-100 px-3 py-1 text-xs text-gray-600'>{amenity}</span>
                    ))}
                    {room.amenities?.length > 4 && <span className='text-xs text-gray-400 py-1'>+{room.amenities.length - 4} more</span>}
                  </div>

                  <div className='mt-auto flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                    <label className='relative inline-flex items-center cursor-pointer text-gray-900 gap-3'>
                      <input onChange={()=> toggleAvailblity(room._id)} type='checkbox' className="sr-only peer" checked={room.isAvailable} />
                      <div className='w-12 h-7 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200'></div>
                      <span className='dot absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5'></span>
                      <span className='text-sm text-gray-600'>{room.isAvailable ? 'Available online' : 'Hidden from guests'}</span>
                    </label>

                    <div className='flex items-center gap-2'>
                      <button type='button' onClick={() => openEdit(room)}
                        disabled={!isAdmin}
                        className='rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                        Edit
                      </button>
                      <button type='button' onClick={() => setDeleteRoom(room)}
                        disabled={!isAdmin}
                        className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                        Delete
                      </button>
                    </div>
                  </div>
                  {!isAdmin && <p className='text-xs text-gray-400'>Only admins can edit or delete room records.</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
       )}

       {editRoom && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <form onSubmit={submitEdit} className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-xl font-semibold text-gray-900'>Edit Room</h3>
                <p className='text-sm text-gray-500 mt-1'>Update the details guests see before booking.</p>
              </div>
              <button type='button' onClick={() => setEditRoom(null)} className='text-gray-400 hover:text-gray-700 text-2xl leading-none'>×</button>
            </div>

            <div className='grid gap-4 sm:grid-cols-3 mt-6'>
              <div className='sm:col-span-1'>
                <p className='text-sm font-medium text-gray-700'>Room Type</p>
                <select value={editForm.roomType} onChange={e => setEditForm({...editForm, roomType: e.target.value})}
                 className='mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary'>
                  <option value='Single Bed'>Single Bed</option>
                  <option value='Double Bed'>Double Bed</option>
                  <option value='Luxury Room'>Luxury Room</option>
                  <option value='Family Suite'>Family Suite</option>
                </select>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-700'>Price / night</p>
                <input value={editForm.pricePerNight} onChange={e => setEditForm({...editForm, pricePerNight: e.target.value})}
                 type='number' min='1' className='mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary' />
              </div>
              <div>
                <p className='text-sm font-medium text-gray-700'>Max Guests</p>
                <input value={editForm.maxGuests} onChange={e => setEditForm({...editForm, maxGuests: e.target.value})}
                 type='number' min='1' className='mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary' />
              </div>
            </div>

            <div className='mt-4'>
              <p className='text-sm font-medium text-gray-700'>Description</p>
              <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                rows={4} maxLength={700}
                className='mt-1 w-full resize-none rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary' />
              <p className='text-xs text-gray-400 mt-1'>{editForm.description.length}/700 characters</p>
            </div>

            <div className='mt-4'>
              <p className='text-sm font-medium text-gray-700'>Amenities</p>
              <div className='mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {AMENITIES.map((amenity) => (
                  <label key={amenity} className='flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 cursor-pointer'>
                    <input type='checkbox' checked={editForm.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>

            <label className='mt-4 flex items-center gap-2 text-sm text-gray-700'>
              <input type='checkbox' checked={editForm.isAvailable} onChange={e => setEditForm({...editForm, isAvailable: e.target.checked})} />
              Available to guests online
            </label>

            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button type='button' onClick={() => setEditRoom(null)}
                className='rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                Cancel
              </button>
              <button type='submit' disabled={updatingId === editRoom._id}
                className='rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dull disabled:opacity-60'>
                {updatingId === editRoom._id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
       )}

       {showCreate && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <form onSubmit={submitCreate} className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-xl font-semibold text-gray-900'>Add Room</h3>
                <p className='text-sm text-gray-500 mt-1'>Create a room guests can see and book from the public site.</p>
              </div>
              <button type='button' onClick={() => setShowCreate(false)} className='text-gray-400 hover:text-gray-700 text-2xl leading-none'>×</button>
            </div>

            <div className='mt-6'>
              <p className='text-sm font-medium text-gray-700'>Images</p>
              <p className='text-xs text-gray-500 mt-1'>Upload at least one clear room photo. Up to four images are supported.</p>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3'>
                {Object.keys(images).map((key)=>(
                  <label htmlFor={`roomImage${key}`} key={key} className='cursor-pointer'>
                    <img className='h-28 w-full rounded-lg border border-gray-200 object-cover bg-gray-50'
                      src={images[key] ? URL.createObjectURL(images[key]) : assets.uploadArea} alt='Upload room' />
                    <input type='file' accept='image/*' id={`roomImage${key}`} hidden
                      onChange={e => setImages({...images,[key]: e.target.files[0]})}/>
                  </label>
                ))}
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3 mt-5'>
              <div>
                <p className='text-sm font-medium text-gray-700'>Room Type</p>
                <select value={createForm.roomType} onChange={e => setCreateForm({...createForm, roomType: e.target.value})}
                  className='mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary'>
                  <option value=''>Select Room Type</option>
                  <option value='Single Bed'>Single Bed</option>
                  <option value='Double Bed'>Double Bed</option>
                  <option value='Luxury Room'>Luxury Room</option>
                  <option value='Family Suite'>Family Suite</option>
                </select>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-700'>Price / night</p>
                <input value={createForm.pricePerNight} onChange={e => setCreateForm({...createForm, pricePerNight: e.target.value})}
                  type='number' min='1' placeholder='0' className='mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary' />
              </div>
              <div>
                <p className='text-sm font-medium text-gray-700'>Max Guests</p>
                <input value={createForm.maxGuests} onChange={e => setCreateForm({...createForm, maxGuests: e.target.value})}
                  type='number' min='1' placeholder='2' className='mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary' />
              </div>
            </div>

            <div className='mt-4'>
              <p className='text-sm font-medium text-gray-700'>Room Description</p>
              <textarea value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})}
                rows={4} maxLength={700}
                placeholder='Describe the room layout, bed setup, view, bathroom, and what makes this room suitable for guests.'
                className='mt-1 w-full resize-none rounded-lg border border-gray-300 p-2.5 outline-none focus:border-primary' />
              <p className='text-xs text-gray-400 mt-1'>{createForm.description.length}/700 characters</p>
            </div>

            <div className='mt-4'>
              <p className='text-sm font-medium text-gray-700'>Amenities</p>
              <div className='mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {Object.keys(createForm.amenities).map((amenity) => (
                  <label key={amenity} className='flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 cursor-pointer'>
                    <input type='checkbox' checked={createForm.amenities[amenity]}
                      onChange={() => setCreateForm({...createForm, amenities: {...createForm.amenities, [amenity]: !createForm.amenities[amenity]}})} />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>

            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button type='button' onClick={() => setShowCreate(false)}
                className='rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                Cancel
              </button>
              <button type='submit' disabled={creating}
                className='rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dull disabled:opacity-60'>
                {creating ? 'Adding...' : 'Add Room'}
              </button>
            </div>
          </form>
        </div>
       )}

       {deleteRoom && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <h3 className='text-xl font-semibold text-gray-900'>Delete Room?</h3>
            <p className='text-sm text-gray-600 mt-2'>
              This will permanently delete <span className='font-medium text-gray-900'>{deleteRoom.roomType}</span> only if it has no booking history.
              If it has bookings, the system will ask you to hide it instead.
            </p>
            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button type='button' onClick={() => setDeleteRoom(null)}
                className='rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                Cancel
              </button>
              <button type='button' onClick={confirmDelete} disabled={deletingId === deleteRoom._id}
                className='rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60'>
                {deletingId === deleteRoom._id ? 'Deleting...' : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
       )}
    </div>
  )
}

export default ListRoom
