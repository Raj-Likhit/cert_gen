import React from 'react';
import { IconAlert } from './Icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
                    
                    <div className="relative z-10 space-y-12 max-w-xl">
                        <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mx-auto shadow-2xl shadow-accent/5">
                            <IconAlert className="w-12 h-12 text-accent" />
                        </div>
                        
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                Console Stalled
                            </h1>
                            <p className="text-primary-dim text-lg font-medium leading-relaxed">
                                An unexpected exception occurred during the secure handshake. <br />
                                The incident has been logged for administrative review.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-10 py-4 bg-white text-bg rounded-2xl font-bold tracking-tight hover:scale-105 transition-all text-sm uppercase"
                            >
                                Re-initialize Session
                            </button>
                            
                            {process.env.NODE_ENV === 'development' && (
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-left overflow-auto max-w-full text-[10px] font-mono text-accent/80">
                                    {this.state.error?.toString()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
