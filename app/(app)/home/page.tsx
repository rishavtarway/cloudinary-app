"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";

interface Video {
  id: string;
  title: string;
  description: string;
  publicId: string;
  createdAt: string;
  duration: number;
  originalSize: number;
  compressedSize: number;
}

function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const { error, isLoading, executeWithErrorHandling, clearError } =
    useApiError();

  const fetchVideos = useCallback(async () => {
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.get("/api/videos");

      // Handle new API response format
      if (response.data.success && Array.isArray(response.data.data.videos)) {
        return response.data.data.videos;
      } else if (Array.isArray(response.data.videos)) {
        // Fallback for old format
        return response.data.videos;
      } else {
        throw new Error("Unexpected response format from server");
      }
    });

    if (result) {
      setVideos(result);
    }
  }, [executeWithErrorHandling]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDownload = useCallback((url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}.mp4`);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">Error Loading Videos</h3>
            <div className="text-sm">{getErrorMessage(error)}</div>
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => {
              clearError();
              fetchVideos();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Videos</h1>
      {videos.length === 0 ? (
        <div className="text-center text-lg text-gray-500">
          No videos available
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
