import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { toast } from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const LoginModal = ({ isOpen, onClose }) => {
    const { login, signup, loginWithGoogle } = useAppContext()

    const [mode, setMode] = useState('login') // 'login' | 'signup'
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(true)
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const resetFields = () => {
        setName(''); setEmail(''); setPassword('')
    }

    const closeAndReset = () => {
        resetFields()
        onClose()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const data = mode === 'login'
                ? await login(email, password, remember)
                : await signup(name, email, password, remember)

            if (data.success) {
                toast.success(mode === 'login' ? 'Logged in successfully' : 'Account created successfully')
                closeAndReset()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const data = await loginWithGoogle(credentialResponse.credential, remember)
            if (data.success) {
                toast.success('Logged in successfully')
                closeAndReset()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    const handleForgotPassword = () => {
        toast('Please contact support to reset your password.')
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4"
            onClick={closeAndReset}
        >
            <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-8 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer"
                    onClick={closeAndReset}
                    aria-label="Close"
                >
                    &times;
                </button>

                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {mode === 'login' ? 'Log in to your account' : 'Create your account'}
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === 'signup' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-600">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition"
                                placeholder="Jane Doe"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            Remember Me
                        </label>

                        {mode === 'login' && (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-gray-500 hover:text-black hover:underline cursor-pointer"
                            >
                                Forgot Password?
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white rounded-full py-2.5 mt-2 hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">OR</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => toast.error('Google Sign-In failed')}
                    />
                </div>

                <p className="text-center text-sm text-gray-500 mt-6">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                        type="button"
                        className="text-black font-medium hover:underline cursor-pointer"
                        onClick={() => { resetFields(); setMode(mode === 'login' ? 'signup' : 'login') }}
                    >
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    )
}

export default LoginModal