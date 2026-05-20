import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/layout/PageHeader';
import { slideUp } from '@/lib/animations';
import { ModerationTab } from './components/ModerationTab';
import { CreatePostTab } from './components/CreatePostTab';
import { SchoolFeedTab } from './components/SchoolFeedTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { Shield, PenTool, Users, BarChart3 } from 'lucide-react';

export default function SpherePage() {
  const [activeTab, setActiveTab] = useState('moderation');

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="NeuraSphere"
        description="Moderation and publishing for the school community"
      />

      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="container mx-auto px-6 py-8"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger
              value="moderation"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Moderation</span>
            </TabsTrigger>
            <TabsTrigger
              value="create-post"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">Create Post</span>
            </TabsTrigger>
            <TabsTrigger
              value="school-feed"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">School Feed</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="moderation" className="focus-visible:outline-none">
            <ModerationTab />
          </TabsContent>

          <TabsContent value="create-post" className="focus-visible:outline-none">
            <CreatePostTab />
          </TabsContent>

          <TabsContent value="school-feed" className="focus-visible:outline-none">
            <SchoolFeedTab />
          </TabsContent>

          <TabsContent value="analytics" className="focus-visible:outline-none">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}