import React from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { ListenerDashboard } from './dashboards/ListenerDashboard';
import { SuperAdminDashboard } from './dashboards/SuperAdminDashboard';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { user, loading } = useApp();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-12 h-12 text-[#00d9ff] animate-spin" />
          <p className="text-white/70">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Route to appropriate dashboard based on role
  const renderDashboard = () => {
    switch (user.role) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'listener':
      default:
        return <ListenerDashboard />;
    }
  };

  return renderDashboard();
}