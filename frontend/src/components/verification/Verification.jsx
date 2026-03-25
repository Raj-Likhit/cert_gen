import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'
import { motion } from 'framer-motion'
import { 
    IconCheck as BadgeCheck, 
    IconAlert as ShieldAlert, 
    IconPointer as Search,
    IconLayout as Loader2
} from '../common/Icons'
import confetti from 'canvas-confetti'

export default function Verification({ serial }) {
    const [data, setData] = useState(null)
    const [inputSerial, setInputSerial] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const firedRef = useRef(false)

    useEffect(() => {
        if (!serial) {
            setLoading(false)
            return
        }
        setInputSerial(serial)
        fetchVerification(serial)
    }, [serial])

    const fetchVerification = async (s) => {
        setLoading(true)
        setError(null)
        setData(null)
        try {
            const res = await api.get(`/verify/${s.trim()}`)
            setData(res.data)
            // Fire confetti on success
            if (!firedRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                firedRef.current = true
                const duration = 3 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
                const randomInRange = (min, max) => Math.random() * (max - min) + min;
                const interval = setInterval(function () {
                    const timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) return clearInterval(interval);
                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Verification failed')
        } finally {
            setLoading(false)
        }
    };

    const handleManualVerify = (e) => {
        e.preventDefault()
        if (inputSerial.trim().length >= 7) {
            fetchVerification(inputSerial)
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 space-y-8 min-h-[400px]">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse shadow-lg shadow-white/5">
                <Loader2 className="w-10 h-10 text-white animate-spin opacity-40" />
            </div>
            <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary-dim font-bold animate-pulse">Initializing Hash Verification</p>
                <div className="flex justify-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    )

    if (!data) return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-12 space-y-12 min-h-[500px] animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-6">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-primary-dim uppercase tracking-[0.2em] backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Security Protocol Active
                 </div>
                 <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.9] italic">
                    Verify <br />
                    <span className="text-gradient not-italic">Credential</span>
                 </h1>
                 <p className="text-sm font-medium text-white/40 max-w-sm mx-auto leading-relaxed">
                    Enter the unique 7-character alphanumeric code displayed on your certificate for instant verification.
                 </p>
            </div>

            <form onSubmit={handleManualVerify} className="w-full space-y-6">
                <div className="relative group/input">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 to-accent/0 rounded-2xl blur opacity-25 group-hover/input:opacity-50 transition-opacity duration-500" />
                    <input 
                        type="text" 
                        value={inputSerial}
                        onChange={e => setInputSerial(e.target.value)}
                        placeholder="ENTER CODE (E.G. A1B2C3D)"
                        className="relative w-full h-20 rounded-2xl bg-black/40 border-2 border-white/10 px-8 text-xl font-black text-white hover:border-white/20 focus:border-accent/80 focus:bg-black/60 outline-none transition-all placeholder:text-white/10 uppercase tracking-[0.2em] font-mono text-center"
                    />
                </div>
                <button 
                    disabled={inputSerial.trim().length < 7}
                    className="w-full h-16 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale disabled:scale-100 shadow-xl shadow-white/5"
                >
                    Initiate Audit
                </button>
            </form>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-error/5 border border-error/20 w-full"
                >
                    <ShieldAlert className="w-8 h-8 text-error" />
                    <p className="text-xs font-bold text-error uppercase tracking-widest text-center">{error}</p>
                </motion.div>
            )}
        </div>
    )


    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl mx-auto p-6"
        >
            <div className="relative group/audit">
                {/* Visual Flair */}
                <div className="absolute -inset-4 bg-accent/5 blur-3xl rounded-[3rem] opacity-0 group-hover/audit:opacity-100 transition-opacity duration-1000" />

                <div className="relative rounded-3xl bg-surface/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden">
                    {/* Audit Header */}
                    <div className="p-12 text-center relative border-b border-white/5 bg-white/5">
                        <div className="absolute top-6 left-8 text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Protocol // REF_SEC_7</div>
                        <div className="absolute top-6 right-8 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            <span className="text-[10px] font-bold text-success uppercase tracking-widest">Authenticated</span>
                        </div>

                        <div className="flex justify-center mb-10 pt-4">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-accent/20 flex items-center justify-center shadow-xl shadow-accent/20 transform -rotate-3 group-hover/audit:rotate-0 transition-transform duration-700">
                                <BadgeCheck className="w-12 h-12 text-white" />
                            </div>
                        </div>
                        
                        <h1 className="text-5xl font-bold text-white tracking-tighter mb-3 leading-none italic">
                            Registry <span className="text-accent not-italic">Audit</span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-primary-dim font-bold">Deep Trace Extraction Successful</p>
                    </div>

                    {/* Audit Data */}
                    <div className="p-12 space-y-12">
                        <div className="text-center space-y-6">
                            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/10 bg-white/5">
                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Verification Status: Original Asset</span>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-5xl font-bold text-white tracking-tighter leading-none italic">
                                    {data.full_name}
                                </h2>
                                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto" />
                                <p className="text-base font-medium text-white/40 leading-relaxed max-w-md mx-auto italic">
                                    Validated as a primary constituent for the <br />
                                    <span className="text-white font-bold not-italic tracking-tight">{data.event_name || 'Neural Infrastructure Summit'}</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 rounded-2xl border border-white/5 overflow-hidden">
                            <div className="p-8 bg-white/5 space-y-3">
                                <span className="text-[10px] uppercase text-primary-dim font-bold tracking-[0.2em]">Hash Signature</span>
                                <div className="font-mono text-sm text-accent select-all tracking-tight font-bold">{data.verification_code}</div>

                            </div>
                            <div className="p-8 bg-white/5 space-y-3 text-right border-l border-white/5">
                                <span className="text-[10px] uppercase text-primary-dim font-bold tracking-[0.2em]">Timestamp</span>
                                <div className="text-sm text-white font-bold uppercase tracking-widest leading-none">
                                    {data.claimed_at ? new Date(data.claimed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-6">
                            <a
                                href={data.cert_url}
                                target="_blank"
                                rel="noreferrer"
                                className="h-16 rounded-2xl bg-white text-black font-bold tracking-tight text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-white/5 group/btn"
                            >
                                <Search className="w-5 h-5 group-hover/btn:scale-110 transition-transform" /> INSPECT SOURCE ARTIFACT
                            </a>
                            
                            <p className="text-[10px] text-center text-white/10 uppercase tracking-[0.3em] font-mono leading-relaxed">
                                Institutional Grade Encryption Active <br />
                                SIG: {Math.random().toString(36).substring(2, 15).toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 text-center opacity-20">
                <p className="text-[10px] uppercase tracking-[0.6em] text-white font-mono">End of Encrypted Audit Report</p>
            </div>
        </motion.div>
    )
}
