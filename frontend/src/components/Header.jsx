import { Link, useNavigate } from 'react-router-dom'
import { logoutUser } from '../apis/userApi.js'

const Header = ({ user, setUser }) => {
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await logoutUser()
        } catch {
            // ignore logout failure and still clear local state
        }
        setUser(null)
        navigate('/')
    }

    return (
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                <Link to="/" className="text-xl font-semibold text-slate-900">
                    Code-CoLAB
                </Link>

                <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                    <Link className="rounded-md px-3 py-2 hover:bg-slate-100" to="/">
                        Home
                    </Link>
                    {user && user.role === 'faculty' && (
                        <Link className="rounded-md px-3 py-2 hover:bg-slate-100" to="/classes">
                            Classes
                        </Link>
                    )}
                    {user && user.role === 'student' && (
                        <Link className="rounded-md px-3 py-2 hover:bg-slate-100" to="/enrolled">
                            Enrolled
                        </Link>
                    )}
                    {!user && (
                        <>
                            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" to="/login">
                                Login
                            </Link>
                            <Link className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 hover:bg-slate-100" to="/signin">
                                Sign up
                            </Link>
                        </>
                    )}
                </nav>

                {user && (
                    <div className="flex items-center gap-3">
                        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 sm:inline-block">
                            {user?.name} • {user?.role}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}

export default Header
