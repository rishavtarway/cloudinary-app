"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";

const VideoUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { error, isLoading, executeWithErrorHandling, clearError } =
    useApiError();

  // Max file size: 60 MB
  const MAX_FILE_SIZE = 60 * 1024 * 1024;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Client-side validation
    if (!file) {
      executeWithErrorHandling(() => {
        throw new Error("Please select a video file to upload");
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      executeWithErrorHandling(() => {
        throw new Error(
          `File size (${(file.size / (1024 * 1024)).toFixed(
            2
          )}MB) exceeds maximum allowed size (${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB)`
        );
      });
      return;
    }

    if (!title.trim()) {
      executeWithErrorHandling(() => {
        throw new Error("Please provide a title for your video");
      });
      return;
    }

    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description || "");
    formData.append("originalSize", file.size.toString());

    console.log("Uploading video:", {
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      title,
      description,
    });

    const result = await executeWithErrorHandling(async () => {
      const response = await axios.post("/api/video-uploader", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || file.size)
          );
          setUploadProgress(percentCompleted);
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });

      console.log("API Response:", response.data);
      return response.data;
    });

    if (result) {
      // Success - redirect to home page
      router.push("/home");
    }
  };

  return (
    <div>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Upload Video</h1>

        {error && (
          <div className="alert alert-error mb-4">
            <div>
              <h3 className="font-bold">Upload Failed</h3>
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
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Video File</span>
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file-input file-input-bordered w-full"
              required
            />
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                Selected file: {file.name} (
                {(file.size / (1024 * 1024)).toFixed(2)}MB)
              </p>
            )}
          </div>

          {isLoading && (
            <div>
              <progress
                className="progress progress-primary w-full"
                value={uploadProgress}
                max="100"
              />
              <p className="text-center mt-2">{uploadProgress}% Uploaded</p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? `Uploading... ${uploadProgress}%` : "Upload Video"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;
