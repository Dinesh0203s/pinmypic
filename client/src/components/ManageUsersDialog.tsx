import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Edit, Trash2, Shield, ShieldCheck, Mail, Phone, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserType } from '@shared/types';

interface ManageUsersDialogProps {
  onUserUpdated: () => void;
}

export function ManageUsersDialog({ onUserUpdated }: ManageUsersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Helper function to get authentication headers
  const getAuthHeaders = async () => {
    if (!currentUser) return {};
    try {
      const token = await currentUser.getIdToken();
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
      const response = await fetch('/api/users', { headers });
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData || []);
      } else {
        console.error('Failed to fetch users:', response.status);
        toast({
          title: "Error fetching users",
          description: "Failed to load user data. Please check your permissions.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error fetching users",
        description: "Failed to load user data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const filteredUsers = users.filter(user =>
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleAdmin = async (user: UserType) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          isAdmin: !user.isAdmin
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast({
        title: "User updated",
        description: `${user.displayName || user.email} ${user.isAdmin ? 'removed from' : 'granted'} admin access.`,
      });

      fetchUsers();
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error updating user",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (user: UserType) => {
    if (!confirm(`Are you sure you want to delete ${user.displayName || user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast({
        title: "User deleted",
        description: `${user.displayName || user.email} has been removed from the system.`,
      });

      fetchUsers();
      onUserUpdated();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error deleting user",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100">
            <Users className="h-4 w-4 mr-2" />
            Manage User Accounts
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage User Accounts
            </DialogTitle>
            <DialogDescription>
              View and manage all registered users in the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-2">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                {filteredUsers.length} users
              </Badge>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registered Users</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.customPhotoURL || user.photoURL} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                                  {getInitials(user.displayName || '', user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.displayName || 'No name'}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                              {user.isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                              {user.isAdmin ? 'Admin' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleAdmin(user)}
                                className={user.isAdmin ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                              >
                                {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditDialogOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={selectedUser.displayName || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, displayName: e.target.value})}
                  placeholder="User's display name"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  value={selectedUser.bio || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, bio: e.target.value})}
                  placeholder="User bio"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  try {
                    const headers = await getAuthHeaders();
                    const response = await fetch(`/api/users/${selectedUser.id}`, {
                      method: 'PATCH',
                      headers,
                      body: JSON.stringify({
                        displayName: selectedUser.displayName,
                        phone: selectedUser.phone,
                        bio: selectedUser.bio
                      }),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to update user');
                    }

                    toast({
                      title: "User updated",
                      description: "User information has been updated successfully.",
                    });

                    setEditDialogOpen(false);
                    fetchUsers();
                    onUserUpdated();
                  } catch (error) {
                    console.error('Error updating user:', error);
                    toast({
                      title: "Error updating user",
                      description: error.message || "Please try again.",
                      variant: "destructive"
                    });
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}