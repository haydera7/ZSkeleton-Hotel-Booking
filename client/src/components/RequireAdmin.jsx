import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

// Wrap any /admin sub-page that should be admin-only (not receptionist).
// Layout.jsx already keeps non-staff out of /admin entirely; this catches
// the narrower case of a receptionist navigating straight to an
// admin-only URL like /admin/settings or /admin/staff.
const RequireAdmin = ({children}) => {
  const {isAdmin, navigate} = useAppContext();

  useEffect(() => {
    if(!isAdmin){
      navigate('/admin');
    }
  }, [isAdmin]);

  if(!isAdmin) return null;

  return children;
}

export default RequireAdmin
