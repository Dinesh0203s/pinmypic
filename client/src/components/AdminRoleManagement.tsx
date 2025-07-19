import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/types';
import { Shield, UserPlus, Edit, Trash2, Crown, Search } from 'lucide-react';
import { getAdminPermissions, hasPermission } from '@/utils/adminUtils';

interface AdminRoleManagementProps {
  currentUser: User | null;
  refreshTrigger?: number;
}

const AdminRoleManagement: React.FC<AdminRoleManagementProps> = ({ currentUser, refreshTrigger }) => {
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [regularUsers, setRegularUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('admin');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);

  const { currentUser: firebaseUser } = useAuth();
  const { toast } = useToast();

  const allPermissions = [
    { value: 'events', label: 'Manage Events', description: 'Create, edit, and delete events' },
    { value: 'bookings', label: 'Manage Bookings', description: 'View and manage all bookings' },
    { value: 'packages', label: 'Manage Packages', description: 'Create and edit service packages' },
    { value: 'photos', label: 'Manage Photos', description: 'Upload and manage event photos' },
    { value: 'contacts', label: 'Manage Messages', description: 'View and respond to contact messages' },
    { value: 'users', label: 'View Users', description: 'View user information' },
    { value: 'users_manage', label: 'Manage Users', description: 'Promote/demote users and manage roles' }
  ];

  const isOwner = currentUser?.adminRole === 'owner';
  const canManageUsers = hasPermission(currentUser, 'users_manage');

  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh users when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('Refreshing users data due to external trigger...');
      fetchUsers();
    }
  }, [refreshTrigger]);

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
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [adminRes, usersRes] = await Promise.all([
        fetch('/api/admin/users/admins', { headers }),
        fetch('/api/admin/users', { headers })
      ]);

      if (adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminUsers(adminData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setRegularUsers(usersData.filter((user: User) => !user.isAdmin));
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

  const handlePromoteUser = async (userId: string, role: 'admin' | 'moderator', permissions: string[]) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          isAdmin: true,
          adminRole: role,
          adminPermissions: permissions
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `User promoted to ${role} successfully`,
        });
        fetchUsers();
        setPromoteDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error('Failed to promote user');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to promote user",
      });
    }
  };

  const handleDemoteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove admin privileges from this user?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users/${userId}/demote`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          isAdmin: false,
          adminRole: null,
          adminPermissions: []
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User demoted successfully",
        });
        fetchUsers();
      } else {
        throw new Error('Failed to demote user');
      }
    } catch (error) {
      console.error('Error demoting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to demote user",
      });
    }
  };

  const handleEditPermissions = async (userId: string, permissions: string[]) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ adminPermissions: permissions }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Permissions updated successfully",
        });
        fetchUsers();
        setEditDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update permissions",
      });
    }
  };

  const filteredRegularUsers = regularUsers.filter(user =>
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAdminUsers = adminUsers.filter(user =>
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">You don't have permission to manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Admin Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Admin Users
              </CardTitle>
              <CardDescription>Users with administrative privileges</CardDescription>
            </div>
            <Badge variant="secondary">{adminUsers.length} admins</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdminUsers.map((user, index) => (
                <TableRow key={`admin-${user.id || user.firebaseUid}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={user.photoURL || user.customPhotoURL}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.adminRole === 'owner' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                      user.adminRole === 'admin' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      'bg-green-50 border-green-200 text-green-700'
                    }>
                      {user.adminRole === 'owner' && '👑 Owner'}
                      {user.adminRole === 'admin' && '🛡️ Admin'}
                      {user.adminRole === 'moderator' && '⚡ Moderator'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(user.adminPermissions || getAdminPermissions(user.adminRole)).slice(0, 3).map((permission, permIndex) => (
                        <Badge key={`${user.id || user.firebaseUid}-${permission}-${permIndex}`} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {(user.adminPermissions || getAdminPermissions(user.adminRole)).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(user.adminPermissions || getAdminPermissions(user.adminRole)).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.adminRole !== 'owner' && isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setCustomPermissions(user.adminPermissions || getAdminPermissions(user.adminRole));
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDemoteUser(user.id || user.firebaseUid)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {user.adminRole === 'owner' && (
                        <Crown className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Regular Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Regular Users</CardTitle>
              <CardDescription>Users without administrative privileges</CardDescription>
            </div>
            <Badge variant="secondary">{regularUsers.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegularUsers.map((user, index) => (
                <TableRow key={`regular-${user.id || user.firebaseUid}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={user.photoURL || user.customPhotoURL}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive !== false ? "default" : "secondary"}>
                      {user.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedRole('admin');
                        setCustomPermissions(getAdminPermissions('admin'));
                        setPromoteDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Promote
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Promote User Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Promote User to Admin</DialogTitle>
            <DialogDescription>
              Grant administrative privileges to {selectedUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Select Admin Role</Label>
              <Select value={selectedRole} onValueChange={(value: 'admin' | 'moderator') => {
                setSelectedRole(value);
                setCustomPermissions(getAdminPermissions(value));
              }}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🛡️ Administrator - Full access except user management</SelectItem>
                  <SelectItem value="moderator">⚡ Moderator - Limited access to core functions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-medium mb-4 block">Customize Permissions</Label>
              <div className="grid grid-cols-1 gap-3">
                {allPermissions.map((permission) => (
                  <div key={permission.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={permission.value}
                      checked={customPermissions.includes(permission.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCustomPermissions([...customPermissions, permission.value]);
                        } else {
                          setCustomPermissions(customPermissions.filter(p => p !== permission.value));
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={permission.value} className="text-sm font-medium">
                        {permission.label}
                      </Label>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handlePromoteUser(selectedUser!.id || selectedUser!.firebaseUid, selectedRole, customPermissions)}>
                Promote User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
            <DialogDescription>
              Modify permissions for {selectedUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">User Permissions</Label>
              <div className="grid grid-cols-1 gap-3">
                {allPermissions.map((permission) => (
                  <div key={permission.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={`edit-${permission.value}`}
                      checked={customPermissions.includes(permission.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCustomPermissions([...customPermissions, permission.value]);
                        } else {
                          setCustomPermissions(customPermissions.filter(p => p !== permission.value));
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={`edit-${permission.value}`} className="text-sm font-medium">
                        {permission.label}
                      </Label>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleEditPermissions(selectedUser!.id || selectedUser!.firebaseUid, customPermissions)}>
                Update Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoleManagement;