import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

// Wrap /admin/payments so a receptionist navigating straight to the URL
// gets redirected - only admin and cashier can verify bank transfers.
const RequirePaymentStaff = ({children}) => {
  const {isAdmin, isCashier, navigate} = useAppContext();
  const allowed = isAdmin || isCashier;

  useEffect(() => {
    if(!allowed){
      navigate('/admin');
    }
  }, [allowed]);

  if(!allowed) return null;

  return children;
}

export default RequirePaymentStaff