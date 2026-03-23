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
    qrPos,
    setQrPos,
    qrSize,
    setQrSize,
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
    isCentered, setIsCentered,
    fontWeight, setFontWeight,
    isItalic, setIsItalic,
    strokeWidth, setStrokeWidth,
    strokeColor, setStrokeColor,
    fontSize, setFontSize
}) {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const [imgSize, setImgSize] = useState({ width: 1000, height: 800 });
    const [scale, setScale] = useState(1);
    const [draggingId, setDraggingId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [useLongName, setUseLongName] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Load Image to get natural dimensions
    useEffect(() => {
        if (!templateUrl) return;
        const img = new Image();
        img.onload = () => {
            setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = templateUrl;
    }, [templateUrl]);

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
        const pos = id === 'name' ? namePos : qrPos;
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
                // If centered, namePos.x IS the center.
                if (isCentered) newX = centerX;
                // Simplified snap for name
            }
            setNamePos({ x: Math.round(newX), y: Math.round(newY) });
        } else {
            setQrPos({ x: Math.round(newX), y: Math.round(newY) });
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
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">X Position</label>
                            <input type="number" value={namePos.x} onChange={e => setNamePos(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-accent font-mono focus:border-accent/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Y Position</label>
                            <input type="number" value={namePos.y} onChange={e => setNamePos(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))} className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-accent font-mono focus:border-accent/50 outline-none transition-all" />
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
                                    setNamePos(prev => ({ ...prev, x: Math.round(imgSize.width / 2) }));
                                    setIsCentered(true);
                                }} 
                                className="h-12 rounded-xl bg-white/5 border border-white/5 text-primary-dim hover:text-white hover:bg-white/10 flex items-center justify-center gap-2 transition-all"
                            >
                                <Maximize className="w-3 h-3" /> Center Text
                            </button>
                            <button 
                                onClick={onAutoDetect} 
                                className="h-12 rounded-xl bg-accent text-white font-bold text-xs hover:opacity-90 flex items-center justify-center gap-2 transition-all"
                            >
                                <MousePointer2 className="w-3 h-3" /> Auto-Detect
                            </button>
                        </div>
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
                                <div className="h-12 w-full rounded-xl bg-white/5 border border-white/5 flex items-center px-1 overflow-hidden">
                                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-8 w-full bg-transparent cursor-pointer border-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-primary-dim uppercase ml-1 tracking-widest">Font Family</label>
                            <div className="relative">
                                <select 
                                    value={fontFamily} 
                                    onChange={e => setFontFamily(e.target.value)} 
                                    className="w-full h-12 rounded-xl bg-white/5 border border-white/5 px-4 text-[11px] font-bold uppercase tracking-widest text-white appearance-none outline-none focus:border-accent/50 transition-all"
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
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <Layout className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
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
                            <line x1={0} y1={qrPos.y} x2={imgSize.width} y2={qrPos.y} stroke="var(--color-border)" strokeWidth={0.5 / scale} strokeDasharray="4,4" />
                            <line x1={qrPos.x} y1={0} x2={qrPos.x} y2={imgSize.height} stroke="var(--color-border)" strokeWidth={0.5 / scale} strokeDasharray="4,4" />

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
                                    fontFamily={fontFamily.split('-')[0]}
                                    fontWeight={fontWeight === 'Bold' ? 'bold' : 'normal'}
                                    fontStyle={isItalic ? 'italic' : 'normal'}
                                    textAnchor={isCentered ? "middle" : "start"}
                                    dominantBaseline="central"
                                    style={{
                                        userSelect: 'none',
                                        stroke: strokeWidth > 0 ? strokeColor : 'none',
                                        strokeWidth: strokeWidth / 2
                                    }}
                                >
                                    {useLongName ? "ALEXANDER HAMILTON" : "Participant Name"}
                                </text>
                                {selectedId === 'name' && (
                                    <rect 
                                        x={isCentered ? namePos.x - 200 : namePos.x}
                                        y={namePos.y - (fontSize / 2)}
                                        width={400}
                                        height={fontSize}
                                        fill="none"
                                        stroke="var(--color-accent)"
                                        strokeWidth={1 / scale}
                                        strokeDasharray={`${10 / scale},${5 / scale}`}
                                        pointerEvents="none"
                                    />
                                )}
                            </g>

                            {/* QR Placeholder */}
                            <g
                                onPointerDown={(e) => handlePointerDown(e, 'qr')}
                                style={{ cursor: 'grab' }}
                            >
                                <rect
                                    x={qrPos.x}
                                    y={qrPos.y}
                                    width={qrSize}
                                    height={qrSize}
                                    fill="var(--color-primary)"
                                    fillOpacity={0.1}
                                    stroke={selectedId === 'qr' ? 'var(--color-accent)' : 'var(--color-border-heavy)'}
                                    strokeWidth={1 / scale}
                                />
                                <rect x={qrPos.x} y={qrPos.y} width={qrSize} height={qrSize} fill="url(#grid)" opacity={0.5} />
                                <defs>
                                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--color-border)" strokeWidth="0.5"/>
                                    </pattern>
                                </defs>
                                <text 
                                    x={qrPos.x + 5} 
                                    y={qrPos.y + 15} 
                                    fontSize={10} 
                                    fill="var(--color-primary-dim)"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    opacity={0.8}
                                >
                                    QR Code
                                </text>
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
        </div>
    );
}
