import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings2,
  School,
  Calendar,
  CreditCard,
  Users,
  Bell,
  Palette,
  CalendarDays,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { slideUp, fadeIn } from '@/lib/animations';
import { useSchoolProfile, useVerifySettings } from '@/hooks/useSettings';
import { OnboardingWizard } from '@/components/settings/OnboardingWizard';

// Tab Components
import { SchoolProfileTab } from './tabs/SchoolProfileTab';
import { AcademicYearsTab } from './tabs/AcademicYearsTab';
import { FeeStructureTab } from './tabs/FeeStructureTab';
import { UserManagementTab } from './tabs/UserManagementTab';

// Placeholder components for remaining tabs
function NotificationSettingsTab() {
  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">Notification Settings</h3>
        <p className="text-text-secondary mb-4">Configure SMS, email, and push notification preferences</p>
        <div className="text-sm text-text-muted">Coming soon in next update</div>
      </div>
    </div>
  );
}

function BrandingTab() {
  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="text-center py-8">
        <Palette className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">Branding</h3>
        <p className="text-text-secondary mb-4">Customize school logo, colors, and appearance</p>
        <div className="text-sm text-text-muted">Coming soon in next update</div>
      </div>
    </div>
  );
}

function WorkingCalendarTab() {
  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="text-center py-8">
        <CalendarDays className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">Working Calendar</h3>
        <p className="text-text-secondary mb-4">Set working days and school holidays</p>
        <div className="text-sm text-text-muted">Coming soon in next update</div>
      </div>
    </div>
  );
}

const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'School Profile',
    icon: School,
    description: 'Basic school information and contact details'
  },
  {
    id: 'academic-years',
    label: 'Academic Years',
    icon: Calendar,
    description: 'Manage academic years and student promotions'
  },
  {
    id: 'fee-structure',
    label: 'Fee Structure',
    icon: CreditCard,
    description: 'Configure fee categories, heads, and amounts'
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    description: 'Invite and manage admin users and teachers'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure SMS, email, and push notification settings'
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
    description: 'Customize school logo, colors, and appearance'
  },
  {
    id: 'calendar',
    label: 'Working Calendar',
    icon: CalendarDays,
    description: 'Set working days and school holidays'
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: profile } = useSchoolProfile();
  const { data: verification } = useVerifySettings();

  // Check if onboarding is needed
  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  // Show onboarding wizard if needed
  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          window.location.reload(); // Refresh to update profile state
        }}
      />
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <SchoolProfileTab />;
      case 'academic-years':
        return <AcademicYearsTab />;
      case 'fee-structure':
        return <FeeStructureTab />;
      case 'users':
        return <UserManagementTab />;
      case 'notifications':
        return <NotificationSettingsTab />;
      case 'branding':
        return <BrandingTab />;
      case 'calendar':
        return <WorkingCalendarTab />;
      default:
        return <SchoolProfileTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-surface to-primary/5 border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div variants={slideUp} initial="initial" animate="animate">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-3 shadow-lg">
                  <Settings2 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
                  <p className="text-text-secondary mt-1">Manage your school configuration and preferences</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-surface rounded-lg border">
                    <School className="h-4 w-4 text-text-muted" />
                    <span className="text-sm font-medium text-text-primary">
                      {profile?.name || 'School'}
                    </span>
                  </div>
                  {profile?.onboarding_completed && (
                    <Badge className="bg-gradient-to-r from-success to-success/80 text-white border-0 shadow-sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Setup Complete
                    </Badge>
                  )}
                </div>

                {/* Verification Status - Moved to sidebar */}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 xl:grid-cols-4 gap-8"
        >
          {/* Sidebar Navigation */}
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <nav className="space-y-2">
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group ${
                        isActive
                          ? 'bg-primary text-white shadow-md'
                          : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                      }`}
                    >
                      <div className={`p-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-white/20'
                          : 'bg-surface-raised group-hover:bg-primary/10'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          isActive ? 'text-white' : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${
                          isActive ? 'text-white' : 'text-text-primary'
                        }`}>
                          {tab.label}
                        </div>
                        <div className={`text-sm mt-1 line-clamp-2 ${
                          isActive
                            ? 'text-white/80'
                            : 'text-text-muted group-hover:text-text-secondary'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Quick Stats Card */}
              <div className="mt-8 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/10">
                <h3 className="font-medium text-text-primary mb-3">Setup Progress</h3>
                <div className="space-y-2">
                  {verification && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Profile</span>
                        <div className="flex items-center space-x-1">
                          {verification.profile_complete ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Academic Year</span>
                        <div className="flex items-center space-x-1">
                          {verification.academic_year_setup ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Fee Structure</span>
                        <div className="flex items-center space-x-1">
                          {verification.fee_structure_setup ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {SETTINGS_TABS.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="m-0 border-0 p-0">
                    <motion.div
                      variants={fadeIn}
                      initial="initial"
                      animate="animate"
                      className="p-8"
                    >
                      {/* Tab Header */}
                      <div className="border-b border-border pb-6 mb-8">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <tab.icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-text-primary">{tab.label}</h2>
                            <p className="text-text-secondary mt-1">{tab.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tab Content */}
                      <div className="space-y-6">
                        {renderTabContent()}
                      </div>
                    </motion.div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
