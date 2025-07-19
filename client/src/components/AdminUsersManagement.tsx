import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, UserCheck, UserX, Edit3, Trash2, Plus, Mail, Calendar, Activity, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@shared/types';

interface AdminUsersManagementProps {
  currentUser: User;
}

export function AdminUsersManagement({ currentUser }: AdminUsersManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currentUser: firebaseUser, refreshUserData } = useAuth();

  const isOwner = currentUser.adminRole === 'owner';
  const isAdmin = currentUser.isAdmin && (currentUser.adminRole === 'owner' || currentUser.adminRole === 'admin');

  useEffect(() => {
    fetchUsers();
    fetchAdminUsers();
  }, []);

  const getAuthHeaders = async () => {
    if (!firebaseUser) return {};
    try {
      const token = await firebaseUser.getIdToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  };

  const fetchUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/users', { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users:', response.status);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users. Please check your permissions.",
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/users/admins', { headers });
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      } else {
        console.error('Failed to fetch admin users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };

  const handlePromoteUser = async (userId: string, adminRole: 'admin' | 'moderator') => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ 
          isAdmin: true, 
          adminRole,
          adminPermissions: getDefaultPermissions(adminRole)
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `User promoted to ${adminRole} successfully`,
        });
        fetchUsers();
        fetchAdminUsers();
        setPromoteDialogOpen(false);
        
        // Always refresh user data to update authentication context
        await refreshUserData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to promote user');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to promote user",
      });
    }
  };

  const handleDemoteUser = async (userId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ 
          isAdmin: false, 
          adminRole: undefined,
          adminPermissions: []
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User demoted successfully",
        });
        fetchUsers();
        fetchAdminUsers();
        
        // Always refresh user data to update authentication context
        await refreshUserData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to demote user');
      }
    } catch (error) {
      console.error('Error demoting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to demote user",
      });
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deactivated successfully",
        });
        fetchUsers();
        fetchAdminUsers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to deactivate user",
      });
    }
  };

  const getDefaultPermissions = (role: 'admin' | 'moderator'): string[] => {
    if (role === 'admin') {
      return ['events', 'bookings', 'packages', 'photos', 'contacts', 'users_view'];
    } else if (role === 'moderator') {
      return ['events', 'bookings', 'photos', 'contacts'];
    }
    return [];
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500';
      case 'admin': return 'bg-blue-500';
      case 'moderator': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAdminUsers = adminUsers.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts and admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Tabs defaultValue="all-users" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all-users">All Users ({users.length})</TabsTrigger>
              <TabsTrigger value="admin-users">Admin Users ({adminUsers.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-users" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      {isOwner && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">
                              {user.displayName?.[0] || user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div>{user.displayName || 'No Name'}</div>
                              <div className="text-xs text-gray-500">{user.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <Badge className={getRoleBadgeColor(user.adminRole)}>
                              <Shield className="w-3 h-3 mr-1" />
                              {user.adminRole || 'admin'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.isActive !== false ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Activity className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <UserX className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        {isOwner && (
                          <TableCell>
                            <div className="flex gap-2">
                              {/* Show owner badge for owner account */}
                              {user.email === 'dond2674@gmail.com' ? (
                                <Badge className="bg-purple-500 text-white">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Owner (Protected)
                                </Badge>
                              ) : (
                                <>
                                  {!user.isAdmin && user.email !== currentUser.email && (
                                    <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedUser(user)}
                                        >
                                          <UserCheck className="w-4 h-4 mr-1" />
                                          Promote
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Promote User</DialogTitle>
                                          <DialogDescription>
                                            Select the admin role for {selectedUser?.email}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <Button
                                              onClick={() => selectedUser && handlePromoteUser(selectedUser.id, 'admin')}
                                              className="flex flex-col items-center gap-2 h-20"
                                            >
                                              <Shield className="w-6 h-6" />
                                              <span>Admin</span>
                                            </Button>
                                            <Button
                                              variant="outline"
                                              onClick={() => selectedUser && handlePromoteUser(selectedUser.id, 'moderator')}
                                              className="flex flex-col items-center gap-2 h-20"
                                            >
                                              <UserCheck className="w-6 h-6" />
                                              <span>Moderator</span>
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                  {user.isAdmin && user.adminRole !== 'owner' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDemoteUser(user.id)}
                                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Demote
                                    </Button>
                                  )}
                                  {user.isActive !== false && user.email !== currentUser.email && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeactivateUser(user.id)}
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Deactivate
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="admin-users" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Since</TableHead>
                      {isOwner && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">
                              {user.displayName?.[0] || user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div>{user.displayName || 'No Name'}</div>
                              <div className="text-xs text-gray-500">{user.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.adminRole)}>
                            <Shield className="w-3 h-3 mr-1" />
                            {user.adminRole || 'admin'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.adminPermissions?.map((permission) => (
                              <Badge key={permission} variant="secondary" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        {isOwner && (
                          <TableCell>
                            <div className="flex gap-2">
                              {user.adminRole !== 'owner' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDemoteUser(user.id)}
                                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Demote
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}