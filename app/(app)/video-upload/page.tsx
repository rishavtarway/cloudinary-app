"use client";
import React, { useState } from "react";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useApiError, getErrorMessage, ApiError } from "@/hooks/useApiError";
import SubscriptionModal from "@/components/SubscriptionModal";
import { UploadCloud, File, X, CheckCircle } from 'lucide-react';

interface UploadableFile {
  file: File;
  id: string;
  progress: number;
  error: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

const VideoUpload = () => {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const router = useRouter();
  const { error, isLoading, clearError } = useApiError();
  const [isDragOver, setIsDragOver] = useState(false);

  const MAX_FILE_SIZE = 60 * 1024 * 1024;

  const addFilesToQueue = (newFiles: File[]) => {
    const uploadableFiles = newFiles.map(file => ({
      file,
      id: `${file.name}-${file.lastModified}-${file.size}`,
      progress: 0,
      error: null,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...uploadableFiles]);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };
  
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFilesToQueue(droppedFiles);
  }
  
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  const handleSubscribed = () => {
    handleSubmit(new Event('submit') as unknown as React.FormEvent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (files.length === 0 || !title.trim()) {
      return;
    }
    
    let allUploadsSuccessful = true;

    for (const uploadableFile of files) {
      if (uploadableFile.status === 'success' || uploadableFile.status === 'uploading') continue;

      if (uploadableFile.file.size > MAX_FILE_SIZE) {
        setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'error', error: `File size exceeds maximum allowed size` } : f));
        allUploadsSuccessful = false;
        continue;
      }

      setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'uploading' } : f));

      const formData = new FormData();
      formData.append("file", uploadableFile.file);
      formData.append("title", title);
      formData.append("description", description || "");
      formData.append("originalSize", uploadableFile.file.size.toString());

      try {
        await axios.post("/api/video-uploader", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || uploadableFile.file.size;
            const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
            setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, progress: percentCompleted } : f));
          },
        });
        setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'success' } : f));
      } catch (err: unknown) {
        allUploadsSuccessful = false;
        
        let errorMessage = "An unknown error occurred.";
        if (axios.isAxiosError(err)) {
            const axiosError = err as AxiosError<ApiError>;
            if (axiosError.response?.data) {
                const errorData: ApiError = {
                    message: axiosError.response.data.message ?? 'An error occurred.',
                    code: axiosError.response.data.code,
                };
                errorMessage = getErrorMessage(errorData);
                if (axiosError.response.data.code === "STORAGE_LIMIT_EXCEEDED") {
                    setShowSubscriptionModal(true);
                }
            }
        }
        
        setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'error', error: errorMessage } : f));
      }
    }
    
    if (allUploadsSuccessful && files.every(f => f.status === 'success')) {
      setTimeout(() => router.push("/home"), 2000);
    }
  };

  return (
    <div>
      {showSubscriptionModal && <SubscriptionModal onClose={() => setShowSubscriptionModal(false)} onSubscribed={handleSubscribed} />}
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Upload Videos</h1>

        {error && (
          <div className="alert alert-error mb-4">
            <div>
              <h3 className="font-bold">An Error Occurred</h3>
              <div className="text-sm">{getErrorMessage(error)}</div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragOver ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <UploadCloud className="mx-auto w-12 h-12 text-base-content/50" />
            <p className="mt-2 text-lg font-semibold">Drag & Drop files here</p>
            <p className="text-sm text-base-content/60">or click to browse</p>
            <input
              id="file-input"
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered w-full"
              required
              placeholder="A title for all uploaded videos"
              aria-required="true"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              placeholder="A description for all uploaded videos (optional)"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
                <h3 className="font-bold text-lg">Upload Queue</h3>
              {files.map(uploadableFile => (
                <div key={uploadableFile.id} className="p-4 border rounded-lg bg-base-200 flex items-center gap-4">
                    <File className="w-8 h-8 text-primary"/>
                    <div className="flex-grow">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold truncate">{uploadableFile.file.name}</p>
                            {uploadableFile.status !== 'uploading' && (
                                <button type="button" onClick={() => removeFile(uploadableFile.id)} className="btn btn-ghost btn-xs btn-circle">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                         {(uploadableFile.status === 'uploading' || uploadableFile.status === 'success') && (
                            <div className="flex items-center gap-2">
                                <progress
                                    className={`progress ${uploadableFile.status === 'success' ? 'progress-success' : 'progress-primary'} w-full`}
                                    value={uploadableFile.progress}
                                    max="100"
                                />
                                <span className="text-xs font-mono">{uploadableFile.progress}%</span>
                            </div>
                         )}
                         {uploadableFile.status === 'success' && <p className="text-success text-xs flex items-center gap-1 mt-1"><CheckCircle size={14}/> Upload complete</p>}
                         {uploadableFile.status === 'error' && <p className="text-error text-xs">{uploadableFile.error}</p>}
                    </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || files.length === 0 || files.every(f => f.status === 'success' || f.status === 'uploading')}
            aria-label="Upload selected videos"
          >
            {isLoading ? `Uploading...` : `Upload ${files.filter(f => f.status === 'pending').length} Video(s)`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;
