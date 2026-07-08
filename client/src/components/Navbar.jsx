import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom';
import {assets} from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import UserMenu from './UserMenu';
import LoginModal from './LoginModal';
import BrandLogo from './BrandLogo';

const Navbar = () => {
    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Rooms', path: '/rooms' },
        { name: 'About', path: '/about' },
        {name: 'Contact', path:'/contact'},
        { name: 'Find My Booking', path: '/my-bookings' },
    ];

    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const location = useLocation()
    const {user, navigate, isStaff, currency, setDisplayCurrency} = useAppContext()

    useEffect(() => {
        if(location.pathname !== '/'){
            setIsScrolled(true);
            return;
        }else{
            setIsScrolled(false);
        }

        setIsScrolled ( prev => location.pathname !== '/' ? true : prev);
        const handleScroll = () => {
            setIsScrolled( window.scrollY > 10);
        };
      window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [location.pathname]);

    return (
        <>
            <nav className={`fixed top-0 left-0  w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-50 ${isScrolled ? "bg-white/80 shadow-md text-gray-700 backdrop-blur-lg py-3 md:py-4" : "py-4 md:py-6"}`}>

                {/* Logo */}
                <Link to='/' >
                    <BrandLogo className={isScrolled ? 'text-gray-800' : 'text-white'} textClassName='max-sm:text-xl' />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-4 lg:gap-8">
                    {navLinks.map((link, i) => (
                        <Link key={i} to={link.path} className={`group flex flex-col gap-0.5 ${isScrolled ? "text-gray-700" : "text-white"}`}>
                            {link.name}
                            <div className={`${isScrolled ? "bg-gray-700" : "bg-white"} h-0.5 w-0 group-hover:w-full transition-all duration-300`} />
                        </Link>
                    ))}

                    { user && isStaff && (
                    <button className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer ${isScrolled ? 'text-black' : 'text-white'} transition-all`} onClick={()=> navigate('/admin')}>
                      Dashboard
                    </button>
                    )
                    }
                </div>

                {/* Desktop Right */}
                <div className="hidden md:flex items-center gap-4">
                    <div className={`flex items-center rounded-full border p-1 text-sm transition-all ${
                        isScrolled ? 'border-gray-200 bg-white text-gray-700 shadow-sm' : 'border-white/40 bg-white/10 text-white backdrop-blur'
                    }`}>
                        {['ETB', 'USD'].map(option => (
                            <button
                                key={option}
                                type='button'
                                onClick={() => setDisplayCurrency(option)}
                                className={`rounded-full px-3 py-1 transition cursor-pointer ${
                                    currency === option
                                        ? isScrolled ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                                        : isScrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/80 hover:text-white'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    {user ?
                    (<UserMenu />)
                    :
                    (<button
                        onClick={() => setIsLoginOpen(true)}
                        className={`px-8 py-2.5 rounded-full ml-4 transition-all duration-500 cursor-pointer ${isScrolled ? "text-white bg-black" : "bg-white text-black"}`}
                    >
                        Login
                    </button>)
                    }

                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-3 md:hidden">
                {user && <UserMenu />}
                   <img onClick={()=>setIsMenuOpen(!isMenuOpen)} src={assets.menuIcon} alt='menuIcon' className={`${isScrolled && 'invert'} h-4 `}/>
                </div>

                {/* Mobile Menu */}
                <div className={`fixed top-0 left-0 w-full h-screen bg-white text-base flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <button className="absolute top-4 right-4" onClick={() => setIsMenuOpen(false)}>
                        <img src={assets.closeIcon} alt='close-menu' className='h-6.5'/>
                    </button>

                    {navLinks.map((link, i) => (
                        <Link key={i} to={link.path} onClick={() => setIsMenuOpen(false)}>
                            {link.name}
                        </Link>
                    ))}

                    <div className='flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 text-sm'>
                        {['ETB', 'USD'].map(option => (
                            <button
                                key={option}
                                type='button'
                                onClick={() => setDisplayCurrency(option)}
                                className={`rounded-full px-4 py-1.5 transition ${
                                    currency === option ? 'bg-black text-white' : 'text-gray-500'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                   { user && isStaff && <button className="border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all"
                   onClick={()=> navigate('/admin')}>
                       Dashboard
                    </button>}

                   {!user && (
                        <button
                            onClick={() => { setIsMenuOpen(false); setIsLoginOpen(true) }}
                            className="bg-black text-white px-8 py-2.5 rounded-full transition-all duration-500 cursor-pointer"
                        >
                            Login
                        </button>
                   )}
                </div>
            </nav>

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
}

export default Navbar
