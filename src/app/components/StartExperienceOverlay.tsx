import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Play } from 'lucide-react';

export function StartExperienceOverlay() {
    const { isPlaying, setIsPlaying } = useApp();
    const [hasStarted, setHasStarted] = useState(() => {
        // If the user already started it in a navigation session, don't show it again immediately
        return sessionStorage.getItem('soul-fm-experience-started') === 'true';
    });

    // If already playing via some other means, or if we start it here
    useEffect(() => {
        if (isPlaying) {
            setHasStarted(true);
            sessionStorage.setItem('soul-fm-experience-started', 'true');
        }
    }, [isPlaying]);

    const handleStart = () => {
        setHasStarted(true);
        sessionStorage.setItem('soul-fm-experience-started', 'true');

        // Slight delay to let the exit animation begin before audio spikes
        setTimeout(() => {
            setIsPlaying(true);
        }, 100);
    };

    return (
        <AnimatePresence>
            {!hasStarted && (
                <motion.div
                    key="start-overlay"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a1628]/95 backdrop-blur-xl"
                >
                    {/* Background Glow */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/10 rounded-full blur-[100px]"
                        />
                    </div>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
                        className="relative z-10 flex flex-col items-center px-6 text-center"
                    >
                        {/* Minimal Logo / Text Branding */}
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] mb-6 tracking-tighter drop-shadow-[0_0_25px_rgba(0,217,255,0.4)]">
                            SOUL FM
                        </h1>
                        <p className="text-cyan-100/70 text-lg md:text-xl font-light mb-12 max-w-md">
                            The Wave of Your Soul. <br /> Dive into an immersive radio journey.
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleStart}
                            className="group relative flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] rounded-full text-[#0a1628] font-bold text-xl shadow-[0_0_40px_rgba(0,217,255,0.5)] hover:shadow-[0_0_60px_rgba(0,255,170,0.7)] transition-all overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            <Play className="w-7 h-7 fill-current relative z-10 group-hover:scale-110 transition-transform" />
                            <span className="relative z-10 tracking-wide">Enter the Stream</span>
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
