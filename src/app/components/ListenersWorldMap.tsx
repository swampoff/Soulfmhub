import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Users, MapPin, Globe } from 'lucide-react';
import { api } from '../../lib/api';

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

interface Listener {
  id: string;
  country: string;
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
  connectedAt: string;
  userAgent?: string;
}

export function ListenersWorldMap() {
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [hoveredListener, setHoveredListener] = useState<Listener | null>(null);
  const [totalListeners, setTotalListeners] = useState(0);
  const [countries, setCountries] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadListeners();
    
    // Update listeners every 10 seconds
    const interval = setInterval(loadListeners, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadListeners = async () => {
    try {
      const response = await api.getActiveListeners();
      const listenerData = response.listeners || [];
      
      setListeners(listenerData);
      setTotalListeners(listenerData.length);
      
      const uniqueCountries = new Set(listenerData.map((l: Listener) => l.country));
      setCountries(uniqueCountries);
    } catch (error) {
      console.error('Error loading listeners:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00d9ff]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#00d9ff]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalListeners}</p>
              <p className="text-xs text-slate-400">Active Listeners</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00ffaa]/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#00ffaa]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{countries.size}</p>
              <p className="text-xs text-slate-400">Countries</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00d9ff]/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#00d9ff]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{listeners.length}</p>
              <p className="text-xs text-slate-400">Live Connections</p>
            </div>
          </div>
        </Card>
      </div>

      {/* World Map */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6 relative overflow-hidden">
        <div className="relative">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 147,
              center: [0, 20]
            }}
            className="w-full h-auto"
            style={{
              width: '100%',
              height: 'auto',
            }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#2d3748', outline: 'none' },
                      pressed: { fill: '#1a202c', outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Listener Markers */}
            {listeners.map((listener) => (
              <Marker
                key={listener.id}
                coordinates={listener.coordinates}
                onMouseEnter={() => setHoveredListener(listener)}
                onMouseLeave={() => setHoveredListener(null)}
              >
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Pulsing circle */}
                  <motion.circle
                    r={8}
                    fill="#00d9ff"
                    fillOpacity={0.2}
                    animate={{
                      r: [8, 12, 8],
                      fillOpacity: [0.2, 0, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  {/* Main dot */}
                  <circle
                    r={4}
                    fill="#00d9ff"
                    stroke="#fff"
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                  />
                </motion.g>
              </Marker>
            ))}
          </ComposableMap>

          {/* Hover Tooltip */}
          <AnimatePresence>
            {hoveredListener && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-[#00d9ff]/30 rounded-lg p-4 shadow-xl"
                style={{ pointerEvents: 'none' }}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#00d9ff]" />
                    <span className="text-white font-medium">
                      {hoveredListener.city}, {hoveredListener.country}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Connected: {new Date(hoveredListener.connectedAt).toLocaleTimeString()}
                  </div>
                  {hoveredListener.userAgent && (
                    <div className="text-xs text-slate-500 max-w-[200px] truncate">
                      {hoveredListener.userAgent}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00d9ff]" />
            <span className="text-slate-400">Active Listener</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00d9ff] opacity-30 animate-pulse" />
            <span className="text-slate-400">Live Stream</span>
          </div>
        </div>
      </Card>

      {/* Recent Listeners List */}
      {listeners.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Recent Connections</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {listeners.slice(0, 10).map((listener) => (
              <motion.div
                key={listener.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#00ffaa] animate-pulse" />
                  <div>
                    <p className="text-white font-medium text-sm">
                      {listener.city}, {listener.country}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(listener.connectedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30">
                  Live
                </Badge>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
