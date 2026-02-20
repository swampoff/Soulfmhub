import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Palette,
  Type,
  Eye,
  Save,
  Radio,
  RefreshCw,
  Globe,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
const soulFmLogo = '/favicon.ico'; // Automatically fixed figma asset import

interface BrandSettings {
  stationName: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgDark: string;
  fontDisplay: string;
  fontBody: string;
  metaTitle: string;
  metaDescription: string;
}

const DEFAULT_SETTINGS: BrandSettings = {
  stationName: 'Soul FM Hub',
  tagline: 'The Wave of Your Soul',
  description: 'Online radio station dedicated to soul, funk, R&B, and jazz music. Broadcasting 24/7.',
  primaryColor: '#00d9ff',
  secondaryColor: '#00ffaa',
  accentColor: '#FF8C42',
  bgDark: '#0a1628',
  fontDisplay: 'Righteous',
  fontBody: 'Space Grotesk',
  metaTitle: 'Soul FM Hub — The Wave of Your Soul',
  metaDescription: 'Listen to the best soul, funk, R&B, and jazz music 24/7. Live DJs, curated playlists, and community.',
};

const FONT_OPTIONS = ['Righteous', 'Space Grotesk', 'Outfit', 'Montserrat', 'Bebas Neue', 'Raleway', 'DM Sans', 'Syne', 'Urbanist'];

export function BrandingPage() {
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await api.getBrandingSettings();
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
    } catch (error) {
      console.error('[Branding] Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof BrandSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateBrandingSettings(settings);
      setHasChanges(false);
      toast.success('Branding settings saved!');
    } catch (error) {
      console.error('[Branding] Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast.info('Settings reset to defaults — click Save to apply');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading branding settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Palette className="w-6 h-6 text-[#00d9ff]" />
              Station Branding
            </h1>
            <p className="text-sm text-white/40 mt-1">Customize your station's look, colors, and typography</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="border-white/10 text-white/60 hover:text-white gap-1">
              <RefreshCw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold gap-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Station Identity */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#00d9ff]" />
                Station Identity
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Station Name</label>
                  <Input
                    value={settings.stationName}
                    onChange={(e) => updateField('stationName', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Tagline</label>
                  <Input
                    value={settings.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Description</label>
                  <Textarea
                    value={settings.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* Colors */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#00ffaa]" />
                Brand Colors
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: 'primaryColor' as const, label: 'Primary', desc: 'Main accent color (cyan)' },
                  { key: 'secondaryColor' as const, label: 'Secondary', desc: 'Secondary accent (mint)' },
                  { key: 'accentColor' as const, label: 'Accent', desc: 'Highlights and CTAs' },
                  { key: 'bgDark' as const, label: 'Background', desc: 'Dark background base' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer"
                        style={{ backgroundColor: settings[key] }}
                      />
                      <input
                        type="color"
                        value={settings[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">{label}</div>
                      <div className="text-xs text-white/30">{desc}</div>
                      <Input
                        value={settings[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="mt-1 h-7 text-xs bg-white/5 border-white/10 text-white/60 w-28"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Typography */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-[#FF8C42]" />
                Typography
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Display Font (Headings)</label>
                  <select
                    value={settings.fontDisplay}
                    onChange={(e) => updateField('fontDisplay', e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-white/5 text-white px-3 py-2 text-sm outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-[#0a1628]">{f}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-lg" style={{ fontFamily: `${settings.fontDisplay}, sans-serif` }}>
                    <span className="text-white">Soul FM Hub</span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Body Font</label>
                  <select
                    value={settings.fontBody}
                    onChange={(e) => updateField('fontBody', e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-white/5 text-white px-3 py-2 text-sm outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-[#0a1628]">{f}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm" style={{ fontFamily: `${settings.fontBody}, sans-serif` }}>
                    <span className="text-white/60">The best soul music, 24/7 on your frequency.</span>
                  </p>
                </div>
              </div>
            </Card>

            {/* SEO / Meta */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#9C27B0]" />
                SEO & Metadata
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Meta Title</label>
                  <Input
                    value={settings.metaTitle}
                    onChange={(e) => updateField('metaTitle', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Meta Description</label>
                  <Textarea
                    value={settings.metaDescription}
                    onChange={(e) => updateField('metaDescription', e.target.value)}
                    rows={2}
                    className="bg-white/5 border-white/10 text-white resize-none"
                  />
                  <div className="text-xs text-white/25 mt-1">{settings.metaDescription.length}/160 characters</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Preview Sidebar */}
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 p-6 sticky top-24">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </h3>

              <div
                className="rounded-xl p-4 border border-white/10 mb-4"
                style={{ backgroundColor: settings.bgDark }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <img src={soulFmLogo} alt="Logo" className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="font-bold text-sm" style={{ fontFamily: `${settings.fontDisplay}, cursive`, color: settings.primaryColor }}>
                      {settings.stationName}
                    </div>
                    <div className="text-[10px]" style={{ fontFamily: `${settings.fontBody}, sans-serif`, color: `${settings.primaryColor}80` }}>
                      {settings.tagline}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-2 rounded-full flex-1" style={{ backgroundColor: settings.primaryColor }} />
                  <div className="h-2 rounded-full w-8" style={{ backgroundColor: settings.secondaryColor }} />
                  <div className="h-2 rounded-full w-4" style={{ backgroundColor: settings.accentColor }} />
                </div>
                <p className="text-[10px] mt-3 leading-relaxed" style={{ fontFamily: `${settings.fontBody}, sans-serif`, color: 'rgba(255,255,255,0.5)' }}>
                  {settings.description}
                </p>
              </div>

              <div className="flex gap-2">
                {[settings.primaryColor, settings.secondaryColor, settings.accentColor, settings.bgDark].map((c, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 rounded-lg border border-white/10"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
