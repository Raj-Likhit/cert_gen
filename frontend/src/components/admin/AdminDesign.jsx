import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    IconUpload as Upload, 
    IconSave as Save, 
    IconPointer as MousePointer2, 
    IconLock as Lock, 
    IconSheet as FileSpreadsheet, 
    IconUsers as Users, 
    IconLayout as LayoutTemplate, 
    IconAlert as AlertCircle, 
    IconTrash as Trash2 
} from '../common/Icons'
import api from '../../services/api'
import DesignEditor from './DesignEditor'
import { Toaster, toast } from 'sonner'

export default function AdminDesign() {
    // Auth State
    const [auth, setAuth] = useState(false)
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState('')

    // Tabs: 'design' | 'participants' | 'analytics'
    const [activeTab, setActiveTab] = useState('design')

    // Design State (Hoisted to share w/ Editor)
    const [templateUrl, setTemplateUrl] = useState(null)
    const [namePos, setNamePos] = useState({ x: 500, y: 400 })
    const [qrPos, setQrPos] = useState({ x: 800, y: 600 })
    const [qrSize, setQrSize] = useState(120)
    const [fontFamily, setFontFamily] = useState('Helvetica')
    const [textColor, setTextColor] = useState('#000000')
    const [eventName, setEventName] = useState('Certificate of Participation')
    const [availableFonts, setAvailableFonts] = useState(['Helvetica', 'Times-Roman', 'Courier'])
    const [isCentered, setIsCentered] = useState(false)
    const [fontWeight, setFontWeight] = useState('Regular')
    const [isItalic, setIsItalic] = useState(false)
    const [strokeWidth, setStrokeWidth] = useState(0)
    const [strokeColor, setStrokeColor] = useState('#000000')
    const [fontSize, setFontSize] = useState(48)

    // CSV/Participants State
    const [csvFile, setCsvFile] = useState(null)
    const [parsedData, setParsedData] = useState([])
    const [dbParticipants, setDbParticipants] = useState([])
    const [isSyncing, setIsSyncing] = useState(false)
    const [isLoadingDb, setIsLoadingDb] = useState(false)

    useEffect(() => {
        // Initial token check (optional)
        const token = localStorage.getItem('adminToken');
        if (token) setAuth(true);

        api.get('/admin/config')
            .then(res => {
                const cfg = res.data;
                if (cfg) {
                    setNamePos(cfg.name_pos);
                    setQrPos(cfg.qr_pos);
                    setQrSize(cfg.qr_pos.size || 120);
                    setFontFamily(cfg.font_family || 'Helvetica');
                    setTextColor(cfg.text_color || '#000000');
                    setEventName(cfg.event_name || 'Certificate of Participation');
                    setIsCentered(cfg.is_centered || false);
                    setFontWeight(cfg.font_weight || 'Regular');
                    setIsItalic(cfg.is_italic || false);
                    setStrokeWidth(cfg.stroke_width || 0);
                    setStrokeColor(cfg.stroke_color || '#000000');
                    setFontSize(cfg.font_size || 48);
                }
            })
            .catch(err => console.log("Config load error", err));

        api.get('/admin/fonts')
            .then(res => {
                if (res.data.fonts) setAvailableFonts(res.data.fonts);
            })
            .catch(err => console.log("Font fetch error", err));

        const checkTemplate = async () => {
            try {
                const url = `http://localhost:8000/assets/template.png?t=${Date.now()}`;
                setTemplateUrl(url);
            } catch (e) { console.log("No template found"); }
        }
        checkTemplate();
        fetchParticipants();
    }, []);

    const fetchParticipants = async () => {
        setIsLoadingDb(true);
        try {
            const res = await api.get('/admin/participants');
            setDbParticipants(res.data || []);
        } catch (err) {
            console.error("DB Fetch Error:", err);
            if (err.status === 401) setAuth(false);
        } finally {
            setIsLoadingDb(false);
        }
    };

    // ... (Login Handler same) ...
    const handleLogin = async (e) => {
        e.preventDefault()
        setLoginError('')
        try {
            const res = await api.post('/admin/login', { password });
            localStorage.setItem('adminToken', res.data.token);
            setAuth(true);
            toast.success("Login Successful");
        } catch (err) {
            setLoginError(err.message || 'Invalid password');
            toast.error("Invalid password.");
        }
    }

    const handleFontUpload = async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        try {
            await api.post('/admin/upload-font', formData)
            toast.success("Font Uploaded!")
            // Refresh list
            const res = await api.get('/admin/fonts')
            if (res.data.fonts) setAvailableFonts(res.data.fonts)
        } catch (e) {
            toast.error(e.message || "Font Upload Failed")
        }
    }

    // ... (Upload/AutoDetect same) ...
    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setTemplateUrl(URL.createObjectURL(file))

        const formData = new FormData()
        formData.append('file', file)
        try {
            await api.post('/admin/upload-template', formData)
            setTimeout(async () => {
                setTemplateUrl(`http://localhost:8000/assets/template.png?t=${Date.now()}`)
                toast.success("Template Uploaded Successfully")
                // Auto-detect after upload
                await handleAutoDetect();
            }, 1000)
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Upload Failed")
        }
    }

    const handleAutoDetect = async () => {
        const loadingToast = toast.loading("Analyzing template for name positioning...")
        try {
            const res = await api.post('/admin/auto-detect')
            if (res.data.found) {
                setNamePos({ x: res.data.x, y: res.data.y })
                setIsCentered(true) // Default to centering for smart detection
                toast.success("Smart Alignment Successful", { id: loadingToast })
            } else {
                toast.warning(res.data.message || "No line detected.", { id: loadingToast })
            }
        } catch (err) {
            toast.error(err.message || "Auto-detect failed.", { id: loadingToast })
        }
    }

    const handleSaveConfig = async () => {
        try {
            // New Config Payload
            await api.post('/admin/save-config', {
                name_x: Math.round(namePos.x),
                name_y: Math.round(namePos.y),
                qr_x: Math.round(qrPos.x),
                qr_y: Math.round(qrPos.y),
                qr_size: qrSize,
                font_family: fontFamily,
                text_color: textColor,
                event_name: eventName,
                is_centered: isCentered,
                font_weight: fontWeight,
                is_italic: isItalic,
                stroke_width: strokeWidth,
                stroke_color: strokeColor,
                font_size: fontSize
            })
            toast.success("Configuration Saved!")
        } catch (err) {
            toast.error(err.message || "Save failed")
            if (err.status === 401) setAuth(false); // Quick fail if token died
        }
    }

    const handleDeleteTemplate = async () => {
        if (!confirm("Are you sure?")) return
        try {
            await api.delete('/admin/template')
            setTemplateUrl(null)
            toast.success("Template Removed")
        } catch (err) {
            toast.error(err.message || "Delete Failed")
        }
    }

    const handleCsvUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setCsvFile(file)
        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target.result
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')

            // Smarter CSV parsing: Skip header if first row contains 'name' or 'email'
            let startIndex = 0
            if (lines.length > 0) {
                const firstLine = lines[0].toLowerCase()
                if (firstLine.includes('name') || firstLine.includes('email')) {
                    startIndex = 1
                }
            }

            const data = lines.slice(startIndex).map(line => {
                // If the CSV is UTF-16LE read as UTF-8, it will be full of \0. Let's clean it.
                const cleanLine = line.replace(/\0/g, '')
                const parts = cleanLine.split(',')
                return {
                    name: parts[0]?.trim(),
                    email: parts[1]?.trim()
                }
            }).filter(p => p.name && p.email && p.email.includes('@'))

            setParsedData(data)
            toast.info(`Parsed ${data.length} records`)
        }
        
        // Try to detect encoding or at least handle the common 'garbage leading chars' from BOM
        reader.readAsText(file, "UTF-8") 
    }

    const handleSync = async () => {
        if (!parsedData.length) return
        setIsSyncing(true)
        try {
            const payload = { participants: parsedData }
            const res = await api.post('/admin/batch-import', payload)

            // Check for row-level errors
            const errors = res.data.details ? res.data.details.filter(d => d.status === 'error') : [];

            if (errors.length > 0) {
                console.error("Sync partial failures:", errors);
                // Show first error reason
                const firstError = errors[0].error || "Unknown Error";
                toast.error(`Sync Incomplete: ${errors.length} failed. Reason: ${firstError}`);
            } else {
                toast.success(res.data.summary);
                setCsvFile(null);
                setParsedData([]);
                fetchParticipants(); // Refresh live view
            }
        } catch (err) {
            console.error(err)
            toast.error(err.message || "Sync Failed");
            if (err.status === 401) setAuth(false);
        } finally {
            setIsSyncing(false)
        }
    }

    if (!auth) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-8 bg-grid">
                <div className="p-12 rounded-3xl bg-surface/40 backdrop-blur-2xl border border-white/5 shadow-2xl max-w-md w-full">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/20 flex items-center justify-center mb-6 shadow-lg shadow-accent/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">Admin Login</h2>
                        <p className="text-sm font-medium text-primary-dim mt-2 text-center">Please login to manage certificates.</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-primary-dim uppercase tracking-widest ml-1">Password</label>
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-14 rounded-xl bg-white/5 border border-white/5 px-6 text-white text-lg placeholder:text-white/10 font-mono focus:border-accent/50 outline-none transition-all"
                                placeholder="••••••••••••••••"
                            />
                        </div>
                        <button type="submit" className="w-full h-14 rounded-xl bg-white text-black hover:bg-white/90 font-bold tracking-tight shadow-xl shadow-white/10 transition-all flex items-center justify-center">
                            Login
                        </button>
                        {loginError && <p className="text-error text-xs text-center font-bold tracking-tight mt-4">{loginError}</p>}
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="pb-20 h-screen flex flex-col box-border bg-bg text-primary font-sans">

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-0 border-b border-white/5 shrink-0 px-8 pt-8 bg-surface/30 backdrop-blur-3xl overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('design')} className={`flex items-center gap-3 px-8 py-5 transition-all font-bold text-xs tracking-tight border-b-2 whitespace-nowrap ${activeTab === 'design' ? 'text-white border-white bg-white/5 shadow-[0_15px_30px_-15px_rgba(255,255,255,0.2)]' : 'text-primary-dim border-transparent hover:text-white'}`}>
                    <LayoutTemplate className="w-4 h-4" /> Design Editor
                </button>
                <button onClick={() => setActiveTab('participants')} className={`flex items-center gap-3 px-8 py-5 transition-all font-bold text-xs tracking-tight border-b-2 whitespace-nowrap ${activeTab === 'participants' ? 'text-white border-white bg-white/5 shadow-[0_15px_30px_-15px_rgba(255,255,255,0.2)]' : 'text-primary-dim border-transparent hover:text-white'}`}>
                    <Users className="w-4 h-4" /> Participants
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-3 px-8 py-5 transition-all font-bold text-xs tracking-tight border-b-2 whitespace-nowrap ${activeTab === 'analytics' ? 'text-white border-white bg-white/5 shadow-[0_15px_30px_-15px_rgba(255,255,255,0.2)]' : 'text-primary-dim border-transparent hover:text-white'}`}>
                    <AlertCircle className="w-4 h-4" /> Analytics
                </button>
            </div>

            {/* TAB: DESIGN */}
            {activeTab === 'design' && (
                <div className="flex-1 min-h-0 bg-background">
                    <DesignEditor
                        templateUrl={templateUrl}
                        onUpload={handleUpload}
                        onDelete={handleDeleteTemplate}
                        namePos={namePos} setNamePos={setNamePos}
                        qrPos={qrPos} setQrPos={setQrPos}
                        qrSize={qrSize} setQrSize={setQrSize}
                        onSave={handleSaveConfig}
                        onAutoDetect={handleAutoDetect}
                        fontFamily={fontFamily} setFontFamily={setFontFamily}
                        textColor={textColor} setTextColor={setTextColor}
                        eventName={eventName} setEventName={setEventName}
                        availableFonts={availableFonts}
                        onFontUpload={handleFontUpload}
                        isCentered={isCentered} 
                        setIsCentered={(val) => {
                            // Coordinate transformation for centering: x maps to the middle
                            // If switching to centered, x becomes the center point
                            // No ref needed, we use the value directly
                            setIsCentered(val);
                        }}
                        fontWeight={fontWeight} setFontWeight={setFontWeight}
                        isItalic={isItalic} setIsItalic={setIsItalic}
                        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                        strokeColor={strokeColor} setStrokeColor={setStrokeColor}
                        fontSize={fontSize} setFontSize={setFontSize}
                    />
                </div>
            )}

            {/* TAB: PARTICIPANTS */}
            {activeTab === 'participants' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 min-h-0 h-full bg-bg">
                    {/* Left panel */}
                    <div className="lg:col-span-1 border-r border-white/5 p-8 space-y-10 bg-surface/20 backdrop-blur-3xl overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                             <h3 className="font-bold text-[10px] uppercase tracking-[0.25em] text-primary-dim flex items-center gap-2">
                                 <FileSpreadsheet className="w-3 h-3 text-accent" /> Import Data
                             </h3>
                             <p className="text-sm font-medium text-white/40 leading-relaxed">Map and sync participant records from CSV files.</p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-primary-dim uppercase tracking-widest ml-1">Source File (.csv)</label>
                                <div className="relative group/input">
                                    <input type="file" onChange={handleCsvUpload} accept=".csv" className="w-full h-14 rounded-xl bg-white/5 border border-white/5 px-6 text-white text-sm file:hidden cursor-pointer flex items-center transition-all hover:bg-white/10" />
                                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-between">
                                        <span className="text-[11px] font-mono text-white/20 group-hover/input:text-white/40 truncate pr-8">
                                            {csvFile ? csvFile.name : "Select Document..."}
                                        </span>
                                        <Upload className="w-4 h-4 text-white/20 group-hover/input:text-white/40" />
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {csvFile && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-6 rounded-2xl bg-accent/5 border border-accent/20 flex flex-col gap-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                            <p className="text-accent text-xs font-bold uppercase tracking-widest leading-none text-glow">Status: Ready</p>
                                        </div>
                                        <p className="text-white/40 text-[10px] font-mono mt-1">{parsedData.length.toLocaleString()} Valid Records Identified</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={handleSync}
                                disabled={!parsedData.length || isSyncing}
                                className="w-full h-14 rounded-xl bg-white text-black hover:bg-white/90 disabled:opacity-20 transition-all font-bold tracking-tight shadow-xl shadow-white/5 flex items-center justify-center gap-3"
                            >
                                {isSyncing ? "Importing..." : "Start Import"}
                            </button>
                        </div>
                    </div>

                    {/* Right table panel */}
                    <div className="lg:col-span-3 flex flex-col overflow-hidden bg-grid">
                        <div className="p-12 border-b border-white/5 bg-black/40 backdrop-blur-3xl flex justify-between items-end">
                            <div className="space-y-2">
                                <h3 className="text-4xl font-bold tracking-tighter text-white">Participants</h3>
                                <p className="text-[10px] uppercase tracking-[0.4em] text-primary-dim font-bold">Synchronized Database State</p>
                            </div>
                            <div className="text-right border-l border-white/10 pl-10 h-16 flex flex-col justify-end">
                                <span className="text-5xl font-bold text-white tracking-tighter leading-none">
                                    {parsedData.length > 0 ? parsedData.length.toLocaleString() : (dbParticipants ? dbParticipants.length.toLocaleString() : 0)}
                                </span>
                                <span className="text-[10px] text-primary-dim font-bold mt-2 uppercase tracking-[0.2em] block">Total Records</span>
                            </div>
                        </div>

                        {parsedData.length > 0 || dbParticipants.length > 0 ? (
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <div className="px-12 py-5 bg-black/60 border-b border-white/5 flex justify-between items-center sticky top-0 z-20 backdrop-blur-xl">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(191,155,48,0.5)]" />
                                        {parsedData.length > 0 ? "Staging Environment" : "Database"}
                                    </span>
                                    {parsedData.length > 0 && (
                                        <button
                                            onClick={() => { setCsvFile(null); setParsedData([]); }}
                                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-error transition flex items-center gap-3 border border-white/5 rounded-full px-5 py-2 bg-white/5 hover:bg-white/10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Clear Import
                                        </button>
                                    )}
                                </div>
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-12 py-6 uppercase tracking-[0.3em] font-bold text-primary-dim text-[10px] w-32">ID</th>
                                            <th className="px-12 py-6 uppercase tracking-[0.3em] font-bold text-primary-dim text-[10px]">Full Name</th>
                                            <th className="px-12 py-6 uppercase tracking-[0.3em] font-bold text-primary-dim text-[10px]">Email Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(parsedData.length > 0 ? parsedData : dbParticipants).slice(0, 1000).map((row, i) => (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                                <td className="px-12 py-5 font-mono text-zinc-600 group-hover:text-accent transition-colors">{(i + 1).toString().padStart(4, '0')}</td>
                                                <td className="px-12 py-5 font-bold text-white group-hover:text-accent transition-colors">{row.name || row.full_name}</td>
                                                <td className="px-12 py-5 text-zinc-500 font-mono text-xs group-hover:text-zinc-300 transition-colors uppercase tracking-widest">{row.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-10 group">
                                <div className="w-24 h-24 rounded-3xl border border-white/5 bg-white/5 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-700">
                                    <FileSpreadsheet className="w-10 h-10 text-white/10 group-hover:text-white/30 transition-colors" />
                                </div>
                                <div className="text-center space-y-3">
                                    <p className="text-xs uppercase tracking-[0.4em] font-bold text-white/40">No Participants Found</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/10">Click upload above to import your participant list.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-bg">
                    <div className="p-8 md:p-12 border-b border-white/5 bg-black/40 backdrop-blur-3xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                             {[
                                { label: "Total Participants", value: dbParticipants.length },
                                { label: "Successful Claims", value: dbParticipants.filter(p => p.is_claimed).length },
                                { label: "Unclaimed Certificates", value: dbParticipants.filter(p => !p.is_claimed).length }
                             ].map((stat, i) => (
                                <div key={i} className="p-6 md:p-8 rounded-2xl md:rounded-3xl bg-white/5 border border-white/5 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">{stat.label}</p>
                                    <p className="text-3xl md:text-4xl font-bold tracking-tighter text-white">{stat.value.toLocaleString()}</p>
                                </div>
                             ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-6 md:p-12">
                         <div className="rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden bg-black/20 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5">
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-primary-dim">Participant</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-primary-dim text-center">Status</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-primary-dim text-right">Security Hash</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {dbParticipants.map((p, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white tracking-tight">{p.full_name}</span>
                                                    <span className="text-[10px] font-mono text-primary-dim">{p.email}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex justify-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${p.is_claimed ? 'bg-green-500/20 text-green-400 border border-green-500/10' : 'bg-red-500/20 text-red-400 border border-red-500/10'}`}>
                                                        {p.is_claimed ? 'Verified' : 'Pending'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <span className="text-[10px] font-mono text-white/20 truncate max-w-[120px] inline-block hover:text-white transition-colors cursor-help" title={p.cert_hash || 'No hash available'}>
                                                    {p.cert_hash ? `${p.cert_hash.substring(0, 12)}...` : 'X-LOCK-PENDING'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
