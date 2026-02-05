import React from 'react';
import { SuperAdminDashboard } from './SuperAdminDashboard';

// Host has same capabilities as Super Admin
export function HostDashboard() {
  return <SuperAdminDashboard />;
}
