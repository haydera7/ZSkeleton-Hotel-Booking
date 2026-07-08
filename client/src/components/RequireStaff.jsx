import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

// Wrap admin pages any staff role may use.
const RequireStaff = ({children}) => {
  const {isStaff, navigate} = useAppContext();

  useEffect(() => {
    if(!isStaff){
      navigate('/admin');
    }
  }, [isStaff]);

  if(!isStaff) return null;

  return children;
}

export default RequireStaff
