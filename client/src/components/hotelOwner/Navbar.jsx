import React from 'react'
import {Link } from 'react-router-dom'
import UserMenu from '../UserMenu'
import BrandLogo from '../BrandLogo'

const Navbar = () => {
  return (
    <div className='fixed top-0 left-0 right-0 z-40 flex h-20 items-center justify-between px-4 md:px-8 
    border-b border-gray-300 bg-white transition-all duration-300'>
      <Link to='/' className='text-gray-800'> 
         <BrandLogo textClassName='hidden sm:inline' />
      </Link>
      <UserMenu />
    </div>
  )
}

export default Navbar
