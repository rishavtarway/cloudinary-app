"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";

// New interface for tracking individual file upload status
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
  const router = useRouter();
  const { error, isLoading, executeWithErrorHandling, clearError } = useApiError();

  const MAX_FILE_SIZE = 60 * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).map(file => ({
        file,
        id: `${file.name}-${file.lastModified}`,
        progress: 0,
        error: null,
        status: 'pending' as const,
      }));
      setFiles(selectedFiles);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (files.length === 0) {
      executeWithErrorHandling(() => {
        throw new Error("Please select one or more video files to upload");
      });
      return;
    }

    if (!title.trim()) {
        executeWithErrorHandling(() => {
          throw new Error("Please provide a title for your video");
        });
        return;
      }

    for (const uploadableFile of files) {
        if (uploadableFile.file.size > MAX_FILE_SIZE) {
            setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'error', error: `File size exceeds maximum allowed size` } : f));
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
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || uploadableFile.file.size)
            );
            setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, progress: percentCompleted } : f));
          },
        });
        setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'success' } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === uploadableFile.id ? { ...f, status: 'error', error: getErrorMessage(err.response?.data) } : f));
      }
    }

    // Optional: Redirect after all uploads are done or show a summary
    // For now, we'll just log it.
    console.log("All uploads processed.");
    // You might want to navigate away or show a success message after a short delay
    setTimeout(() => router.push("/home"), 2000);
  };

  return (
    <div>
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

          <div>
            <label className="label">
              <span className="label-text">Video Files</span>
            </label>
            <input
              type="file"
              accept="video/*"
              multiple // Allow multiple file selection
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full"
              required
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
                <h3 className="font-bold">Upload Queue</h3>
              {files.map(uploadableFile => (
                <div key={uploadableFile.id} className="p-2 border rounded">
                  <p className="text-sm font-semibold">{uploadableFile.file.name}</p>
                  {(uploadableFile.status === 'uploading' || uploadableFile.status === 'success') && (
                     <progress
                        className={`progress ${uploadableFile.status === 'success' ? 'progress-success' : 'progress-primary'} w-full`}
                        value={uploadableFile.progress}
                        max="100"
                    />
                  )}
                  {uploadableFile.status === 'error' && <p className="text-red-500 text-xs">{uploadableFile.error}</p>}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? `Uploading...` : "Upload Videos"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;
