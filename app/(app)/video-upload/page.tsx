"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const VideoUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Max file size: 60 MB
  const MAX_FILE_SIZE = 60 * 1024 * 1024;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a file");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size too large (Max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
      return;
    }

    setIsUploading(true);
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

    try {
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
      router.push("/");
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "An error occurred during upload."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Upload Video</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
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

          {isUploading && (
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
            disabled={isUploading}
          >
            {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Video"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;
