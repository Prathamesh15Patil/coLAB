import { Link } from 'react-router-dom'

const Home = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-xl rounded-3xl bg-white p-10 shadow-xl">
                <h1 className="mb-4 text-4xl font-semibold">Welcome to Code-CoLAB</h1>
                <p className="mb-8 text-slate-700">
                    Please log in or sign up to continue. Students will be directed to Enrolled classes and faculty will be directed to Classes.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Link className="rounded bg-slate-900 px-6 py-3 text-center text-white" to="/login">
                        Login
                    </Link>
                    <Link className="rounded border border-slate-900 px-6 py-3 text-center text-slate-900" to="/signin">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Home
