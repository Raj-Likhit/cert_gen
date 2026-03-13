import { useState } from 'react'
import api from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    IconPointer as Search, 
    IconLayout as Loader2, 
    IconCheck as CheckCircle2, 
    IconAlert as AlertCircle,
    IconSave as Download,
    IconUsers as LinkedIn
} from '../common/Icons'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

export default function ParticipantClaim() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [cert, setCert] = useState(null)

    const handleClaim = async (e) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        setError(null)
        setCert(null)

        try {
            // Updated Endpoint: /claim
            const res = await api.post('/claim', {
                email: email.trim(),
                frontend_url: window.location.origin
            })

            // Faux delay for suspense
            if (Date.now() % 2 === 0) await new Promise(r => setTimeout(r, 800))

            setCert(res.data)
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399', '#ffffff']
                })
            }
        } catch (err) {
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

    const handleLinkedInShare = () => {
        if (!cert) return
        const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent("Certificate of Participation")}&organizationName=${encodeURIComponent("CertGen")}&issueYear=${new Date().getFullYear()}&issueMonth=${new Date().getMonth() + 1}&certUrl=${encodeURIComponent(cert.cert_url)}&certId=${encodeURIComponent(cert.serial_number)}`;
        window.open(linkedInUrl, '_blank');
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
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/20 flex items-center justify-center shadow-lg shadow-accent/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                                <Search className="w-10 h-10 text-white" />
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
                                        disabled={loading}
                                        className="w-full h-14 bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all font-bold tracking-tight rounded-xl flex items-center justify-center shadow-xl shadow-white/5"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            "Search Registry"
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
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-white">Verification Successful</h3>
                                        <p className="text-sm font-medium text-primary-dim mt-0.5 truncate">{cert.name}</p>
                                    </div>
                                </div>

                                {/* PNG Preview */}
                                <div
                                    onClick={() => cert.cert_png_url && window.open(cert.cert_png_url, '_blank')}
                                    className="group/preview cursor-pointer block border border-white/5 bg-black/40 relative overflow-hidden transition-all hover:border-accent rounded-2xl"
                                >
                                    {cert.cert_png_url ? (
                                        <>
                                            <img
                                                src={cert.cert_png_url}
                                                alt="Certificate"
                                                className="w-full h-auto transition duration-500 group-hover/preview:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white scale-90 group-hover/preview:scale-100 transition-transform">
                                                    <Search className="w-6 h-6" />
                                                </div>
                                                <span className="text-sm font-bold text-white tracking-tight">View Full Size</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center aspect-video font-medium text-sm text-primary-dim">Asset Sync Pending</div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                     <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleDownload(cert.cert_url, `Cert-${cert.serial_number}.pdf`)}
                                            className="h-12 rounded-xl border border-white/5 bg-white/5 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> PDF
                                        </button>
                                        <button
                                            onClick={() => handleDownload(cert.cert_png_url, `Cert-${cert.serial_number}.png`)}
                                            className="h-12 rounded-xl border border-white/5 bg-white/5 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> IMAGE
                                        </button>
                                     </div>
                                    <button
                                        onClick={handleLinkedInShare}
                                        className="h-14 rounded-xl bg-accent text-white font-bold text-sm tracking-tight shadow-xl shadow-accent/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        <LinkedIn className="w-5 h-5" /> Add to LinkedIn Profile
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
