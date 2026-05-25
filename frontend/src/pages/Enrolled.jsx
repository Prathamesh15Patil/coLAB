import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyClasses, joinClass, leaveClass } from '../apis/classApi.js'
import { logoutUser } from '../apis/userApi.js'

const Enrolled = ({ user, setUser }) => {
    const navigate = useNavigate()
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [joinId, setJoinId] = useState('')

    const classCount = classes.length
    const facultyCount = new Set(classes.map((classItem) => classItem.facultyId?.name || 'Unknown')).size

    const fetchClasses = async () => {
        setLoading(true)
        setError('')

        try {
            const data = await getMyClasses()
            setClasses(data.ClassesEnrolled || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchClasses()
    }, [])

    const handleLogout = async () => {
        try {
            await logoutUser()
        } catch {
            // ignore logout errors and clear local state
        }
        setUser(null)
        navigate('/')
    }

    const handleLeave = async (classId) => {
        const confirmed = window.confirm('Leave this class?')
        if (!confirmed) return
        setError('')

        try {
            await leaveClass(classId)
            fetchClasses()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleJoin = async (event) => {
        event.preventDefault()
        if (!joinId.trim()) {
            setError('Enter a valid class ID to join')
            return
        }
        setError('')

        try {
            await joinClass(joinId.trim())
            setJoinId('')
            fetchClasses()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">Enrolled Classes</h1>
                        <p className="text-slate-600">Welcome back, {user?.name || 'Student'}.</p>
                    </div>
                    <button onClick={handleLogout} className="rounded bg-slate-900 px-4 py-2 text-white">
                        Logout
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div className="rounded-3xl bg-slate-50 p-6 shadow-sm">
                        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Enrolled classes</p>
                        <p className="mt-3 text-4xl font-semibold text-slate-900">{classCount}</p>
                        <p className="mt-2 text-sm text-slate-600">Classes you are currently enrolled in</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-6 shadow-sm">
                        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Instructors</p>
                        <p className="mt-3 text-4xl font-semibold text-slate-900">{facultyCount}</p>
                        <p className="mt-2 text-sm text-slate-600">Different instructors for your enrolled classes</p>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <h2 className="mb-4 text-2xl font-semibold">Join a class</h2>
                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Class ID</label>
                                <input
                                    value={joinId}
                                    onChange={(event) => setJoinId(event.target.value)}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    placeholder="Enter class ID like 22CS51-24A"
                                />
                            </div>
                            <button type="submit" className="w-full rounded bg-slate-900 px-4 py-3 text-white">
                                Join class
                            </button>
                        </form>
                        <p className="mt-4 text-sm text-slate-600">
                            Use the class ID provided by your instructor to join a course.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-xl">
                        <div className="mb-4 rounded-2xl border border-slate-200 p-6">
                            <p className="text-slate-700">Your enrolled classes appear below. Remove any class you no longer want to attend.</p>
                        </div>
                        {error && <div className="mb-4 rounded border border-red-200 bg-red-100 px-4 py-3 text-red-700">{error}</div>}
                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 p-6 text-center text-slate-500">Loading enrolled classes...</div>
                        ) : classes.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 p-6 text-slate-600">You are not enrolled in any classes yet. Join a class above using its class ID.</div>
                        ) : (
                            <div className="space-y-4">
                                {classes.map((classItem) => (
                                    <div key={classItem.classId} className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-lg font-semibold text-slate-900">{classItem.name}</p>
                                                <p className="text-sm text-slate-500">ID: {classItem.classId}</p>
                                                <p className="text-sm text-slate-500">Faculty: {classItem.facultyId?.name || 'Unknown'}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/class/${classItem.classId}/assignments`)}
                                                    className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
                                                >
                                                    View assignments
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLeave(classItem.classId)}
                                                    className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700"
                                                >
                                                    Leave class
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Enrolled
