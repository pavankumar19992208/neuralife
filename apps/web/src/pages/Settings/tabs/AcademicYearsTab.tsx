import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, ArrowRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { listItem, staggerChildren } from '@/lib/animations';
import {
  useAcademicYears,
  useCurrentAcademicYear,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useStudentPromotions,
  useStudentsForRelease
} from '@/hooks/useSettings';

export function AcademicYearsTab() {
  const { data: academicYears, isLoading } = useAcademicYears();
  const { data: currentYear } = useCurrentAcademicYear();
  const { mutate: createYear } = useCreateAcademicYear();
  const { mutate: setCurrent } = useSetCurrentAcademicYear();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  const handleCreateYear = (yearData: any) => {
    createYear(yearData, {
      onSuccess: () => {
        setShowCreateModal(false);
      },
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Academic Years</h2>
          <p className="text-sm text-text-secondary">Manage academic years and student promotions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={showPromotionModal} onOpenChange={setShowPromotionModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Student Promotions</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Student Promotions</DialogTitle>
              </DialogHeader>
              <StudentPromotionsPanel />
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Academic Year</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Academic Year</DialogTitle>
              </DialogHeader>
              <CreateAcademicYearForm onSubmit={handleCreateYear} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Academic Year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Current Academic Year</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentYear ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{currentYear.year_label}</h3>
                    <p className="text-sm text-text-secondary">
                      {new Date(currentYear.start_date).toLocaleDateString()} - {new Date(currentYear.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Current
                  </Badge>
                </div>

                <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                  <p className="text-sm text-text-secondary">
                    All new student enrollments and academic activities will be associated with this academic year.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No current academic year set</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Year Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Total Academic Years</span>
                <span className="font-semibold">{academicYears?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Years Completed</span>
                <span className="font-semibold">
                  {academicYears?.filter(year => new Date(year.end_date) < new Date()).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Upcoming Years</span>
                <span className="font-semibold">
                  {academicYears?.filter(year => new Date(year.start_date) > new Date()).length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Academic Years List */}
      <Card>
        <CardHeader>
          <CardTitle>All Academic Years</CardTitle>
        </CardHeader>
        <CardContent>
          {academicYears && academicYears.length > 0 ? (
            <motion.div
              variants={staggerChildren}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {academicYears.map((year) => (
                <motion.div
                  key={year.id}
                  variants={listItem}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium">{year.year_label}</h4>
                      <p className="text-sm text-text-secondary">
                        {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {year.is_current ? (
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                        Current
                      </Badge>
                    ) : new Date(year.end_date) < new Date() ? (
                      <Badge variant="outline" className="text-text-muted">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning">
                        Future
                      </Badge>
                    )}

                    {!year.is_current && new Date(year.start_date) <= new Date() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrent(year.id)}
                        className="text-primary hover:text-primary"
                      >
                        Set as Current
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">No academic years configured yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Academic Year
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Create Academic Year Form Component
function CreateAcademicYearForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    year_label: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isValid = formData.year_label && formData.start_date && formData.end_date;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="year-label">Academic Year Label *</Label>
        <Input
          id="year-label"
          value={formData.year_label}
          onChange={(e) => setFormData({ ...formData, year_label: e.target.value })}
          placeholder="e.g., 2025-26"
          className="mt-1"
        />
        <p className="text-xs text-text-muted mt-1">Format: YYYY-YY</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-date">Start Date *</Label>
          <Input
            id="start-date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="end-date">End Date *</Label>
          <Input
            id="end-date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is-current"
          checked={formData.is_current}
          onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
        />
        <Label htmlFor="is-current" className="text-sm">
          Set as current academic year
        </Label>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={() => setFormData({
          year_label: '', start_date: '', end_date: '', is_current: false
        })}>
          Reset
        </Button>
        <Button type="submit" disabled={!isValid}>
          Create Academic Year
        </Button>
      </div>
    </form>
  );
}

// Student Promotions Panel Component
function StudentPromotionsPanel() {
  const { data: academicYears } = useAcademicYears();
  const { data: currentYear } = useCurrentAcademicYear();

  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | undefined>();

  const { data: studentsForRelease } = useStudentsForRelease(
    fromYearId,
    selectedClass,
    { enabled: !!fromYearId }
  );

  return (
    <div className="space-y-6">
      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-info mt-0.5" />
          <div>
            <h4 className="font-medium text-text-primary">Student Promotions</h4>
            <p className="text-sm text-text-secondary mt-1">
              Promote students from one academic year to the next, repeat students in the same class, or release students who are graduating or leaving the school.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="from-year">From Academic Year</Label>
          <Select value={fromYearId} onValueChange={setFromYearId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears?.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.year_label} {year.is_current && '(Current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="to-year">To Academic Year</Label>
          <Select value={toYearId} onValueChange={setToYearId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select target year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears?.filter(year => year.id !== fromYearId).map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.year_label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="class-filter">Filter by Class (Optional)</Label>
        <Select value={selectedClass?.toString() || ''} onValueChange={(value) => setSelectedClass(value ? parseInt(value) : undefined)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {[6, 7, 8, 9, 10, 11, 12].map((classYear) => (
              <SelectItem key={classYear} value={classYear.toString()}>
                Class {classYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {studentsForRelease && studentsForRelease.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students Available for Promotion</CardTitle>
            <p className="text-sm text-text-secondary">
              {studentsForRelease.length} students found
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {studentsForRelease.slice(0, 5).map((student) => (
                <div key={student.neura_id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-sm text-text-secondary">
                      Class {student.class_year}-{student.section} • {student.neura_id}
                    </p>
                  </div>
                  <Badge variant="outline">{student.status}</Badge>
                </div>
              ))}
              {studentsForRelease.length > 5 && (
                <p className="text-sm text-text-secondary text-center pt-2">
                  ... and {studentsForRelease.length - 5} more students
                </p>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Promotions will be processed for selected students
              </p>
              <Button disabled={!fromYearId || !toYearId}>
                Configure Promotions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {fromYearId && toYearId && (!studentsForRelease || studentsForRelease.length === 0) && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">No students found for the selected criteria</p>
        </div>
      )}
    </div>
  );
}