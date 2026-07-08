import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { useLocation, useParams } from 'react-router-dom'

const Loader = () => {
    const { navigate } = useAppContext()
    const { nextUrl } = useParams()
    const location = useLocation()

  useEffect(()=>{
     if(nextUrl){
        setTimeout(()=>{
             // Carry over any query string (e.g. ?bookingId=...&phone=...) so
             // the destination page can pick up where the payment left off.
             navigate(`/${nextUrl}${location.search}`)
        },8000)
     }
  },[nextUrl])


  return (
    <div className='flex justify-center items-center h-screen'>
         <div className='animate-spin rounded-full h-24 w-24 border-4 border-gray-300 border-t-primary'>
             
         </div>
    </div>
  )
}

export default Loader