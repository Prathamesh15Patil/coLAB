import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAssignmentsByClass, createAssignment, updateAssignment, deleteAssignment } from '../apis/assignmentApi.js'
import { logoutUser } from '../apis/userApi.js'

const Assignments = ({ user, setUser }) => {
    const { classId } = useParams()
    const navigate = useNavigate()
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [form, setForm] = useState({ title: '', description: '', dueDate: '', language: 'Any', sampleInput: '', sampleOutput: '' })
    const [editingAssignment, setEditingAssignment] = useState(null)

    const fetchAssignments = async () => {
        setLoading(true)
        setError('')

        try {
            const data = await getAssignmentsByClass(classId)
            setAssignments(data.assignments || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAssignments()
    }, [classId])

    const handleLogout = async () => {
        try {
            await logoutUser()
        } catch {
            // ignore logout errors and clear local state
        }
        setUser(null)
        navigate('/')
    }

    const handleFormChange = (event) => {
        const { name, value } = event.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const getAssignmentPartners = (assignment) => {
        const teams = assignment.teams || []
        const currentUserId = String(user?._id || user?.id || '')
        const myTeam = teams.find((t) =>
            (t.members || []).some((member) => String(member._id || member) === currentUserId),
        )
        if (!myTeam) return null
        return (myTeam.members || [])
            .filter((member) => String(member._id || member) !== currentUserId)
            .map((member) => member.name || member.email || 'Student')
    }

    const handleCreate = async (event) => {
        event.preventDefault()
        setError('')

        try {
            await createAssignment({ ...form, classId })
            setForm({ title: '', description: '', dueDate: '', language: 'Any', sampleInput: '', sampleOutput: '' })
            fetchAssignments()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment)
        setForm({
            title: assignment.title,
            description: assignment.description,
            dueDate: new Date(assignment.dueDate).toISOString().slice(0, 10),
            language: assignment.language || 'java',
            sampleInput: assignment.sampleInput || '',
            sampleOutput: assignment.sampleOutput || '',
        })
        setError('')
    }

    const handleUpdate = async (assignmentId) => {
        if (!form.title.trim() || !form.description.trim() || !form.dueDate.trim()) {
            setError('Title, description, and due date are required.')
            return
        }
        setError('')

        try {
            await updateAssignment(assignmentId, {
                title: form.title.trim(),
                description: form.description.trim(),
                dueDate: form.dueDate,
                language: form.language,
                sampleInput: form.sampleInput,
                sampleOutput: form.sampleOutput,
            })
            setEditingAssignment(null)
            setForm({ title: '', description: '', dueDate: '', language: 'Any', sampleInput: '', sampleOutput: '' })
            fetchAssignments()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async (assignmentId) => {
        const confirmed = window.confirm('Delete this assignment?')
        if (!confirmed) return
        setError('')

        try {
            await deleteAssignment(assignmentId)
            fetchAssignments()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">Assignments for {classId}</h1>
                        <p className="text-slate-600">{user?.role === 'faculty' ? 'Create and manage assignments.' : 'View assignments for your enrolled class.'}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => navigate(user?.role === 'faculty' ? '/classes' : '/enrolled')} className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700">
                            Back
                        </button>
                        <button onClick={handleLogout} className="rounded bg-slate-900 px-4 py-2 text-white">
                            Logout
                        </button>
                    </div>
                </div>

                {user?.role === 'faculty' && (
                    <div className="mb-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <h2 className="mb-4 text-2xl font-semibold">Create new assignment</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Title</label>
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    rows="4"
                                    required
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Due date</label>
                                    <input
                                        name="dueDate"
                                        type="date"
                                        value={form.dueDate}
                                        onChange={handleFormChange}
                                        className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Language</label>
                                    <select
                                        name="language"
                                        value={form.language}
                                        onChange={handleFormChange}
                                        className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    >
                                        <option value="Any">Any (Student Choice)</option>
                                        <option value="java">Java</option>
                                        <option value="python">Python</option>
                                        <option value="C">C</option>
                                        <option value="C++">C++</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Sample input (optional)</label>
                                <textarea
                                    name="sampleInput"
                                    value={form.sampleInput}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    rows="4"
                                    placeholder="Optional sample input for the assignment"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Sample output (optional)</label>
                                <textarea
                                    name="sampleOutput"
                                    value={form.sampleOutput}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    rows="4"
                                    placeholder="Optional sample output for students"
                                />
                            </div>
                            <button type="submit" className="rounded bg-slate-900 px-4 py-3 text-white">
                                Create assignment
                            </button>
                        </form>
                    </div>
                )}

                {error && <div className="mb-6 rounded border border-red-200 bg-red-100 px-4 py-3 text-red-700">{error}</div>}

                {loading ? (
                    <div className="rounded-2xl border border-slate-200 p-6 text-center text-slate-500">Loading assignments...</div>
                ) : assignments.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 p-6 text-slate-600">No assignments found for this class yet.</div>
                ) : (
                    <div className="space-y-4">
                        {assignments.map((assignment) => (
                            <div key={assignment._id} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xl font-semibold text-slate-900">{assignment.title}</p>
                                        <p className="text-sm text-slate-500">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>
                                        <p className="mt-3 text-slate-700 whitespace-pre-line">{assignment.description}</p>
                                        {assignment.sampleInput && (
                                            <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                                <p className="font-semibold">Sample input</p>
                                                <pre className="whitespace-pre-wrap">{assignment.sampleInput}</pre>
                                            </div>
                                        )}
                                        {assignment.sampleOutput && (
                                            <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                                <p className="font-semibold">Sample output</p>
                                                <pre className="whitespace-pre-wrap">{assignment.sampleOutput}</pre>
                                            </div>
                                        )}
                                        {assignment.sampleOutput && (
                                            <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                                <p className="font-semibold">Sample output</p>
                                                <pre className="whitespace-pre-wrap">{assignment.sampleOutput}</pre>
                                            </div>
                                        )}
                                        <p className="mt-3 text-sm text-slate-500">Language: {assignment.language || 'java'}</p>
                                        {user?.role === 'student' && (() => {
                                            const partners = getAssignmentPartners(assignment)
                                            if (!partners) {
                                                return <p className="mt-3 text-sm text-slate-500">You are not assigned a team for this assignment yet.</p>
                                            }

                                            return (
                                                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                                                    <p className="font-semibold">Your team partners:</p>
                                                    <p>{partners.length > 0 ? partners.join(', ') : 'No partner assigned yet.'}</p>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-end">
                                        {user?.role === 'student' && (() => {
                                            const currentUserName = user?.name || user?.username || '';
                                            const isSubmitted = assignment.submittedStudents?.includes(currentUserName);
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/id-generator', { state: { assignment } })}
                                                    disabled={isSubmitted}
                                                    className={`rounded px-4 py-2 text-sm font-semibold ${isSubmitted ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                                >
                                                    {isSubmitted ? 'Submitted' : 'Start WorkSpace'}
                                                </button>
                                            )
                                        })()}
                                        {user?.role === 'faculty' && (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(assignment)}
                                                    className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(assignment._id)}
                                                    className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {editingAssignment && (
                    <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <h2 className="mb-4 text-2xl font-semibold">Edit assignment</h2>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault()
                                handleUpdate(editingAssignment._id)
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Title</label>
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    rows="4"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Due date</label>
                                    <input
                                        name="dueDate"
                                        type="date"
                                        value={form.dueDate}
                                        onChange={handleFormChange}
                                        className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Language</label>
                                    <select
                                        name="language"
                                        value={form.language}
                                        onChange={handleFormChange}
                                        className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    >
                                        <option value="Any">Any (Student Choice)</option>
                                        <option value="java">Java</option>
                                        <option value="python">Python</option>
                                        <option value="C">C</option>
                                        <option value="C++">C++</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Sample input (optional)</label>
                                <textarea
                                    name="sampleInput"
                                    value={form.sampleInput}
                                    onChange={handleFormChange}
                                    className="mt-2 w-full rounded border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
                                    rows="4"
                                    placeholder="Optional sample input for the assignment"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="submit" className="rounded bg-emerald-600 px-4 py-3 text-white">
                                    Save changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingAssignment(null)
                                        setForm({ title: '', description: '', dueDate: '', language: 'Any' })
                                    }}
                                    className="rounded border border-slate-300 bg-white px-4 py-3 text-slate-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Assignments
