import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

// Wrap /admin/bookings and /admin/list-room so a cashier navigating straight
// to the URL gets redirected - a cashier's job is verifying payments, not
// managing walk-ins, booking status, or room availability.
const RequireBookingStaff = ({children}) => {
  const {isAdmin, isReceptionist, navigate} = useAppContext();
  const allowed = isAdmin || isReceptionist;

  useEffect(() => {
    if(!allowed){
      navigate('/admin');
    }
  }, [allowed]);

  if(!allowed) return null;

  return children;
}

export default RequireBookingStaff