"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import SubscriptionModal from "@/components/SubscriptionModal";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { Search, List, Grid, LayoutGrid, Film, HardDrive, FileDown, Clock, AlertTriangle } from "lucide-react";
import { filesize } from "filesize";

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

interface Stats {
  totalVideos: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalDuration: number;
  storageQuota: number;
  isSubscribed: boolean;
}

type ThumbnailSize = 'small' | 'medium' | 'large';

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string; }) => (
    <div className="card bg-base-200 shadow-xl">
        <div className="card-body flex-row items-center space-x-4 p-4">
            <div className={`p-3 rounded-full bg-${color} text-white shadow-md`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-sm text-base-content opacity-70">{label}</div>
            </div>
        </div>
    </div>
);


function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>('medium');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { error, isLoading, executeWithErrorHandling, clearError } = useApiError();

  const fetchData = useCallback(async () => {
    const result = await executeWithErrorHandling(async () => {
      const [videosResponse, statsResponse] = await Promise.all([
        axios.get("/api/videos"),
        axios.get("/api/user/statistics"),
      ]);
      const videos = videosResponse.data.success ? videosResponse.data.data.videos : videosResponse.data.videos;
      const stats = statsResponse.data.success ? statsResponse.data.data : statsResponse.data;
      if (!Array.isArray(videos)) throw new Error("Unexpected video response format");
      return { videos, stats };
    });

    if (result) {
      setVideos(result.videos);
      setStats(result.stats);
    }
  }, [executeWithErrorHandling]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleSubscribed = () => {
    fetchData(); // Refetch data to update UI
  };

  const handleDownload = useCallback((url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}.mp4`);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center min-h-64"><div className="loading loading-spinner loading-lg text-primary"></div></div>
  );

  const renderError = () => (
    <div className="alert alert-error">
      <AlertTriangle />
      <div>
        <h3 className="font-bold">Error Loading Data</h3>
        <div className="text-sm">{getErrorMessage(error)}</div>
      </div>
      <button className="btn btn-sm btn-outline" onClick={() => { clearError(); fetchData(); }}>Try Again</button>
    </div>
  );

  const renderNoVideos = () => (
    <div className="text-center py-16 bg-base-200 rounded-lg"><Film className="mx-auto w-16 h-16 text-gray-400 mb-4" /><h2 className="text-2xl font-semibold mb-2">Your Video Library is Empty</h2><p className="text-lg text-gray-500">Upload your first video to see it here.</p></div>
  );

  return (
    <div className="container mx-auto p-4">
      {showSubscriptionModal && <SubscriptionModal onClose={() => setShowSubscriptionModal(false)} onSubscribed={handleSubscribed} />}
      
      <div className="bg-base-200 rounded-lg p-6 mb-8">
        {/* <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1> */}
        {stats ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={Film} label="Total Videos" value={stats.totalVideos} color="primary" />
              <StatCard icon={HardDrive} label="Storage Used" value={filesize(stats.totalOriginalSize)} color="secondary" />
              <StatCard icon={FileDown} label="Compressed Size" value={filesize(stats.totalCompressedSize)} color="accent" />
              <StatCard icon={Clock} label="Total Duration" value={formatDuration(stats.totalDuration)} color="info" />
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-semibold">Storage Usage</h3>
                {stats.isSubscribed && <div className="badge badge-success">PRO PLAN</div>}
              </div>
              <progress className="progress progress-primary w-full" value={stats.totalOriginalSize} max={stats.storageQuota}></progress>
              <div className="flex justify-between text-sm text-base-content opacity-70 mt-1">
                <span>{filesize(stats.totalOriginalSize)} of {filesize(stats.storageQuota)}</span>
                {!stats.isSubscribed && stats.totalOriginalSize > stats.storageQuota &&
                  <button className="link link-primary" onClick={() => setShowSubscriptionModal(true)}>Upgrade</button>
                }
              </div>
            </div>
          </div>
        ) : isLoading ? <div className="loading loading-dots loading-md mx-auto"></div> : null}
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Your Video Library</h2>
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

      {isLoading && !stats && renderLoading()}
      {error && !isLoading && renderError()}
      {!isLoading && !error && videos.length === 0 && renderNoVideos()}
      
      {!isLoading && !error && videos.length > 0 && (
        <div className={`grid gap-6 ${thumbnailSize === 'small' ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6' : thumbnailSize === 'medium' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {videos.map((video) => (<VideoCard key={video.id} video={video} onDownload={handleDownload} thumbnailSize={thumbnailSize} />))}
        </div>
      )}
    </div>
  );
}

export default Home;
