import React from 'react'
import { assets } from '../../assets/assets';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const Sidebar = () => {
    const {isAdmin, isReceptionist, isCashier} = useAppContext();

    const Sidebarlinks = [
        {name: "Dashboard" , path:"/admin",icon: assets.dashboardIcon, show: true},
        {name: "Bookings" , path:"/admin/bookings",icon: assets.listIcon, show: isAdmin || isReceptionist},
        {name: "Payments" , path:"/admin/payments",icon: assets.listIcon, show: isAdmin || isCashier},
        {name: "Reviews" , path:"/admin/reviews",icon: assets.listIcon, show: isAdmin || isReceptionist || isCashier},
        {name: "Rooms" , path:"/admin/rooms",icon: assets.listIcon, show: isAdmin || isReceptionist},
        {name: "Staff" , path:"/admin/staff",icon: assets.dashboardIcon, show: isAdmin},
        {name: "Settings" , path:"/admin/settings",icon: assets.dashboardIcon, show: isAdmin},

    ];
  return (
    <div className='fixed left-0 top-20 bottom-0 z-30 md:w-64 w-16 border-r text-base border-gray-300 pt-4
    flex flex-col transition-all duration-300 bg-white overflow-y-auto'>
       {Sidebarlinks.filter(item => item.show).map((item,index)=>(
          <NavLink to={item.path} key={index} end='/admin'  className={({isActive}) => `flex items-center py-3 px-4 md:px-8 gap-3  ${isActive ? "border-r-4 md:border-r-[6px] bg-blue-600/10 border-blue-600  text-blue-600" : 
          "hover:bg-gray-100/90 border-white text-gray-700"}`}>
              <img src={item.icon} alt={item.name} className='min-h-6 min-w-6'/>
              <p className='md:block hidden text-center'>{item.name}</p>
          </NavLink>
       ))}
    </div>
  )
}

export default Sidebar
