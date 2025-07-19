import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Package } from '@shared/types';

interface CreatePackageDialogProps {
  onPackageCreated: () => void;
  editPackage?: Package;
  isEditing?: boolean;
}

export function CreatePackageDialog({ onPackageCreated, editPackage, isEditing = false }: CreatePackageDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editPackage?.name || '',
    price: editPackage?.price || '',
    duration: editPackage?.duration || '',
    photoCount: editPackage?.photoCount || '',
    features: editPackage?.features || [''],
    isPopular: editPackage?.isPopular || false,
    isActive: editPackage?.isActive !== false,
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty features
      const cleanFeatures = formData.features.filter((feature: string) => feature.trim() !== '');
      
      const packageData = {
        ...formData,
        price: Number(formData.price),
        features: cleanFeatures,
      };

      const url = isEditing && editPackage ? `/api/packages/${editPackage.id}` : '/api/packages';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packageData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Package ${isEditing ? 'updated' : 'created'} successfully:`, result);
        
        toast({
          title: "Success",
          description: `Package ${isEditing ? 'updated' : 'created'} successfully`,
        });

        setOpen(false);
        setFormData({
          name: '',
          price: '',
          duration: '',
          photoCount: '',
          features: [''],
          isPopular: false,
          isActive: true,
        });
        onPackageCreated();
      } else {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} package`);
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} package:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} package. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature: string, i: number) => i === index ? value : feature)
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_: string, i: number) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {isEditing ? 'Edit Package' : 'Add Package'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Package' : 'Create New Package'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the package details below.' : 'Add a new photography package to your offerings.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Package Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Premium"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="499"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="4 hours"
                required
              />
            </div>
            <div>
              <Label htmlFor="photoCount">Photo Count</Label>
              <Input
                id="photoCount"
                value={formData.photoCount}
                onChange={(e) => setFormData(prev => ({ ...prev, photoCount: e.target.value }))}
                placeholder="100+ photos"
                required
              />
            </div>
          </div>

          <div>
            <Label>Features</Label>
            <div className="space-y-2">
              {formData.features.map((feature: string, index: number) => (
                <div key={`feature-${index}`} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="e.g., Professional editing"
                    className="flex-1"
                  />
                  {formData.features.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="isPopular"
                checked={formData.isPopular}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPopular: checked }))}
              />
              <Label htmlFor="isPopular">Mark as Popular</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Package' : 'Create Package')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}