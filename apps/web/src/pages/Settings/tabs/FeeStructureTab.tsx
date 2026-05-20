import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, Tag, DollarSign, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listItem, staggerChildren } from '@/lib/animations';
import {
  useFeeCategories,
  useFeeHeads,
  useCreateFeeCategory,
  useCreateFeeHead,
  useUpdateFeeHead,
  useDeactivateFeeHead
} from '@/hooks/useSettings';
import type { FeeCategory, FeeHead } from '@/types/common';

export function FeeStructureTab() {
  const { data: categories, isLoading: categoriesLoading } = useFeeCategories();
  const { data: feeHeads, isLoading: feeHeadsLoading } = useFeeHeads();
  const { mutate: createCategory } = useCreateFeeCategory();
  const { mutate: createFeeHead } = useCreateFeeHead();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFeeHeadModal, setShowFeeHeadModal] = useState(false);

  const handleCreateCategory = (categoryData: any) => {
    createCategory(categoryData, {
      onSuccess: () => {
        setShowCategoryModal(false);
      },
    });
  };

  const handleCreateFeeHead = (feeHeadData: any) => {
    createFeeHead(feeHeadData, {
      onSuccess: () => {
        setShowFeeHeadModal(false);
      },
    });
  };

  if (categoriesLoading || feeHeadsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Fee Structure</h2>
          <p className="text-sm text-text-secondary">Configure fee categories, heads, and amounts</p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-fit">
          <TabsTrigger value="categories" className="flex items-center space-x-2">
            <Tag className="h-4 w-4" />
            <span>Categories</span>
          </TabsTrigger>
          <TabsTrigger value="heads" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Fee Heads</span>
          </TabsTrigger>
        </TabsList>

        {/* Fee Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Fee Categories</h3>
              <p className="text-sm text-text-secondary">
                Organize fees into categories like General, SC/ST, EWS, etc.
              </p>
            </div>
            <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Category</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Fee Category</DialogTitle>
                </DialogHeader>
                <CreateCategoryForm onSubmit={handleCreateCategory} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories && categories.length > 0 ? (
              categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <Tag className="h-12 w-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary mb-4">No fee categories configured yet</p>
                <Button
                  variant="outline"
                  onClick={() => setShowCategoryModal(true)}
                >
                  Create First Category
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Fee Heads Tab */}
        <TabsContent value="heads" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Fee Heads</h3>
              <p className="text-sm text-text-secondary">
                Define specific fee components with amounts and frequency
              </p>
            </div>
            <Dialog open={showFeeHeadModal} onOpenChange={setShowFeeHeadModal}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2" disabled={!categories || categories.length === 0}>
                  <Plus className="h-4 w-4" />
                  <span>Add Fee Head</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Fee Head</DialogTitle>
                </DialogHeader>
                <CreateFeeHeadForm categories={categories || []} onSubmit={handleCreateFeeHead} />
              </DialogContent>
            </Dialog>
          </div>

          {!categories || categories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Tag className="h-12 w-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary mb-4">
                  Create fee categories first before adding fee heads
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCategoryModal(true)}
                >
                  Create Fee Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Fee Heads</CardTitle>
              </CardHeader>
              <CardContent>
                {feeHeads && feeHeads.length > 0 ? (
                  <motion.div
                    variants={staggerChildren}
                    initial="initial"
                    animate="animate"
                    className="space-y-3"
                  >
                    {feeHeads.map((feeHead) => (
                      <FeeHeadCard key={feeHead.id} feeHead={feeHead} />
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-secondary mb-4">No fee heads configured yet</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowFeeHeadModal(true)}
                    >
                      Create First Fee Head
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Category Card Component
function CategoryCard({ category }: { category: FeeCategory }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-text-primary">{category.name}</h4>
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Active
          </Badge>
        </div>
        {category.description && (
          <p className="text-sm text-text-secondary mb-3">{category.description}</p>
        )}
        <div className="text-xs text-text-muted">
          Created {new Date(category.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

// Fee Head Card Component
function FeeHeadCard({ feeHead }: { feeHead: FeeHead & { category_name: string } }) {
  const { mutate: updateFeeHead } = useUpdateFeeHead();
  const { mutate: deactivateFeeHead } = useDeactivateFeeHead();

  const getFrequencyColor = () => {
    switch (feeHead.frequency) {
      case 'MONTHLY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QUARTERLY':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ANNUAL':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ONE_TIME':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <motion.div
      variants={listItem}
      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-surface-raised transition-colors"
    >
      <div className="flex items-center space-x-4">
        <div className="bg-primary/10 text-primary rounded-lg p-2">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h4 className="font-medium">{feeHead.name}</h4>
            <Badge variant="outline" className="text-xs">
              {feeHead.category_name}
            </Badge>
          </div>
          <div className="flex items-center space-x-4 text-sm text-text-secondary">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3" />
              <span>₹{feeHead.amount.toLocaleString()}</span>
            </div>
            <Badge className={`text-xs ${getFrequencyColor()}`}>
              {feeHead.frequency}
            </Badge>
            {feeHead.class_year && (
              <span>Class {feeHead.class_year}</span>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Edit className="h-4 w-4 mr-2" />
            Edit Fee Head
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-danger"
            onClick={() => deactivateFeeHead(feeHead.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deactivate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// Create Category Form Component
function CreateCategoryForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, is_active: true });
  };

  const isValid = formData.name.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category-name">Category Name *</Label>
        <Input
          id="category-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., General, SC/ST, EWS"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="category-description">Description</Label>
        <Textarea
          id="category-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this fee category"
          className="mt-1"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormData({ name: '', description: '' })}
        >
          Reset
        </Button>
        <Button type="submit" disabled={!isValid}>
          Create Category
        </Button>
      </div>
    </form>
  );
}

// Create Fee Head Form Component
function CreateFeeHeadForm({
  categories,
  onSubmit
}: {
  categories: FeeCategory[];
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    amount: '',
    frequency: 'MONTHLY' as const,
    class_year: '',
    due_date_rule: 'MONTH_START',
    is_mandatory: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      class_year: formData.class_year ? parseInt(formData.class_year) : null,
      is_active: true,
    });
  };

  const isValid = formData.category_id && formData.name.trim() && formData.amount;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fee-category">Fee Category *</Label>
        <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fee-name">Fee Head Name *</Label>
          <Input
            id="fee-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Tuition Fee, Development Fee"
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            className="mt-1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="frequency">Frequency *</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ONE_TIME">One Time</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="ANNUAL">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="class-year">Class Year (Optional)</Label>
          <Select value={formData.class_year} onValueChange={(value) => setFormData({ ...formData, class_year: value })}>
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
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this fee head"
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is-mandatory"
          checked={formData.is_mandatory}
          onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
        />
        <Label htmlFor="is-mandatory" className="text-sm">
          This is a mandatory fee
        </Label>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormData({
            category_id: '', name: '', description: '', amount: '', frequency: 'MONTHLY',
            class_year: '', due_date_rule: 'MONTH_START', is_mandatory: true
          })}
        >
          Reset
        </Button>
        <Button type="submit" disabled={!isValid}>
          Create Fee Head
        </Button>
      </div>
    </form>
  );
}