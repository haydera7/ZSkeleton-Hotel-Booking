import React from 'react'
import Navbar from './components/Navbar'
import {Route,Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Footer from './components/Footer'
import AllRooms from './pages/AllRooms'
import RoomDetails from './pages/RoomDetails'
import MyBookings from './pages/MyBookings'
import Layout from './pages/hotelOwner/Layout'
import Dashboard from './pages/hotelOwner/Dashboard'
import ListRoom from './pages/hotelOwner/ListRoom'
import Bookings from './pages/hotelOwner/Bookings'
import Payments from './pages/hotelOwner/Payments'
import Settings from './pages/hotelOwner/Settings'
import Staff from './pages/hotelOwner/Staff'
import Reviews from './pages/hotelOwner/Reviews'
import RequireAdmin from './components/RequireAdmin'
import RequirePaymentStaff from './components/RequirePaymentStaff'
import RequireBookingStaff from './components/RequireBookingStaff'
import RequireStaff from './components/RequireStaff'
import {Toaster} from 'react-hot-toast'
import Loader from './components/Loader'
import About from './pages/About'
import Contact from './pages/Contact'

const App = () => {
  const isAdminPath = useLocation().pathname.includes("admin");

  return (
    <div>
     <Toaster />
      {!isAdminPath && <Navbar />}
      <div className='min-h-[70vh]'>
        <Routes>
         <Route path='/' element={ <Home />} />
         <Route path='/rooms' element={ <AllRooms />} />
         <Route path='/about' element={<About />} />
         <Route path='/contact' element={<Contact />} />
          <Route path='/rooms/:id' element={ <RoomDetails />} />
           <Route path='/my-bookings' element={ <MyBookings />} />
            <Route path='/loader/:nextUrl' element={ <Loader />} />

           <Route path='/admin' element={<Layout />}>
               <Route index element={<Dashboard />} />
               <Route path='bookings' element={<RequireBookingStaff><Bookings /></RequireBookingStaff>} />
               <Route path='payments' element={<RequirePaymentStaff><Payments /></RequirePaymentStaff>} />
               <Route path='reviews' element={<RequireStaff><Reviews /></RequireStaff>} />
               <Route path='rooms' element={<RequireBookingStaff><ListRoom /></RequireBookingStaff>} />
               <Route path='list-room' element={<RequireBookingStaff><ListRoom /></RequireBookingStaff>} />
               <Route path='add-room' element={<RequireAdmin><ListRoom /></RequireAdmin>} />
               <Route path='settings' element={<RequireAdmin><Settings /></RequireAdmin>} />
               <Route path='staff' element={<RequireAdmin><Staff /></RequireAdmin>} />
           </Route>
        </Routes>
      </div>
     {!isAdminPath && <Footer />}
    </div>
  )
}

export default App
