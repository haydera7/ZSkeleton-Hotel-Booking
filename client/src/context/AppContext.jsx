import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { createContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast'

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

const AppContext = createContext();

const readStored = (key) => localStorage.getItem(key) || sessionStorage.getItem(key)

export const AppProvider = ({ children }) => {

    const navigate = useNavigate()

    const [hotel, setHotel] = useState(null);
    const [selectedCurrency, setSelectedCurrency] = useState(() => localStorage.getItem('displayCurrency') || '');
    // Room and booking prices are stored as ETB base amounts. The selected
    // display currency controls how those ETB amounts are shown to guests.
    const currency = selectedCurrency || hotel?.currency || "ETB";
    const setDisplayCurrency = (nextCurrency) => {
        const normalized = ["ETB", "USD"].includes(nextCurrency) ? nextCurrency : "ETB";
        localStorage.setItem('displayCurrency', normalized);
        setSelectedCurrency(normalized);
    }
    const convertFromEtb = (amount) => {
        const value = Number(amount) || 0;
        if(currency === "USD"){
            const rate = Number(hotel?.usdExchangeRate) || 1;
            return value / rate;
        }
        return value;
    }
    const formatCurrency = (amount) => {
        const converted = convertFromEtb(amount);
        const formatted = converted.toLocaleString(undefined, {
            minimumFractionDigits: currency === "USD" ? 2 : 0,
            maximumFractionDigits: currency === "USD" ? 2 : 0,
        });
        return `${currency} ${formatted}`;
    }
    const formatEtbCurrency = (amount) => {
        const value = Number(amount) || 0;
        return `ETB ${value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    }

    const [token, setToken] = useState(() => readStored('token'))
    const [user, setUser] = useState(() => {
        const stored = readStored('user')
        return stored ? JSON.parse(stored) : null
    })

    const [role, setRole] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isReceptionist, setIsReceptionist] = useState(false);
    const [isCashier, setIsCashier] = useState(false);
    const isStaff = isAdmin || isReceptionist || isCashier;
    const [rooms, setRooms] = useState([])
    const [roomsLoading, setRoomsLoading] = useState(true)
    const [roomsError, setRoomsError] = useState('')
    const [hotelLoading, setHotelLoading] = useState(true)
    const [hotelError, setHotelError] = useState('')

    const getToken = async () => readStored('token')

    const setAuthData = (newToken, newUser, remember) => {
        const store = remember ? localStorage : sessionStorage
        const other = remember ? sessionStorage : localStorage
        store.setItem('token', newToken)
        store.setItem('user', JSON.stringify(newUser))
        other.removeItem('token')
        other.removeItem('user')
        setToken(newToken)
        setUser(newUser)
    }

    const login = async (email, password, remember = true) => {
        const { data } = await axios.post('/api/auth/login', { email, password })
        if (data.success) {
            setAuthData(data.token, data.user, remember)
        }
        return data
    }

    const signup = async (name, email, password, remember = true) => {
        const { data } = await axios.post('/api/auth/signup', { name, email, password })
        if (data.success) {
            setAuthData(data.token, data.user, remember)
        }
        return data
    }

    const loginWithGoogle = async (credential, remember = true) => {
        const { data } = await axios.post('/api/auth/google', { credential })
        if (data.success) {
            setAuthData(data.token, data.user, remember)
        }
        return data
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        setToken(null)
        setUser(null)
        setRole(null)
        setIsAdmin(false)
        setIsReceptionist(false)
        setIsCashier(false)
        navigate('/')
    }

    const fetchRooms = async () => {
        setRoomsLoading(true)
        setRoomsError('')
        try {
            const { data } = await axios.get('/api/rooms')
            if (data.success) {
                setRooms(data.rooms)
            } else {
                setRoomsError(data.message || 'Rooms could not be loaded')
                toast.error(data.message)
            }
        } catch (error) {
            setRoomsError(error.message || 'Rooms could not be loaded')
            toast.error(error.message)
        } finally {
            setRoomsLoading(false)
        }
    }

    const fetchHotel = async () => {
        setHotelLoading(true)
        setHotelError('')
        try {
            const { data } = await axios.get('/api/hotel')
            if (data.success) {
                setHotel(data.hotel)
            } else {
                setHotelError(data.message || 'Hotel information could not be loaded')
            }
            // Deliberately silent on failure - the site should still work
            // with the "$" fallback rather than toasting an error on every
            // page load if the hotel document hasn't been seeded yet.
        } catch (error) {
            setHotelError(error.message || 'Hotel information could not be loaded')
            console.log("Failed to load hotel settings:", error.message)
        } finally {
            setHotelLoading(false)
        }
    }

    const fetchUser = async (attempt = 0) => {
        try {
            const { data } = await axios.get('/api/user', { headers: { Authorization: `Bearer ${await getToken()}` } })

            if (data.success) {
                setRole(data.role)
                setIsAdmin(data.role === "admin")
                setIsReceptionist(data.role === "receptionist")
                setIsCashier(data.role === "cashier")
            } else if (attempt < 2) {
                setTimeout(() => { fetchUser(attempt + 1) }, 5000)
            } else {
                toast.error("Your session expired. Please log in again.")
                logout()
            }
        } catch (error) {
            if(attempt < 2){
                setTimeout(() => { fetchUser(attempt + 1) }, 5000)
            } else {
                toast.error("Your session expired. Please log in again.")
                logout()
            }
        }
    }

    useEffect(() => {
        if (user && token) {
            fetchUser();
        }
    }, [user, token])

    useEffect(() => {
        fetchRooms();
        fetchHotel();
    }, [])

    const value = {
        currency, setDisplayCurrency, formatCurrency, formatEtbCurrency, convertFromEtb, navigate, user, getToken, role, hotel, fetchHotel, hotelLoading, hotelError,
        isAdmin, setIsAdmin, isReceptionist, setIsReceptionist, isCashier, isStaff, axios,
        rooms, setRooms, roomsLoading, roomsError, fetchRooms, login, signup, loginWithGoogle, logout
    }
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = () => useContext(AppContext);
