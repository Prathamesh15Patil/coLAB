import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyClasses, createClass, updateClass, deleteClass } from '../apis/classApi.js'
import { logoutUser } from '../apis/userApi.js'

const Classes = ({ user, setUser }) => {
    const navigate = useNavigate()
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [form, setForm] = useState({ name: '', courseCode: '', division: '' })
    const [editingClassId, setEditingClassId] = useState(null)
    const [editName, setEditName] = useState('')

    const classCount = classes.length
    const totalStudents = classes.reduce((sum, classItem) => sum + (classItem.students?.length || 0), 0)

    const fetchClasses = async () => {
        setLoading(true)
        setError('')

        try {
            const data = await getMyClasses()
            setClasses(data.ClassesTeaching || [])
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

    const handleInputChange = (event) => {
        const { name, value } = event.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleCreate = async (event) => {
        event.preventDefault()
        setError('')

        try {
            await createClass(form)
            setForm({ name: '', courseCode: '', division: '' })
            fetchClasses()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleEdit = (classItem) => {
        setEditingClassId(classItem.classId)
        setEditName(classItem.name)
        setError('')
    }

    const handleUpdate = async (classId) => {
        if (!editName.trim()) {
            setError('Class name is required for update')
            return
        }
        setError('')

        try {
            await updateClass(classId, { name: editName.trim() })
            setEditingClassId(null)
            setEditName('')
            fetchClasses()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async (classId) => {
        const confirmed = window.confirm('Delete this class? This action cannot be undone.')
        if (!confirmed) return
        setError('')

        try {
            await deleteClass(classId)
            fetchClasses()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="rounded-3xl bg-white p-8 shadow-xl">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold">Faculty Classes</h1>
                            <p className="text-slate-600">Welcome back, {user?.name || 'Instructor'}.</p>
                        </div>
                        <button onClick={handleLogout} className="rounded bg-slate-900 px-4 py-2 text-white">
                            Logout
                        </button>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-6">
                        <p className="text-slate-700">Create, update, and delete your classes from here. New classes are generated from course code, year, and division.</p>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-50 p-6 shadow-sm">
                            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Classes</p>
                            <p className="mt-3 text-4xl font-semibold text-slate-900">{classCount}</p>
                            <p className="mt-2 text-sm text-slate-600">Total active teaching classes</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-6 shadow-sm">
                            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Students</p>
                            <p className="mt-3 text-4xl font-semibold text-slate-900">{totalStudents}</p>
                            <p className="mt-2 text-sm text-slate-600">Students enrolled in your classes</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <div className="rounded-3xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-2xl font-semibold">Create new class</h2>
                        {error && <div className="mb-4 rounded border border-red-200 bg-red-100 px-4 py-3 text-red-700">{error}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Class Name</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleInputChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    placeholder="e.g. Introduction to Algorithms"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Course Code</label>
                                <input
                                    name="courseCode"
                                    value={form.courseCode}
                                    onChange={handleInputChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    placeholder="e.g. 22CS51"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Division</label>
                                <input
                                    name="division"
                                    value={form.division}
                                    onChange={handleInputChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    placeholder="e.g. A"
                                    required
                                />
                            </div>
                            <button type="submit" className="mt-2 w-full rounded bg-slate-900 px-4 py-3 text-white">
                                Create Class
                            </button>
                        </form>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold">Your classes</h2>
                                <p className="text-sm text-slate-500">Manage classes you own and teach.</p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 p-6 text-center text-slate-500">Loading classes...</div>
                        ) : classes.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 p-6 text-slate-600">No classes found yet. Create one to begin.</div>
                        ) : (
                            <div className="space-y-4">
                                {classes.map((classItem) => (
                                    <div key={classItem.classId} className="rounded-3xl border border-slate-200 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-900">{classItem.name}</p>
                                                <p className="text-sm text-slate-500">ID: {classItem.classId}</p>
                                                <p className="text-sm text-slate-500">Created at: {new Date(classItem.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/class/${classItem.classId}/assignments`)}
                                                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                                                >
                                                    View assignments
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(classItem)}
                                                    className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(classItem.classId)}
                                                    className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        {editingClassId === classItem.classId && (
                                            <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                                                <label className="block text-sm font-medium text-slate-700">New class name</label>
                                                <input
                                                    value={editName}
                                                    onChange={(event) => setEditName(event.target.value)}
                                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                                    placeholder="Updated class title"
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdate(classItem.classId)}
                                                        className="rounded bg-emerald-600 px-4 py-2 text-sm text-white"
                                                    >
                                                        Save changes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingClassId(null)}
                                                        className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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

export default Classes
