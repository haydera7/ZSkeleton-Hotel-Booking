import React, { useEffect } from 'react'
import Navbar from '../../components/hotelOwner/Navbar'
import Sidebar from '../../components/hotelOwner/Sidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

const Layout = () => {

const {isStaff,navigate}= useAppContext()

useEffect(()=> {
  if(!isStaff){
    navigate('/')
  }
},[isStaff])
  return (
    <div className='min-h-screen bg-white'>
        <Navbar />
        <Sidebar />
          <div className='min-h-screen pt-28 pl-20 md:pl-72 pr-4 md:pr-10 pb-16'>
             <Outlet />
          </div>
    </div>
  )
}

export default Layout
