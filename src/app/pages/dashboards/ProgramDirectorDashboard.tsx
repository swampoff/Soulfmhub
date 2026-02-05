import React from 'react';
import { SuperAdminDashboard } from './SuperAdminDashboard';

// Program Director has same capabilities as Super Admin
export function ProgramDirectorDashboard() {
  return <SuperAdminDashboard />;
}
