import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { motion } from 'motion/react';
import {
  Music,
  User,
  Disc,
  Clock,
  Tag,
  Calendar,
  Activity,
  Image,
  Search,
  CheckCircle,
  Download
} from 'lucide-react';

export function MetadataExtractionDemo() {
  const steps = [
    {
      icon: Music,
      title: 'Upload Audio File',
      description: 'Drop your MP3 file',
      color: 'from-[#00d9ff] to-[#0099cc]'
    },
    {
      icon: Search,
      title: 'Extract ID3 Tags',
      description: 'Automatically reads embedded metadata',
      color: 'from-[#00ffaa] to-[#00cc88]',
      metadata: [
        { icon: User, label: 'Artist', example: 'James Brown' },
        { icon: Music, label: 'Title', example: 'Get Up Offa That Thing' },
        { icon: Disc, label: 'Album', example: 'Get Up Offa That Thing' },
        { icon: Tag, label: 'Genre', example: 'Funk' },
        { icon: Calendar, label: 'Year', example: '1976' },
        { icon: Activity, label: 'BPM', example: '115' },
        { icon: Clock, label: 'Duration', example: '3:42' }
      ]
    },
    {
      icon: Image,
      title: 'Get Cover Art',
      description: 'Multi-source cover art retrieval',
      color: 'from-purple-500 to-purple-700',
      sources: [
        { name: 'ID3 Embedded', priority: 1, icon: CheckCircle },
        { name: 'MusicBrainz API', priority: 2, icon: Search },
        { name: 'Genre Default', priority: 3, icon: Image }
      ]
    },
    {
      icon: Activity,
      title: 'Generate Waveform',
      description: 'Optional visual waveform data',
      color: 'from-orange-500 to-red-500',
      optional: true
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center">
          <Music className="w-6 h-6 text-slate-900" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white font-righteous">
            Automatic Metadata Extraction
          </h3>
          <p className="text-sm text-slate-400">
            AI-powered music metadata processing pipeline
          </p>
        </div>
      </div>

      {/* Process Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-6 top-16 w-0.5 h-12 bg-gradient-to-b from-slate-600 to-transparent" />
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <step.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-semibold">{step.title}</h4>
                  {step.optional && (
                    <Badge className="bg-slate-700 text-slate-300 text-xs">
                      Optional
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-3">{step.description}</p>

                {/* Metadata Fields */}
                {step.metadata && (
                  <div className="grid grid-cols-2 gap-2">
                    {step.metadata.map((field, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50"
                      >
                        <field.icon className="w-3 h-3 text-[#00d9ff]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">{field.label}</p>
                          <p className="text-sm text-white truncate">{field.example}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cover Sources */}
                {step.sources && (
                  <div className="space-y-2">
                    {step.sources.map((source, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00d9ff]/20 text-[#00d9ff] font-bold text-sm">
                          {source.priority}
                        </div>
                        <source.icon className="w-4 h-4 text-[#00ffaa]" />
                        <p className="text-sm text-white">{source.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-300">
            <p className="font-semibold text-white mb-2">What happens during upload:</p>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>
                <strong className="text-slate-300">Step 1:</strong> Audio file is uploaded to secure storage
              </li>
              <li>
                <strong className="text-slate-300">Step 2:</strong> ID3 tags are parsed using music-metadata library
              </li>
              <li>
                <strong className="text-slate-300">Step 3:</strong> If cover art is embedded, it's extracted and uploaded
              </li>
              <li>
                <strong className="text-slate-300">Step 4:</strong> If no cover, MusicBrainz API is queried
              </li>
              <li>
                <strong className="text-slate-300">Step 5:</strong> Fallback to genre-specific default cover if needed
              </li>
              <li>
                <strong className="text-slate-300">Step 6:</strong> Optional waveform generation (100 data points)
              </li>
              <li>
                <strong className="text-slate-300">Step 7:</strong> Track is added to library with all metadata
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Example */}
      <div className="mt-4 p-4 bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/10 border border-[#00d9ff]/30 rounded-lg">
        <p className="text-xs font-semibold text-[#00d9ff] mb-2">EXAMPLE</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Disc className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">James Brown - Get Up Offa That Thing</p>
            <p className="text-sm text-slate-400">Get Up Offa That Thing (1976) • Funk • 3:42</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                Cover: MusicBrainz
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                ID3: Complete
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
