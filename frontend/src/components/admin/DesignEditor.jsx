import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    IconUpload as Upload, 
    IconTrash as Trash2, 
    IconSave as Save, 
    IconPointer as MousePointer2, 
    // ZoomIn, Ruler, Maximize, Undo2, Redo2, Type, Palette -> We'll use custom paths or simplifications
    IconLayout as Layout,
    IconSheet as Ruler,
    IconPointer as Maximize
} from '../common/Icons';

// Simple custom SVG for Type and Palette since they weren't in common/Icons but we want a unique style
const IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3" {...props}>
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
);

export default function DesignEditor({
    templateUrl,
    onUpload,
    onDelete,
    namePos,
    setNamePos,
    verifyPos,
    setVerifyPos,
    setQrSize, // keep as no-op to avoid breaking interface if not all files updated at once
    onSave,
    onAutoDetect,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    eventName,
    setEventName,
    availableFonts = [],
    onFontUpload,
    onFontDelete,
    onGoogleFontImport,
    isCentered, setIsCentered,
    fontWeight, setFontWeight,
    isItalic, setIsItalic,
    strokeWidth, setStrokeWidth,
    strokeColor, setStrokeColor,
    fontSize, setFontSize,
    fontUrl, fontFilename
}) {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const [imgSize, setImgSize] = useState({ width: 1000, height: 800 });
    const [scale, setScale] = useState(1);
    const [draggingId, setDraggingId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [useLongName, setUseLongName] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showFontModal, setShowFontModal] = useState(false);
    const [tempUrl, setTempUrl] = useState('');

    // Load Image to get natural dimensions
    useEffect(() => {
        if (!templateUrl) return;
        const img = new Image();
        img.onload = () => {
            setImgSize({ width: img.width, height: img.height });
        };
        img.src = templateUrl;
    }, [templateUrl]);

    // Dynamic Font Injection (Google & Custom Uploads)
    useEffect(() => {
        // Clean up previous dynamic font styles
        const existingStyle = document.getElementById('dynamic-font-style');
        if (existingStyle) existingStyle.remove();
        const existingLink = document.getElementById('dynamic-font-link');
        if (existingLink) existingLink.remove();

        if (fontUrl && fontUrl.startsWith('https://fonts.googleapis.com')) {
            const link = document.createElement('link');
            link.id = 'dynamic-font-link';
            link.rel = 'stylesheet';
            link.href = fontUrl;
            document.head.appendChild(link);
        } else if (fontFilename) {
            const fontName = fontFilename.split('.')[0];
            const style = document.createElement('style');
            style.id = 'dynamic-font-style';
            style.appendChild(document.createTextNode(`
                @font-face {
                    font-family: '${fontName}';
                    src: url('http://localhost:8000/assets/fonts/${fontFilename}') format('truetype');
                }
            `));
            document.head.appendChild(style);
        }
    }, [fontUrl, fontFilename]);

    // Handle Zoom/Scaling
    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current || !imgSize.width) return;
            const padding = 40;
            const containerW = containerRef.current.clientWidth - padding;
            const containerH = containerRef.current.clientHeight - padding;
            
            const s = Math.min(containerW / imgSize.width, containerH / imgSize.height);
            setScale(s > 0 ? s : 1);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [imgSize]);

    // Coordinate Translation: Mouse -> SVG Pixels
    const getSvgCoords = (e) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenBBox ? svgRef.current.getScreenBBox() : svgRef.current.getBoundingClientRect();
        const x = (e.clientX - CTM.left) / scale;
        const y = (e.clientY - CTM.top) / scale;
        return { x, y };
    };

    const handlePointerDown = (e, id) => {
        e.stopPropagation();
        setSelectedId(id);
        const { x, y } = getSvgCoords(e);
        const pos = id === 'name' ? namePos : verifyPos;
        setDraggingId(id);
        setDragOffset({ x: x - pos.x, y: y - pos.y });
        svgRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!draggingId) return;
        const { x, y } = getSvgCoords(e);
        let newX = x - dragOffset.x;
        let newY = y - dragOffset.y;

        // Snapping logic if name is centered
        if (draggingId === 'name') {
            const centerX = imgSize.width / 2;
            if (Math.abs(newX - (isCentered ? centerX : centerX - 200)) < (20 / scale)) {
                if (isCentered) newX = centerX;
            }
            setNamePos({ x: Math.round(newX), y: Math.round(newY) });
        } else if (draggingId === 'verify') {
            const centerX = imgSize.width / 2;
            if (Math.abs(newX - (isCentered ? centerX : centerX - 200)) < (20 / scale)) {
                if (isCentered) newX = centerX;
            }
            setVerifyPos({ x: Math.round(newX), y: Math.round(newY) });
        }
    };

    const handlePointerUp = (e) => {
        setDraggingId(null);
        if (svgRef.current) svgRef.current.releasePointerCapture(e.pointerId);
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-0 select-none bg-bg text-primary font-sans">
            {/* SIDEBAR */}
            <div className="w-full lg:w-96 shrink-0 flex flex-col gap-0 h-full overflow-y-auto border-r border-white/5 bg-surface/20 backdrop-blur-3xl custom-scrollbar">
                
                {/* Actions & Stats */}
                <div className="p-8 border-b border-white/5 space-y-8 bg-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-dim flex items-center gap-2">
                             <Ruler className="w-3 h-3" /> Positioning
                        </label>
                        <div className="flex gap-2">
                            <span className="text-[9px] font-mono text-white/40 border border-white/10 px-2 py-1 bg-black/40 leading-none uppercase tracking-widest">{imgSize.width}×{imgSize.height} PX</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Name X Position</label>
                            <input type="number" value={namePos.x} onChange={e => setNamePos(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-accent font-mono focus:border-accent/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Name Y Position</label>
                            <input type="number" value={namePos.y} onChange={e => setNamePos(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-accent font-mono focus:border-accent/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Verify X Position</label>
                            <input type="number" value={verifyPos.x} onChange={e => setVerifyPos(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-white/60 font-mono focus:border-white/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Verify Y Position</label>
                            <input type="number" value={verifyPos.y} onChange={e => setVerifyPos(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-white/60 font-mono focus:border-white/50 outline-none transition-all" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                         <button 
                            onClick={onSave} 
                            className="w-full h-14 rounded-xl bg-white text-black hover:bg-white/90 font-bold tracking-tight shadow-xl shadow-white/5 flex items-center justify-center gap-3 transition-all"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => {
                                    setNamePos({ 
                                        x: Math.round(imgSize.width / 2), 
                                        y: Math.round(imgSize.height / 2) 
                                    });
                                    setIsCentered(true);
                                }} 
                                title="Center name on canvas"
                                className="h-12 rounded-xl bg-white/5 border border-white/5 text-primary-dim hover:text-white hover:bg-white/10 flex items-center justify-center gap-2 transition-all"
                            >
                                <Maximize className="w-3 h-3" /> Center Name
                            </button>
                             <button 
                                onClick={() => {
                                    setVerifyPos({ 
                                        x: Math.round(imgSize.width / 2), 
                                        y: verifyPos.y 
                                    });
                                    setIsCentered(true);
                                }} 
                                title="Center verification URL horizontally"
                                className="h-12 rounded-xl bg-white/5 border border-white/5 text-primary-dim hover:text-white hover:bg-white/10 flex items-center justify-center gap-2 transition-all"
                            >
                                <Maximize className="w-3 h-3" /> Center Verify
                            </button>
                        </div>
                        <button 
                            onClick={onAutoDetect} 
                            className="w-full h-12 rounded-xl bg-accent text-white font-bold text-xs hover:opacity-90 flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/10"
                        >
                            <MousePointer2 className="w-3 h-3" /> Auto-Detect Name Line
                        </button>
                    </div>
                </div>

                {/* Template Section */}
                <div className="p-8 border-b border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-dim flex items-center gap-2">
                            <Upload className="w-3 h-3" /> Template
                        </label>
                        {templateUrl && (
                            <button onClick={onDelete} className="text-white/40 hover:text-error transition group">
                                <Trash2 className="w-4 h-4 transition-transform group-active:scale-90" />
                            </button>
                        )}
                    </div>
                    
                    {!templateUrl ? (
                        <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer relative group">
                            <input type="file" onChange={onUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/40 transition-colors">
                                <Upload className="w-5 h-5 text-white/40 group-hover:text-white" />
                            </div>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">Upload Template</p>
                        </div>
                    ) : (
                        <div className="relative group overflow-hidden border border-white/5 aspect-[4/3] bg-black/40 rounded-2xl">
                             <img src={templateUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                  <label className="cursor-pointer h-12 px-6 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                                      Swap Template
                                      <input type="file" onChange={onUpload} accept="image/*" className="hidden" />
                                  </label>
                             </div>
                        </div>
                    )}
                </div>

                {/* Name Styling */}
                <div className="p-8 border-b border-white/5 space-y-6">
                    <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-dim flex items-center gap-2">
                        <IconType className="w-3 h-3" /> Text Style
                    </label>
                    
                    <div className="space-y-6">
                        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
                            <button 
                                onClick={() => setIsCentered(false)} 
                                className={`flex-1 py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${!isCentered ? 'bg-white text-black shadow-lg' : 'text-zinc-600 hover:text-white'}`}
                            >
                                Left
                            </button>
                            <button 
                                onClick={() => setIsCentered(true)} 
                                className={`flex-1 py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${isCentered ? 'bg-white text-black shadow-lg' : 'text-zinc-600 hover:text-white'}`}
                            >
                                Center
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Font Size</label>
                                <input type="number" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 font-mono text-white outline-none focus:border-accent/50 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Text Color</label>
                                <div className="h-12 w-full rounded-xl bg-white/5 border border-white/5 flex items-center px-1 overflow-hidden transition-all focus-within:border-accent/50">
                                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-10 w-full bg-transparent cursor-pointer border-none scale-125" />
                                </div>
                            </div>
                        </div>

                        {/* Google Font Import */}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] font-bold text-primary-dim uppercase tracking-widest ml-1">Font Family</label>
                                <label className="cursor-pointer group/upload">
                                    <Upload className="w-3 h-3 text-white/20 group-hover/upload:text-accent transition-colors" />
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept=".ttf,.otf"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                onFontUpload(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <div className="relative">
                                <select 
                                    value={fontFamily} 
                                    onChange={e => {
                                        if (e.target.value === 'custom') {
                                            setShowFontModal(true);
                                        } else {
                                            setFontFamily(e.target.value);
                                        }
                                    }} 
                                    className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-[11px] font-bold uppercase tracking-widest text-white appearance-none outline-none focus:border-accent/50 transition-all font-mono"
                                >
                                    {availableFonts.map(f => {
                                        const name = typeof f === 'string' ? f : f.name;
                                        const isCustom = typeof f !== 'string' && f.type === 'custom';
                                        return (
                                            <option key={name} value={name} className="bg-surface text-white">
                                                {name} {isCustom ? '[MOD]' : ''}
                                            </option>
                                        );
                                    })}
                                    <option value="custom" className="bg-surface text-[#FF9D00] font-bold italic">
                                        + CUSTOM FONT...
                                    </option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <Layout className="w-3 h-3" />
                                </div>
                            </div>
                        </div>

                        {/* Font Source Labels */}
                        {fontUrl && (
                            <div className="space-y-1.5 p-4 rounded-xl bg-accent/5 border border-accent/20 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[8px] font-bold text-accent uppercase tracking-[0.2em]">Font CSS URL</label>
                                <p className="text-[9px] text-white/60 truncate font-mono">{fontUrl}</p>
                            </div>
                        )}
                        {fontFilename && (
                            <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[8px] font-bold text-primary-dim uppercase tracking-[0.2em]">TTF File Upload</label>
                                    <button onClick={onFontDelete} className="text-white/40 hover:text-error transition group">
                                        <Trash2 className="w-3 h-3 transition-transform group-active:scale-90" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                                        <IconType className="w-3 h-3 text-white" />
                                    </div>
                                    <p className="text-[10px] text-white font-bold">{fontFilename}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Controls */}
                <div className="p-8 pb-12">
                   <button 
                        onClick={() => setUseLongName(!useLongName)} 
                        className={`w-full py-5 rounded-2xl border text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${useLongName ? 'bg-accent text-white border-accent shadow-xl shadow-accent/20' : 'bg-white/5 border-white/5 text-primary-dim hover:text-white hover:border-white/20'}`}
                    >
                        {useLongName ? "Long Name: Active" : "Test Long Name"}
                    </button>
                </div>
            </div>

            {/* CANVAS AREA */}
            <div className="flex-1 bg-grid relative flex flex-col justify-center items-center group/canvas p-12 min-h-0 min-w-0" ref={containerRef}>
                <div className="absolute top-8 left-8 z-10">
                    <div className="bg-bg/90 backdrop-blur border border-border text-[10px] font-mono px-4 py-2 text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-accent" /> SCALE: {Math.round(scale * 100)}%
                    </div>
                </div>

                {templateUrl ? (
                    <div 
                        style={{ 
                            width: imgSize.width * scale, 
                            height: imgSize.height * scale,
                            position: 'relative',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        <img 
                            src={templateUrl} 
                            style={{ width: '100%', height: '100%', display: 'block' }} 
                            draggable={false} 
                        />
                        <svg
                            ref={svgRef}
                            viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: draggingId ? 'grabbing' : 'crosshair',
                                touchAction: 'none'
                            }}
                            onClick={() => setSelectedId(null)}
                        >
                            {/* Structural Guides */}
                            <line x1={0} y1={namePos.y} x2={imgSize.width} y2={namePos.y} stroke="var(--color-border)" strokeWidth={0.5 / scale} strokeDasharray="4,4" />
                            <line x1={namePos.x} y1={0} x2={namePos.x} y2={imgSize.height} stroke="var(--color-border)" strokeWidth={0.5 / scale} strokeDasharray="4,4" />

                            {/* Horizontal Snap Line */}
                            {draggingId === 'name' && (
                                <line 
                                    x1={imgSize.width / 2} y1={0} 
                                    x2={imgSize.width / 2} y2={imgSize.height} 
                                    stroke="var(--color-accent)" strokeWidth={2 / scale} 
                                    strokeDasharray={`${4 / scale},${4 / scale}`} 
                                />
                            )}

                            {/* Name Element */}
                            <g
                                onPointerDown={(e) => handlePointerDown(e, 'name')}
                                style={{ cursor: 'grab' }}
                            >
                                <text
                                    x={namePos.x}
                                    y={namePos.y}
                                    fill={textColor}
                                    fontSize={fontSize}
                                    fontFamily={fontFamily.includes('-') ? fontFamily.split('-')[0] : fontFamily}
                                    fontWeight={fontWeight === 'Bold' ? 'bold' : 'normal'}
                                    fontStyle={isItalic ? 'italic' : 'normal'}
                                    textAnchor={isCentered ? "middle" : "start"}
                                    dominantBaseline="auto"
                                    style={{
                                        userSelect: 'none',
                                        stroke: strokeWidth > 0 ? strokeColor : 'none',
                                        strokeWidth: strokeWidth / 2
                                    }}
                                >                                    {useLongName ? "ALEXANDER HAMILTON" : "Participant Name"}
                                </text>
                                {selectedId === 'name' && (
                                    <rect 
                                        x={isCentered ? namePos.x - 200 : namePos.x}
                                        y={namePos.y - fontSize}
                                        width={400}
                                        height={fontSize * 1.5}
                                        fill="none"
                                        stroke="var(--color-accent)"
                                        strokeWidth={1 / scale}
                                        strokeDasharray={`${10 / scale},${5 / scale}`}
                                        pointerEvents="none"
                                    />
                                )}
                            </g>

                            {/* Verify Element */}
                            <g
                                onPointerDown={(e) => handlePointerDown(e, 'verify')}
                                style={{ cursor: 'grab' }}
                            >
                                <text
                                    x={verifyPos.x}
                                    y={verifyPos.y}
                                    fill="#333333"
                                    fontSize={Math.max(10, Math.floor(fontSize * 0.35))}
                                    fontFamily={fontFamily.includes('-') ? fontFamily.split('-')[0] : fontFamily}
                                    fontWeight={'bold'}
                                    fontStyle={'normal'}
                                    textAnchor={isCentered ? "middle" : "start"}
                                    dominantBaseline="auto"
                                    style={{
                                        userSelect: 'none',
                                    }}
                                >
                                    certgen.io/verify/ID-1234
                                </text>
                                {selectedId === 'verify' && (
                                    <rect 
                                        x={isCentered ? verifyPos.x - 100 : verifyPos.x}
                                        y={verifyPos.y - Math.max(10, Math.floor(fontSize * 0.35))}
                                        width={200}
                                        height={Math.max(10, Math.floor(fontSize * 0.35)) * 1.5}
                                        fill="none"
                                        stroke="var(--color-accent)"
                                        strokeWidth={1 / scale}
                                        strokeDasharray={`${10 / scale},${5 / scale}`}
                                        pointerEvents="none"
                                    />
                                )}
                            </g>
                        </svg>

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-8 opacity-20">
                        <div className="w-32 h-32 border-2 border-border border-dashed flex items-center justify-center">
                            <Layout className="w-12 h-12" />
                        </div>
                        <div className="text-center space-y-2">
                             <p className="font-bold text-[10px] uppercase tracking-[0.4em]">System Ready</p>
                             <p className="text-[10px] uppercase tracking-widest text-zinc-600">Upload a template to begin</p>
                        </div>
                    </div>
                )}
            </div>
            {/* CUSTOM FONT PORTAL MODAL */}
            {showFontModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div 
                        className="bg-surface w-full max-w-2xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Custom Font Portal</h2>
                                <p className="text-xs text-primary-dim mt-1">Ingest high-fidelity typography for your certificates</p>
                            </div>
                            <button 
                                onClick={() => setShowFontModal(false)}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                            >
                                <Trash2 className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Modal Body - Split Panes */}
                        <div className="flex flex-col">
                            {/* Top: Google Font URL */}
                            <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-lg bg-accent/20 border border-accent/20">
                                        <IconType className="w-4 h-4 text-accent" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Google Font URL</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <input 
                                            type="text"
                                            placeholder="https://fonts.googleapis.com/css2?family=Playfair+Display..."
                                            value={tempUrl}
                                            onChange={e => setTempUrl(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && tempUrl) {
                                                    onGoogleFontImport(tempUrl);
                                                    setShowFontModal(false);
                                                    setTempUrl('');
                                                }
                                            }}
                                            className="flex-1 h-14 rounded-2xl bg-black/40 border border-white/10 px-6 text-xs text-white outline-none focus:border-accent/50 transition-all font-mono"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (tempUrl) {
                                                    onGoogleFontImport(tempUrl);
                                                    setShowFontModal(false);
                                                    setTempUrl('');
                                                }
                                            }}
                                            className="px-8 rounded-2xl bg-accent text-white font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
                                        >
                                            Import
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 ml-2">Example: https://fonts.googleapis.com/css2?family=Roboto:wght@400;700</p>
                                </div>
                            </div>

                            {/* Bottom: TTF Upload */}
                            <div className="p-10 relative group/drop">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                                        <Upload className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Direct TTF Upload</h3>
                                </div>
                                
                                <label className="block w-full h-48 rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20 transition-all cursor-pointer relative group-hover/drop:scale-[1.01] overflow-hidden">
                                    <input 
                                        type="file" 
                                        accept=".ttf,.otf" 
                                        className="hidden" 
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                onFontUpload(e.target.files[0]);
                                                setShowFontModal(false);
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110">
                                            <Upload className="w-6 h-6 text-primary-dim" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Drag & Drop Font</p>
                                            <p className="text-[10px] text-zinc-500 mt-2">Supports .ttf, .otf, and .woff (truetype-flavored)</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-6 bg-black/40 flex justify-end">
                            <button 
                                onClick={() => setShowFontModal(false)}
                                className="px-8 py-3 rounded-xl text-[10px] font-bold text-primary-dim uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
