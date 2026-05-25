import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../../apis/userApi.js'

const Login = ({ setUser }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')

        try {
            const data = await loginUser({ email, password })
            setUser(data.user)
            const nextPath = data.user.role === 'faculty' ? '/classes' : '/enrolled'
            navigate(nextPath)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h1 className="mb-6 text-2xl font-semibold">Login</h1>
                {error && <div className="mb-4 rounded border border-red-300 bg-red-100 px-4 py-3 text-red-700">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium">Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2"
                            required
                        />
                    </label>
                    <button className="w-full rounded bg-slate-900 px-4 py-2 text-white" type="submit">
                        Sign in
                    </button>
                </form>
                <p className="mt-4 text-sm text-slate-600">
                    Don't have an account?{' '}
                    <Link className="text-slate-900 underline" to="/signin">
                        Sign up here
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Login
