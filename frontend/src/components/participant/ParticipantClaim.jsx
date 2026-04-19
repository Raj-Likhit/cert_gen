import { useState } from 'react'
import api from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    IconPointer as Search, 
    IconLayout as Loader2, 
    IconCheck as CheckCircle2, 
    IconAlert as AlertCircle,
    IconSave as Download
} from '../common/Icons'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

const CLAIM_STATES = {
    IDLE: 'IDLE',
    SEARCHING: 'SEARCHING',
    GENERATING: 'GENERATING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
}

export default function ParticipantClaim() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState(CLAIM_STATES.IDLE)
    const [error, setError] = useState(null)
    const [cert, setCert] = useState(null)

    const loading = status === CLAIM_STATES.SEARCHING || status === CLAIM_STATES.GENERATING

    const handleClaim = async (e) => {
        e.preventDefault()
        if (!email) return

        setStatus(CLAIM_STATES.SEARCHING)
        setError(null)
        setCert(null)

        try {
            const cleanEmail = email.trim().toLowerCase()
            
            const res = await api.post('/claim', {
                email: cleanEmail,
                frontend_url: window.location.origin
            })

            setStatus(CLAIM_STATES.GENERATING)
            
            // Artificial delay to prevent UI flickering on very fast responses
            // and to give the impression of the render engine working
            await new Promise(r => setTimeout(r, 1200))

            setCert(res.data)
            setStatus(CLAIM_STATES.SUCCESS)
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399', '#ffffff']
                })
            }
        } catch (err) {
            setStatus(CLAIM_STATES.ERROR)
            console.error("Claim Error Details:", err)
            if (err.response?.status === 404) {
                toast.error("Email not found", {
                    description: "Our registry doesn't have a record matching this address."
                })
            } else {
                const msg = err.response?.data?.detail || err.message || "We couldn't process your request."
                toast.error("Process Failed", {
                    description: msg
                })
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error("Download failed, falling back to open", e);
            window.open(url, '_blank');
        }
    }


    return (
        <div className="relative min-h-[600px] w-full max-w-xl mx-auto flex items-center justify-center p-4">

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-lg mx-auto p-6"
            >
                <div className="brutalist-card bg-surface/40 backdrop-blur-2xl border-white/5 shadow-2xl overflow-hidden w-full">
                    
                    {/* Header */}
                    <div className="p-12 text-center relative border-b border-white/5">
                        <div className="flex justify-center mb-8">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden">
                                <img src="/logo.svg" alt="CertGen Logo" className="w-16 h-16 object-contain" />
                            </div>
                        </div>

                        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
                            Claim Credentials
                        </h1>
                        <p className="text-sm font-medium text-primary-dim max-w-sm mx-auto leading-relaxed">
                            Enter your registered email address to retrieve your institutional digital certificates.
                        </p>
                    </div>

                    <div className="w-full">
                        {!cert ? (
                            <div className="p-12 space-y-8">
                                <form onSubmit={handleClaim} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-primary-dim uppercase tracking-widest ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="janedoe@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full brutalist-input h-14 text-white text-lg font-medium bg-white/5"
                                        />
                                    </div>

                                    <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full h-16 rounded-2xl bg-white text-black font-bold text-lg tracking-tight hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    {status === CLAIM_STATES.SEARCHING ? (
                                        <><Loader2 className="w-6 h-6 animate-spin" /> Searching Record...</>
                                    ) : status === CLAIM_STATES.GENERATING ? (
                                        <><Loader2 className="w-6 h-6 animate-spin text-accent" /> Rendering Certificate...</>
                                    ) : (
                                        <>Get My Certificate</>
                                    )}
                                </button>
                                </form>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-10 space-y-8"
                            >
                                <div className="flex items-center gap-6 border border-white/5 bg-white/5 p-6 rounded-2xl">
                                    <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-7 h-7 text-success" />
                                    </div>
                                    <div className="min-w-0 text-center flex-1">
                                        <h3 className="text-sm font-semibold text-white">Certificate Ready</h3>
                                        <p className="text-sm font-medium text-primary-dim mt-0.5 truncate">{cert.name}</p>
                                    </div>

                                </div>



                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => handleDownload(cert.cert_url, `Certificate.pdf`)}
                                        className="h-16 rounded-2xl bg-white text-black font-bold text-lg tracking-tight shadow-xl shadow-white/5 hover:bg-white/90 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Download className="w-6 h-6" /> Download PDF Certificate
                                    </button>

                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
