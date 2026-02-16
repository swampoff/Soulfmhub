import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Users, Search, Shield, Edit, Trash2, UserPlus, Filter } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';

export function UsersManagement() {
  const { user } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const roles = [
    { value: 'listener', label: 'Listener', color: 'text-gray-400' },
    { value: 'super_admin', label: 'Admin', color: 'text-[#FF8C42]' },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAllUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      toast.success('User role updated successfully');
      loadUsers();
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.deleteUser(userId);
      toast.success('User deleted');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const getRoleColor = (role: string) => {
    return roles.find(r => r.value === role)?.color || 'text-gray-400';
  };

  const getRoleLabel = (role: string) => {
    return roles.find(r => r.value === role)?.label || role;
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleStats = () => {
    return roles.map(role => ({
      ...role,
      count: users.filter(u => u.role === role.value).length
    }));
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-[#00d9ff]" />
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Users Management
            </h2>
            <p className="text-white/70 text-sm">{users.length} total users</p>
          </div>
        </div>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {getRoleStats().map((stat) => (
          <Card
            key={stat.value}
            className="bg-[#0a1628]/50 border-white/5 p-4 text-center hover:border-[#00d9ff]/30 transition-colors cursor-pointer"
            onClick={() => setFilterRole(stat.value)}
          >
            <p className="text-2xl font-bold text-white">{stat.count}</p>
            <p className={`text-xs ${stat.color} truncate`}>{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0a1628] border-[#00d9ff]/30 text-white pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterRole !== 'all' && (
              <Button
                onClick={() => setFilterRole('all')}
                variant="outline"
                className="border-[#00d9ff]/30"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-white/50">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No users found</p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-[#0a1628]/50 rounded-lg border border-white/5 hover:border-[#00d9ff]/30 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-full flex items-center justify-center">
                  <span className="text-[#0a1628] font-bold text-lg">
                    {u.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{u.name || 'Unknown'}</h3>
                  <p className="text-sm text-white/70 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`border-[#00d9ff]/30 ${getRoleColor(u.role)} text-xs`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(u.role)}
                    </Badge>
                    {u.id === user?.id && (
                      <Badge variant="outline" className="border-[#00ffaa]/30 text-[#00ffaa] text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Dialog open={isEditDialogOpen && selectedUser?.id === u.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setSelectedUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUser(u)}
                        className="text-[#00ffaa] hover:bg-[#00ffaa]/10"
                        disabled={u.id === user?.id}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                          Edit User Role
                        </DialogTitle>
                      </DialogHeader>
                      {selectedUser && (
                        <div className="space-y-4 mt-4">
                          <div>
                            <p className="text-white/70 text-sm mb-2">User</p>
                            <p className="text-white font-semibold">{selectedUser.name}</p>
                            <p className="text-white/50 text-sm">{selectedUser.email}</p>
                          </div>
                          <div>
                            <p className="text-white/70 text-sm mb-2">Current Role</p>
                            <Badge variant="outline" className={`${getRoleColor(selectedUser.role)}`}>
                              {getRoleLabel(selectedUser.role)}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-white/70 text-sm mb-2">New Role</p>
                            <Select
                              defaultValue={selectedUser.role}
                              onValueChange={(newRole) => handleUpdateUserRole(selectedUser.id, newRole)}
                            >
                              <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                                {roles.map(role => (
                                  <SelectItem key={role.value} value={role.value}>
                                    <span className={role.color}>{role.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteUser(u.id)}
                    className="text-[#FF8C42] hover:bg-[#FF8C42]/10"
                    disabled={u.id === user?.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
    </AdminLayout>
  );
}