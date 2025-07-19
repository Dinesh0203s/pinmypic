import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, X, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadDialogProps {
  eventId: string;
  eventTitle: string;
  onPhotosUploaded: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export function PhotoUploadDialog({ 
  eventId, 
  eventTitle, 
  onPhotosUploaded,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange 
}: PhotoUploadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use controlled props if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;



  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files detected",
        description: "Only image files are allowed.",
        variant: "destructive"
      });
    }

    if (imageFiles.length === 0) {
      toast({
        title: "No valid images",
        description: "Please select image files (JPG, PNG, WebP).",
        variant: "destructive"
      });
      return;
    }

    const newUploadFiles: UploadFile[] = imageFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'pending'
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadPhoto = async (uploadFile: UploadFile): Promise<void> => {
    try {
      // Validate eventId before proceeding
      if (!eventId || eventId === 'undefined') {
        throw new Error('Invalid event ID');
      }

      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('photos', uploadFile.file);
      formData.append('eventId', eventId);
      formData.append('filename', uploadFile.file.name);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id ? { ...f, progress } : f
            ));
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadFiles(prev => prev.map(f => 
                f.id === uploadFile.id ? { 
                  ...f, 
                  status: 'completed' as const, 
                  url: result.url,
                  progress: 100 
                } : f
              ));
              resolve();
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out'));
        });

        xhr.open('POST', '/api/photos/upload');
        xhr.timeout = 300000; // 5 minute timeout
        xhr.send(formData);
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const handleUploadAll = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
      
      // Upload files in parallel (max 3 at a time)
      const batchSize = 3;
      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        const batch = pendingFiles.slice(i, i + batchSize);
        await Promise.all(batch.map(uploadPhoto));
      }

      const successCount = uploadFiles.filter(f => f.status === 'completed').length;
      const errorCount = uploadFiles.filter(f => f.status === 'error').length;

      if (successCount > 0) {
        toast({
          title: "Photos uploaded successfully",
          description: `${successCount} photos uploaded to ${eventTitle}`,
        });
        onPhotosUploaded();
      }

      if (errorCount > 0) {
        toast({
          title: "Some uploads failed",
          description: `${errorCount} photos failed to upload`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Batch upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Detailed error:', errorMessage);
      toast({
        title: "Upload failed",
        description: `Failed to upload photos: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([]);
      setIsOpen(false);
    }
  };

  const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
  const totalCount = uploadFiles.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload Photos
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Photos to {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <Card 
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className={`h-12 w-12 mb-4 ${
                isDragOver ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isDragOver ? 'Drop photos here' : 'Drop photos here or click to browse'}
              </h3>
              <p className="text-gray-600 text-center">
                Support for JPG, PNG, WebP files<br />
                Maximum 50 photos per upload
              </p>
              <Button className="mt-4" variant="outline">
                <FileImage className="h-4 w-4 mr-2" />
                Select Photos
              </Button>
            </CardContent>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Upload Progress */}
          {uploadFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Photos ({completedCount}/{totalCount})
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUploadAll}
                    disabled={isUploading || uploadFiles.every(f => f.status !== 'pending')}
                  >
                    {isUploading ? 'Uploading...' : 'Upload All'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setUploadFiles([])}
                    disabled={isUploading}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* File List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {uploadFiles.map((uploadFile) => (
                  <Card key={uploadFile.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <FileImage className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                          
                          {uploadFile.status === 'uploading' && (
                            <Progress value={uploadFile.progress} className="mt-2" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {uploadFile.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {uploadFile.status === 'uploading' && (
                            <Badge className="bg-blue-100 text-blue-800">Uploading</Badge>
                          )}
                          {uploadFile.status === 'completed' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {uploadFile.status === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          
                          {!isUploading && uploadFile.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(uploadFile.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <p className="text-xs text-red-600 mt-2">{uploadFile.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}