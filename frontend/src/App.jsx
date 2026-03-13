import { useState, useEffect } from 'react'
import AdminDesign from './components/admin/AdminDesign'
import ParticipantClaim from './components/participant/ParticipantClaim'
import Verification from './components/verification/Verification'
import ErrorBoundary from './components/common/ErrorBoundary'
import { Toaster } from 'sonner'

function App() {
  // Simple router for prototype
  const [view, setView] = useState('participant') // 'admin', 'participant', 'verify'
  const [serial, setSerial] = useState(null) // For verification view

  // Basic URL routing simulation
  const [path, setPath] = useState(window.location.pathname)
  const searchParams = new URLSearchParams(window.location.search)
  const queryId = searchParams.get('id')

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  useEffect(() => {
    if ((path.startsWith('/verify/') || (path === '/verify' && queryId))) {
      const s = queryId || path.split('/verify/')[1]
      if (s) {
        setSerial(s)
        setView('verify')
      }
    } else if (path === '/admin') {
      setView('admin')
    } else {
      setView('participant')
    }
  }, [path, queryId])

  const navigate = (newView, newPath = '/') => {
    window.history.pushState({}, '', newPath)
    setPath(newPath)
    setView(newView)
    if (newView !== 'verify') setSerial(null)
  }

  return (
    <>
      <Toaster 
        richColors 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#fff',
            borderRadius: '12px'
          },
        }}
      />
      <ErrorBoundary>
        <div className="min-h-screen bg-bg text-primary font-sans selection:bg-accent/30 overflow-x-hidden">
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-bg/40 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('participant')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center shadow-lg shadow-accent/20">
              <span className="text-lg font-bold text-white">CG</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight leading-none text-white">CertGen</span>
              <span className="text-[10px] font-medium text-primary-dim mt-1">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <button 
                onClick={() => navigate('participant')} 
                className={`text-sm font-medium transition-all ${view === 'participant' ? 'text-white' : 'text-primary-dim hover:text-white'}`}
            >
                Portal
            </button>
            <button 
                onClick={() => navigate('admin', '/admin')} 
                className={`text-sm font-medium transition-all ${view === 'admin' ? 'text-white' : 'text-primary-dim hover:text-white'}`}
            >
                Admin
            </button>
          </div>
        </nav>

        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-bg">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[140px] opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent" />
        </div>

        {/* Main Content */}
        <main className="pt-32 min-h-screen flex flex-col">
          {view === 'admin' && (
            <div className="flex-1 animate-in fade-in duration-700">
              <AdminDesign />
            </div>
          )}

          {view === 'participant' && (
            <div className="flex flex-col lg:flex-row items-stretch justify-center flex-1 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {/* Hero Section */}
              <div className="flex-1 p-12 lg:p-24 flex flex-col justify-center space-y-10">
                <div className="space-y-8">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium text-primary-dim uppercase tracking-wider backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      System Online
                   </div>
                   <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white leading-[1.0]">
                      Generate Your <br />
                      <span className="text-gradient">Certificates</span>
                   </h1>
                   <p className="text-primary-dim text-lg md:text-xl max-w-lg font-medium leading-relaxed">
                      Issue, manage, and verify digital credentials with institutional-grade security.
                   </p>
                </div>
              </div>

              {/* Interaction Section */}
              <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative">
                 <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg to-transparent lg:hidden" />
                 <ParticipantClaim />
              </div>
            </div>
          )}

          {view === 'verify' && (
            <div className="flex-1 flex items-center justify-center p-8 bg-grid">
               <Verification serial={serial} />
            </div>
          )}
        </main>
      </div>
      </ErrorBoundary>
    </>
  )
}

export default App
