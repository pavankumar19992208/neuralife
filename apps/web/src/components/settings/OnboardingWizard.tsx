import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, ArrowLeft, ArrowRight, Upload, X, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { slideUp, fadeIn, staggerChildren, listItem } from '@/lib/animations';
import {
  useOnboardingProgress,
  useUpdateOnboardingStep,
  useCompleteOnboarding,
  useSchoolProfile,
  useUpdateSchoolProfile,
  useUploadSchoolLogo,
  useCreateAcademicYear,
  useCreateFeeCategory,
  useCreateFeeHead,
  useInviteSchoolAdminUser,
} from '@/hooks/useSettings';

interface OnboardingWizardProps {
  onComplete: () => void;
}

interface StepProps {
  onNext: () => void;
  onPrev: () => void;
  stepNumber: number;
  isFirst: boolean;
  isLast: boolean;
}

const ONBOARDING_STEPS = [
  { number: 1, name: 'School Identity', description: 'Basic information and branding' },
  { number: 2, name: 'Academic Year Setup', description: 'Configure your academic calendar' },
  { number: 3, name: 'Classes & Sections', description: 'Define your school structure' },
  { number: 4, name: 'Add Admin & Teachers', description: 'Invite your staff members' },
  { number: 5, name: 'Fee Structure', description: 'Set up fee categories and amounts' },
  { number: 6, name: 'Enroll Students', description: 'Add your first students' },
  { number: 7, name: 'Assign SmartPads', description: 'Connect devices to students' },
  { number: 8, name: 'Go Live Check', description: 'Final verification and launch' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const { data: progress } = useOnboardingProgress();
  const { mutate: updateStep } = useUpdateOnboardingStep();
  const { mutate: completeOnboarding } = useCompleteOnboarding();

  const completedSteps = progress?.filter(p => p.is_completed).map(p => p.step_number) || [];

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      completeOnboarding(undefined, {
        onSuccess: () => {
          onComplete();
        },
      });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (stepNumber: number, data?: Record<string, any>) => {
    updateStep({
      stepNumber,
      isCompleted: true,
      data,
    });
  };

  const renderStep = () => {
    const stepProps: StepProps = {
      onNext: handleNext,
      onPrev: handlePrev,
      stepNumber: currentStep,
      isFirst: currentStep === 1,
      isLast: currentStep === 8,
    };

    switch (currentStep) {
      case 1:
        return <Step1SchoolIdentity {...stepProps} onStepComplete={handleStepComplete} />;
      case 2:
        return <Step2AcademicYear {...stepProps} onStepComplete={handleStepComplete} />;
      case 3:
        return <Step3ClassesSection {...stepProps} onStepComplete={handleStepComplete} />;
      case 4:
        return <Step4AdminTeachers {...stepProps} onStepComplete={handleStepComplete} />;
      case 5:
        return <Step5FeeStructure {...stepProps} onStepComplete={handleStepComplete} />;
      case 6:
        return <Step6EnrollStudents {...stepProps} onStepComplete={handleStepComplete} />;
      case 7:
        return <Step7AssignSmartPads {...stepProps} onStepComplete={handleStepComplete} />;
      case 8:
        return <Step8GoLive {...stepProps} onStepComplete={handleStepComplete} />;
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / 8) * 100;

  return (
    <div className="h-full flex flex-col">
      {/* Progress Header */}
      <div className="bg-surface border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">School Setup Wizard</h1>
              <p className="text-text-secondary">Complete these steps to get your school ready for NeuraLife</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-text-secondary">Step {currentStep} of 8</div>
              <div className="text-xs text-text-muted">{Math.round(progressPercentage)}% complete</div>
            </div>
          </div>

          <Progress value={progressPercentage} className="h-2 mb-4" />

          {/* Step Navigation */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap",
                  currentStep === step.number
                    ? "bg-primary text-white"
                    : completedSteps.includes(step.number)
                    ? "bg-success text-white"
                    : "bg-surface-raised text-text-secondary"
                )}
              >
                {completedSteps.includes(step.number) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span className="font-medium">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={slideUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Step 1: School Identity
function Step1SchoolIdentity({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const { data: profile } = useSchoolProfile();
  const { mutate: updateProfile } = useUpdateSchoolProfile();
  const { mutate: uploadLogo } = useUploadSchoolLogo();

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    tagline: profile?.tagline || '',
    website: profile?.website || '',
    affiliation_number: profile?.affiliation_number || '',
    accent_color: profile?.accent_color || '#1E40AF',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile?.logo_url || null);

  const handleLogoSelect = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const submitProfile = () => {
      updateProfile(formData, {
        onSuccess: () => {
          onStepComplete(stepNumber, formData);
          onNext();
        },
      });
    };

    if (logoFile) {
      uploadLogo(logoFile, {
        onSuccess: () => {
          submitProfile();
        },
      });
    } else {
      submitProfile();
    }
  };

  const isValid = formData.name.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
          <span>School Identity</span>
        </CardTitle>
        <p className="text-text-secondary">Tell us about your school and set up your branding</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div>
          <Label>School Logo</Label>
          <div className="mt-2 flex items-center space-x-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="School logo"
                  className="w-16 h-16 rounded-lg object-cover border"
                />
                <button
                  onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                  className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-text-muted" />
              </div>
            )}

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleLogoSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="logo-upload"
              />
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 bg-surface-raised hover:bg-border rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Logo</span>
              </Label>
              <p className="text-xs text-text-muted mt-1">PNG, JPG up to 2MB. Recommended: 150×150px</p>
            </div>
          </div>
        </div>

        {/* School Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="school-name">School Name *</Label>
            <Input
              id="school-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Vikas High School"
              className="mt-1"
            />
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
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="tagline">School Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="e.g., Excellence in Education"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="e.g., https://yourschool.edu.in"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="accent-color">Brand Color</Label>
            <div className="mt-1 flex items-center space-x-2">
              <Input
                id="accent-color"
                type="color"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="w-20 h-10 p-1 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-text-secondary">{formData.accent_color}</span>
            </div>
            <p className="text-xs text-text-muted mt-1">This color will be used across the NeuraLife interface</p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-surface-raised rounded-lg p-4">
          <Label className="text-sm font-medium text-text-secondary">Preview</Label>
          <div className="mt-2 flex items-center space-x-3">
            {logoPreview && (
              <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div>
              <div className="font-semibold text-text-primary">{formData.name || 'Your School Name'}</div>
              {formData.tagline && (
                <div className="text-sm" style={{ color: formData.accent_color }}>
                  {formData.tagline}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 2: Academic Year Setup
function Step2AcademicYear({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const { mutate: createAcademicYear } = useCreateAcademicYear();

  const [formData, setFormData] = useState({
    year_label: '2024-25',
    start_date: '2024-06-01',
    end_date: '2025-04-30',
    is_current: true,
  });

  const handleSubmit = () => {
    createAcademicYear(formData, {
      onSuccess: () => {
        onStepComplete(stepNumber, formData);
        onNext();
      },
    });
  };

  const isValid = formData.year_label && formData.start_date && formData.end_date;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
          <span>Academic Year Setup</span>
        </CardTitle>
        <p className="text-text-secondary">Configure your academic calendar for the current year</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="year-label">Academic Year *</Label>
            <Input
              id="year-label"
              value={formData.year_label}
              onChange={(e) => setFormData({ ...formData, year_label: e.target.value })}
              placeholder="e.g., 2024-25"
              className="mt-1"
            />
            <p className="text-xs text-text-muted mt-1">Format: YYYY-YY</p>
          </div>

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

        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-info text-white rounded-full p-1">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium text-text-primary">Current Academic Year</h4>
              <p className="text-sm text-text-secondary mt-1">
                This will be marked as your current academic year. All student enrollments and academic activities will be associated with this year.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 3: Classes & Sections (Placeholder - will be connected to existing student management)
function Step3ClassesSection({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const [classes, setClasses] = useState([
    { class_year: 6, sections: ['A'] },
    { class_year: 7, sections: ['A'] },
    { class_year: 8, sections: ['A'] },
    { class_year: 9, sections: ['A'] },
    { class_year: 10, sections: ['A', 'B'] },
  ]);

  const handleSubmit = () => {
    onStepComplete(stepNumber, { classes });
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
          <span>Classes & Sections</span>
        </CardTitle>
        <p className="text-text-secondary">Define the structure of your school</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <h4 className="font-medium text-text-primary">Note</h4>
              <p className="text-sm text-text-secondary mt-1">
                This step will be configured based on your current student enrollments. For now, we'll set up a basic structure that you can modify later in the Settings.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {classes.map((cls, index) => (
            <div key={cls.class_year} className="flex items-center justify-between p-4 bg-surface-raised rounded-lg">
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-sm">Class {cls.class_year}</Badge>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-text-secondary">Sections:</span>
                  {cls.sections.map(section => (
                    <Badge key={section} variant="secondary">{section}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleSubmit}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 4: Add Admin & Teachers
function Step4AdminTeachers({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const { mutate: inviteUser } = useInviteSchoolAdminUser();
  const [adminUser, setAdminUser] = useState({
    name: '',
    mobile: '',
    role: 'SCHOOL_ADMIN' as const,
  });

  const handleSubmit = () => {
    if (adminUser.name && adminUser.mobile) {
      inviteUser(adminUser, {
        onSuccess: () => {
          onStepComplete(stepNumber, { admin_invited: true });
          onNext();
        },
      });
    } else {
      // Skip for now
      onStepComplete(stepNumber, { admin_invited: false });
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</span>
          <span>Add Admin & Teachers</span>
        </CardTitle>
        <p className="text-text-secondary">Invite your first admin user to help manage the school</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-name">Admin Name</Label>
            <Input
              id="admin-name"
              value={adminUser.name}
              onChange={(e) => setAdminUser({ ...adminUser, name: e.target.value })}
              placeholder="e.g., Vice Principal Name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="admin-mobile">Mobile Number</Label>
            <Input
              id="admin-mobile"
              value={adminUser.mobile}
              onChange={(e) => setAdminUser({ ...adminUser, mobile: e.target.value })}
              placeholder="e.g., 9876543210"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="admin-role">Role</Label>
            <Select
              value={adminUser.role}
              onValueChange={(value: 'SCHOOL_ADMIN' | 'VICE_PRINCIPAL') =>
                setAdminUser({ ...adminUser, role: value })
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
          </div>
        </div>

        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <p className="text-sm text-text-secondary">
            You can add more teachers and admin users later from the Settings page. For now, adding one admin user will help you get started.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                onStepComplete(stepNumber, { admin_invited: false });
                onNext();
              }}
              className="text-text-muted"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!adminUser.name || !adminUser.mobile}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 5: Fee Structure
function Step5FeeStructure({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const { mutate: createCategory } = useCreateFeeCategory();
  const { mutate: createFeeHead } = useCreateFeeHead();

  const [step, setStep] = useState<'categories' | 'heads'>('categories');
  const [categoryId, setCategoryId] = useState<string>('');

  const handleCategoryCreated = (id: string) => {
    setCategoryId(id);
    setStep('heads');
  };

  const handleFeeHeadCreated = () => {
    onStepComplete(stepNumber, { fee_structure_setup: true });
    onNext();
  };

  if (step === 'categories') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">5</span>
            <span>Fee Structure - Categories</span>
          </CardTitle>
          <p className="text-text-secondary">Create your first fee category</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
            <p className="text-sm text-text-secondary">
              We'll create a basic "General" category to get you started. You can add more categories and customize the fee structure later in Settings.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={onPrev}
              disabled={isFirst}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            <Button
              onClick={() => {
                createCategory({
                  name: 'General',
                  description: 'Standard fee structure for all students',
                  is_active: true,
                }, {
                  onSuccess: (data) => {
                    handleCategoryCreated(data.id);
                  },
                });
              }}
              className="flex items-center space-x-2"
            >
              <span>Create Category & Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">5</span>
          <span>Fee Structure - Basic Setup Complete</span>
        </CardTitle>
        <p className="text-text-secondary">Your fee structure is ready</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5" />
            <div>
              <h4 className="font-medium text-text-primary">Fee Structure Created</h4>
              <p className="text-sm text-text-secondary mt-1">
                Basic fee category has been set up. You can add specific fee heads and amounts in the Settings page.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleFeeHeadCreated}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 6: Enroll Students (Placeholder)
function Step6EnrollStudents({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const handleSubmit = () => {
    onStepComplete(stepNumber, { student_enrollment_ready: true });
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">6</span>
          <span>Enroll Students</span>
        </CardTitle>
        <p className="text-text-secondary">Student enrollment system is ready</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <p className="text-sm text-text-secondary">
            Your school is ready for student enrollment. You can start admitting students from the Students page once the setup is complete.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleSubmit}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 7: Assign SmartPads (Placeholder)
function Step7AssignSmartPads({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const handleSubmit = () => {
    onStepComplete(stepNumber, { smartpad_system_ready: true });
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">7</span>
          <span>SmartPad Management</span>
        </CardTitle>
        <p className="text-text-secondary">Device management system is ready</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <p className="text-sm text-text-secondary">
            The SmartPad fleet management system is ready. You can register and assign devices to students from the SmartPads page.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleSubmit}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 8: Go Live Check
function Step8GoLive({
  onNext,
  onPrev,
  stepNumber,
  isFirst,
  isLast,
  onStepComplete
}: StepProps & { onStepComplete: (stepNumber: number, data?: Record<string, any>) => void }) {
  const { data: progress } = useOnboardingProgress();

  const completedSteps = progress?.filter(p => p.is_completed).length || 0;
  const allPreviousStepsComplete = completedSteps >= 7;

  const handleComplete = () => {
    onStepComplete(stepNumber, { go_live: true });
    onNext(); // This will trigger completion
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">8</span>
          <span>Go Live Check</span>
        </CardTitle>
        <p className="text-text-secondary">Final verification before launching your school on NeuraLife</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <h4 className="font-medium text-text-primary">Setup Complete!</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Your school is ready to go live on NeuraLife. All essential components have been configured.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-text-primary">What happens next:</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>You can start admitting students</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Teachers can begin marking attendance</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>SmartPad assignments can be managed</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Fee collection can be processed</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Analytics and reports will be available</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            onClick={handleComplete}
            disabled={!allPreviousStepsComplete}
            className="flex items-center space-x-2 bg-success hover:bg-success/90"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Complete Setup</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}