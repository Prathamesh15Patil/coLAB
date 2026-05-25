import './App.css'
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Enrolled from './pages/Enrolled.jsx'
import Classes from './pages/Classes.jsx'
import Assignments from './pages/Assignments.jsx'
import IdGenerator from './pages/IdGenerator.jsx'
import Login from './components/Auth/Login.jsx'
import Signin from './components/Auth/Signin.jsx'
import Header from './components/Header.jsx'
import { getProfile } from './apis/userApi.js'
import WorkSpace from "./pages/WorkSpace.jsx"
import { Toaster } from 'react-hot-toast'
import UserContextProvider from './context/userContextProvider.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile()
        setUser(data.user)
      } catch (error) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const roleRedirect = () => {
    if (!user) return '/'
    return user.role === 'faculty' ? '/classes' : '/enrolled'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-lg">Loading...</span>
      </div>
    )
  }

  return (
    <UserContextProvider value={{ user, setUser }}>
      <Header user={user} setUser={setUser} />
      <Toaster position='top-center'></Toaster>
      <main className="">
        <Routes>
          <Route path='/' element={user ? <Navigate to={roleRedirect()} replace /> : <Home />} />
          <Route path='/login' element={user ? <Navigate to={roleRedirect()} replace /> : <Login setUser={setUser} />} />
          <Route path='/signin' element={user ? <Navigate to={roleRedirect()} replace /> : <Signin setUser={setUser} />} />
          <Route
            path='/classes'
            element={
              user ? (
                user.role === 'faculty' ? (
                  <Classes user={user} setUser={setUser} />
                ) : (
                  <Navigate to='/enrolled' replace />
                )
              ) : (
                <Navigate to='/' replace />
              )
            }
          />
          <Route
            path='/enrolled'
            element={
              user ? (
                user.role === 'student' ? (
                  <Enrolled user={user} setUser={setUser} />
                ) : (
                  <Navigate to='/classes' replace />
                )
              ) : (
                <Navigate to='/' replace />
              )
            }
          />
          <Route
            path='/class/:classId/assignments'
            element={
              user ? (
                <Assignments user={user} setUser={setUser} />
              ) : (
                <Navigate to='/' replace />
              )
            }
          />
          <Route
            path='/id-generator'
            element={
              user ? <IdGenerator /> : <Navigate to='/' replace />
            }
          />
          <Route path='workspace/:roomId' element={<WorkSpace />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>

      </main>
    </UserContextProvider>
  )
}

export default App
