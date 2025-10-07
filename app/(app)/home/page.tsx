"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import SubscriptionModal from "@/components/SubscriptionModal";
import AddToLibraryModal from "@/components/AddToLibraryModal";
import CommentModal from "@/components/CommentModal";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { Search, List, Grid, LayoutGrid, Film, HardDrive, FileDown, Clock, AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { filesize } from "filesize";
import OnboardingTour from "@/components/OnboardingTour";

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

const StatCard = ({ icon: Icon, label, value, color, description }: { icon: React.ElementType; label: string; value: string | number; color: string; description?: string }) => (
    <div className="card bg-base-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="card-body p-4">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-3xl font-bold">{value}</div>
                    <div className="text-sm text-base-content opacity-70 mt-1">{label}</div>
                </div>
                <div className={`p-3 rounded-full bg-${color} text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {description && <div className="text-xs text-base-content opacity-50 mt-2">{description}</div>}
        </div>
    </div>
);

const SkeletonStatCard = () => (
    <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-4">
            <div className="animate-pulse flex items-start justify-between">
                <div>
                    <div className="h-8 bg-base-300 rounded w-20 mb-2"></div>
                    <div className="h-4 bg-base-300 rounded w-24"></div>
                </div>
                <div className="w-12 h-12 bg-base-300 rounded-full"></div>
            </div>
        </div>
    </div>
)

const SkeletonVideoCard = () => (
    <div className="card bg-base-100 shadow-xl animate-pulse">
        <div className="aspect-video bg-base-300 rounded-t-lg"></div>
        <div className="card-body p-4">
            <div className="h-5 bg-base-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-base-300 rounded w-1/2"></div>
        </div>
    </div>
)


function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>('medium');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAddToLibraryModal, setShowAddToLibraryModal] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedVideoIdForComment, setSelectedVideoIdForComment] = useState<string | null>(null);
  const { error, isLoading, executeWithErrorHandling, clearError } = useApiError();
  const [showOnboarding, setShowOnboarding] = useState(false);


  useEffect(() => {
    // Check if the user has seen the onboarding tour before
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboardingTour', 'true');
    setShowOnboarding(false);
  };


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

  const handleAddToLibrary = (videoId: string) => {
    setSelectedVideoId(videoId);
    setShowAddToLibraryModal(true);
  };

  const handleComment = (videoId: string) => {
    setSelectedVideoIdForComment(videoId);
    setShowCommentModal(true);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    let durationString = '';
    if (hours > 0) durationString += `${hours}h `;
    if (minutes > 0) durationString += `${minutes}m `;
    if (secs > 0 || (hours === 0 && minutes === 0)) durationString += `${secs}s`;
    return durationString.trim();
  };
  const compressionSavings = stats ? stats.totalOriginalSize - stats.totalCompressedSize : 0;


  const renderLoading = () => (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonVideoCard key={i} />)}
    </div>
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
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}
      {showSubscriptionModal && <SubscriptionModal onClose={() => setShowSubscriptionModal(false)} onSubscribed={handleSubscribed} />}
      {showAddToLibraryModal && selectedVideoId && (
        <AddToLibraryModal
          videoId={selectedVideoId}
          onClose={() => setShowAddToLibraryModal(false)}
        />
      )}
      {showCommentModal && selectedVideoIdForComment && (
        <CommentModal
          videoId={selectedVideoIdForComment}
          onClose={() => setShowCommentModal(false)}
        />
      )}
      
      <div className="mb-8">
        {stats ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={Film} label="Total Videos" value={stats.totalVideos} color="primary" description="The total count of videos you've uploaded." />
              <StatCard icon={HardDrive} label="Storage Used" value={filesize(stats.totalOriginalSize)} color="secondary" description="Total original size of all your videos." />
              <StatCard icon={Zap} label="Compression Savings" value={filesize(compressionSavings)} color="accent" description={`You've saved ${filesize(compressionSavings)} through compression.`} />
              <StatCard icon={Clock} label="Total Duration" value={formatDuration(stats.totalDuration)} color="info" description="The combined duration of all your videos." />
            </div>
            <div className="mt-6 bg-base-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-semibold">Storage Usage</h3>
                {stats.isSubscribed ? <div className="badge badge-success">PRO PLAN</div> : <div className="badge badge-ghost">FREE PLAN</div>}
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
        ) : isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
             </div>
        ) : null}
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold" id="video-library-heading">Your Video Library</h2>
        <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                className="input input-bordered w-full max-w-xs pl-10"
                aria-label="Search your videos"
              />
            </div>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost" aria-haspopup="true" aria-controls="view-menu">
                View
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </label>
              <ul tabIndex={0} id="view-menu" className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
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
          {videos.map((video) => (<VideoCard key={video.id} video={video} onDownload={handleDownload} onAddToLibrary={handleAddToLibrary} onComment={handleComment} thumbnailSize={thumbnailSize} />))}
        </div>
      )}
    </div>
  );
}

export default Home;
