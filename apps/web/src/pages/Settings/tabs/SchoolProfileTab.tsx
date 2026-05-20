import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, MapPin, Phone, Mail, Globe, FileText } from 'lucide-react';
import { useSchoolProfile, useUpdateSchoolProfile } from '@/hooks/useSettings';

export function SchoolProfileTab() {
  const { data: profile, isLoading } = useSchoolProfile();
  const { mutate: updateProfile, isPending } = useUpdateSchoolProfile();

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    website: '',
    affiliation_number: '',
    full_address: '',
    phone: '',
    email: '',
  });

  // Update form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        tagline: profile.tagline || '',
        website: profile.website || '',
        affiliation_number: profile.affiliation_number || '',
        full_address: profile.full_address || '',
        phone: profile.phone || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  const hasChanges = profile && Object.entries(formData).some(
    ([key, value]) => (profile as any)[key] !== value
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">School Profile</h2>
          <p className="text-sm text-text-secondary">Manage your school's basic information and contact details</p>
        </div>
        {profile?.onboarding_completed && (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Profile Complete
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="school-name">School Name *</Label>
                <Input
                  id="school-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Vikas High School"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tagline">School Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g., Excellence in Education"
                  className="mt-1"
                />
                <p className="text-xs text-text-muted mt-1">A short motto or slogan for your school</p>
              </div>

              <div>
                <Label htmlFor="affiliation">Affiliation Number</Label>
                <Input
                  id="affiliation"
                  value={formData.affiliation_number}
                  onChange={(e) => setFormData({ ...formData, affiliation_number: e.target.value })}
                  placeholder="e.g., AP/GNT/2005/001"
                  className="mt-1"
                />
                <p className="text-xs text-text-muted mt-1">Government registration or board affiliation number</p>
              </div>

              <div>
                <Label htmlFor="website">School Website</Label>
                <div className="mt-1 relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourschool.edu.in"
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={formData.full_address}
                  onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                  placeholder="Complete address with landmark, city, district, and pin code"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="mt-1 relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="040-12345678"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Main contact number for the school</p>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@yourschool.edu.in"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Official email for communications</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex items-center justify-end space-x-4 p-4 bg-surface-raised border border-border rounded-lg">
            <p className="text-sm text-text-secondary">You have unsaved changes</p>
            <Button
              type="submit"
              disabled={isPending || !formData.name.trim()}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isPending ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}