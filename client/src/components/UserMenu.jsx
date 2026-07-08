import React, { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'

const UserMenu = () => {
    const { user, logout, navigate } = useAppContext()
    const [open, setOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!user) return null

    const firstLetter = (user.name || user.email || 'U').charAt(0).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            {user.image ? (
                <img
                    src={user.image}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full cursor-pointer border object-cover"
                    onClick={() => setOpen(!open)}
                />
            ) : (
                <div
                    onClick={() => setOpen(!open)}
                    className="w-8 h-8 rounded-full cursor-pointer border bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm select-none shadow-sm hover:opacity-90 transition-opacity"
                >
                    {firstLetter}
                </div>
            )}
            {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-1 text-sm z-50">
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => { setOpen(false); navigate('/my-bookings') }}
                    >
                        My Bookings
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                        onClick={() => { setOpen(false); logout() }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    )
}

export default UserMenu