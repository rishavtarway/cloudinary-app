"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { Search, List, Grid, LayoutGrid, Film } from "lucide-react";

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

type ThumbnailSize = 'small' | 'medium' | 'large';

function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>('medium');
  const { error, isLoading, executeWithErrorHandling, clearError } =
    useApiError();

  const fetchVideos = useCallback(async () => {
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.get("/api/videos");

      if (response.data.success && Array.isArray(response.data.data.videos)) {
        return response.data.data.videos;
      } else if (Array.isArray(response.data.videos)) {
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

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-64">
      <div className="loading loading-spinner loading-lg text-primary"></div>
    </div>
  );

  const renderError = () => (
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

  const renderNoVideos = () => (
    <div className="text-center py-16 bg-base-200 rounded-lg">
      <Film className="mx-auto w-16 h-16 text-gray-400 mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Your Video Library is Empty</h2>
      <p className="text-lg text-gray-500">
        Upload your first video to see it here.
      </p>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="bg-base-200 rounded-lg p-8 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Your Video Library</h1>
            <p className="text-lg text-gray-500 mt-2">
              Manage and browse your uploaded video content.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                className="input input-bordered w-full max-w-xs pl-10"
              />
            </div>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost">
                View
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
                <li>
                  <a onClick={() => setThumbnailSize('small')}>
                    <Grid className="w-4 h-4 mr-2" /> Small
                  </a>
                </li>
                <li>
                  <a onClick={() => setThumbnailSize('medium')}>
                    <LayoutGrid className="w-4 h-4 mr-2" /> Medium
                  </a>
                </li>
                <li>
                  <a onClick={() => setThumbnailSize('large')}>
                    <List className="w-4 h-4 mr-2" /> Large
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isLoading && renderLoading()}
      {error && renderError()}
      {!isLoading && !error && videos.length === 0 && renderNoVideos()}
      
      {!isLoading && !error && videos.length > 0 && (
        <div className={`grid gap-6 ${
            thumbnailSize === 'small' ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6' : 
            thumbnailSize === 'medium' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 
            'grid-cols-1'
        }`}>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDownload={handleDownload}
              thumbnailSize={thumbnailSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
