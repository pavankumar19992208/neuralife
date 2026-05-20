import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, UserPlus, Shield, Clock, Mail, Phone, MoreVertical, UserX, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { listItem, staggerChildren } from '@/lib/animations';
import {
  useSchoolAdminUsers,
  useInviteSchoolAdminUser,
  useDeactivateSchoolAdminUser
} from '@/hooks/useSettings';
import type { SchoolAdminUser } from '@/types/common';

export function UserManagementTab() {
  const { data: adminUsers, isLoading } = useSchoolAdminUsers();
  const { mutate: inviteUser } = useInviteSchoolAdminUser();
  const { mutate: deactivateUser } = useDeactivateSchoolAdminUser();

  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleInviteUser = (userData: any) => {
    inviteUser(userData, {
      onSuccess: () => {
        setShowInviteModal(false);
      },
    });
  };

  const handleDeactivateUser = (userId: string) => {
    deactivateUser(userId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const activeUsers = adminUsers?.filter(user => user.is_active) || [];
  const invitedUsers = activeUsers.filter(user => !user.first_login_at);
  const activeLoggedInUsers = activeUsers.filter(user => user.first_login_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">User Management</h2>
          <p className="text-sm text-text-secondary">Invite and manage admin users and teachers</p>
        </div>
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Invite User</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Admin User</DialogTitle>
            </DialogHeader>
            <InviteUserForm onSubmit={handleInviteUser} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Total Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-text-primary">{activeUsers.length}</span>
              <Shield className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-warning">{invitedUsers.length}</span>
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-success">{activeLoggedInUsers.length}</span>
              <UserPlus className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Admin Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers.length > 0 ? (
            <motion.div
              variants={staggerChildren}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {activeUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onDeactivate={handleDeactivateUser}
                />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary mb-4">No admin users added yet</p>
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(true)}
              >
                Invite First User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-1">PRINCIPAL</Badge>
              <div>
                <p className="font-medium">Principal (You)</p>
                <p className="text-sm text-text-secondary">
                  Full access to all modules including analytics, salary management, and settings configuration.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-1">SCHOOL_ADMIN</Badge>
              <div>
                <p className="font-medium">School Admin</p>
                <p className="text-sm text-text-secondary">
                  Access to student management, attendance, fees, fleet management, and basic analytics. Cannot access salary or advanced settings.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-1">VICE_PRINCIPAL</Badge>
              <div>
                <p className="font-medium">Vice Principal</p>
                <p className="text-sm text-text-secondary">
                  Same as School Admin but with additional access to teacher management and advanced analytics.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// User Card Component
function UserCard({
  user,
  onDeactivate
}: {
  user: SchoolAdminUser;
  onDeactivate: (userId: string) => void;
}) {
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const getStatusBadge = () => {
    if (!user.first_login_at) {
      return (
        <Badge variant="outline" className="text-warning border-warning/50">
          Invitation Pending
        </Badge>
      );
    }

    const lastLoginDays = user.last_login_at
      ? Math.floor((new Date().getTime() - new Date(user.last_login_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (lastLoginDays === null || lastLoginDays > 30) {
      return (
        <Badge variant="outline" className="text-text-muted">
          Inactive
        </Badge>
      );
    }

    if (lastLoginDays <= 7) {
      return (
        <Badge variant="outline" className="text-success border-success/50">
          Active
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-warning border-warning/50">
        Last seen {lastLoginDays}d ago
      </Badge>
    );
  };

  const getRoleBadge = () => {
    if (user.role === 'VICE_PRINCIPAL') {
      return (
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          Vice Principal
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        School Admin
      </Badge>
    );
  };

  return (
    <motion.div
      variants={listItem}
      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-surface-raised transition-colors"
    >
      <div className="flex items-center space-x-4">
        <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-medium">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h4 className="font-medium">{user.name}</h4>
            {getRoleBadge()}
          </div>
          <div className="flex items-center space-x-4 text-sm text-text-secondary">
            <div className="flex items-center space-x-1">
              <Phone className="h-3 w-3" />
              <span>{user.mobile}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Invited {new Date(user.invited_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {getStatusBadge()}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {!user.first_login_at && (
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Resend Invitation
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-danger"
              onClick={() => setShowDeactivateDialog(true)}
            >
              <UserX className="h-4 w-4 mr-2" />
              Deactivate User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate {user.name}? They will lose access to the system immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDeactivate(user.id);
                  setShowDeactivateDialog(false);
                }}
                className="bg-danger hover:bg-danger/90"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}

// Invite User Form Component
function InviteUserForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    role: 'SCHOOL_ADMIN' as 'SCHOOL_ADMIN' | 'VICE_PRINCIPAL',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isValid = formData.name.trim() && formData.mobile.trim() && formData.role;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="user-name">Full Name *</Label>
        <Input
          id="user-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Vice Principal Name"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="user-mobile">Mobile Number *</Label>
        <Input
          id="user-mobile"
          type="tel"
          value={formData.mobile}
          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          placeholder="e.g., 9876543210"
          className="mt-1"
          required
        />
        <p className="text-xs text-text-muted mt-1">
          They will receive an OTP to login with this number
        </p>
      </div>

      <div>
        <Label htmlFor="user-role">Role *</Label>
        <Select
          value={formData.role}
          onValueChange={(value: 'SCHOOL_ADMIN' | 'VICE_PRINCIPAL') =>
            setFormData({ ...formData, role: value })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SCHOOL_ADMIN">School Admin</SelectItem>
            <SelectItem value="VICE_PRINCIPAL">Vice Principal</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-text-muted mt-1">
          {formData.role === 'VICE_PRINCIPAL'
            ? 'Full admin access including teacher management'
            : 'Standard admin access for day-to-day operations'
          }
        </p>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-3">
        <p className="text-sm text-text-secondary">
          The user will receive an SMS with login instructions after being invited.
        </p>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormData({ name: '', mobile: '', role: 'SCHOOL_ADMIN' })}
        >
          Reset
        </Button>
        <Button type="submit" disabled={!isValid}>
          Send Invitation
        </Button>
      </div>
    </form>
  );
}