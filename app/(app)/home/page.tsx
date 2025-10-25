// app/(app)/home/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react"; // useRef is still used, but differently
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import SubscriptionModal from "@/components/SubscriptionModal";
import AddToWorkspaceModal from "@/components/AddToWorkspaceModal"; // Renamed from AddToLibraryModal
import CommentModal from "@/components/CommentModal";
import ShareModal from "@/components/ShareModal"; // Assuming you created this based on previous example
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import {
  Search,
  List,
  Grid,
  LayoutGrid,
  Film,
  HardDrive,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { filesize } from "filesize";
import OnboardingTour from "@/components/OnboardingTour";
import useDebounce from "@/hooks/useDebounce";

// Define TypeScript interfaces for our data
interface Video {
  id: string;
  title: string;
  description?: string; // Made optional for robustness
  publicId: string;
  createdAt: string;
  duration: number;
  originalSize: number | string; // Allow string as API might return it
  compressedSize: number | string; // Allow string as API might return it
}

interface Stats {
  totalVideos: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalDuration: number;
  storageQuota: number;
  isSubscribed: boolean;
}

type ThumbnailSize = "small" | "medium" | "large";

// --- StatCard, SkeletonStatCard, SkeletonVideoCard remain the same ---
const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  description?: string;
}) => (
  <div className="card bg-base-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
    <div className="card-body p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm text-base-content opacity-70 mt-1">
            {label}
          </div>
        </div>
        <div className={`p-3 rounded-full bg-${color} text-white shadow-md`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {description && (
        <div className="text-xs text-base-content opacity-50 mt-2">
          {description}
        </div>
      )}
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
);

const SkeletonVideoCard = () => (
  <div className="card bg-base-100 shadow-xl animate-pulse">
    <div className="aspect-video bg-base-300 rounded-t-lg"></div>
    <div className="card-body p-4">
      <div className="h-5 bg-base-300 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-base-300 rounded w-1/2"></div>
    </div>
  </div>
);
// --- End of StatCard definitions ---

function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAddToWorkspaceModal, setShowAddToWorkspaceModal] = useState(false); // Renamed
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null); // For AddToWorkspaceModal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedVideoIdForComment, setSelectedVideoIdForComment] = useState<
    string | null
  >(null);
  const [showShareModal, setShowShareModal] = useState(false); // For video share
  const [selectedVideoForShare, setSelectedVideoForShare] =
    useState<Video | null>(null);
  const { error, isLoading, executeWithErrorHandling, clearError } =
    useApiError();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  // State to hold the ref of the video player FOR THE CURRENTLY OPEN comment modal
  const [activeVideoRef, setActiveVideoRef] =
    useState<React.RefObject<HTMLVideoElement> | null>(null);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboardingTour");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasSeenOnboardingTour", "true");
    setShowOnboarding(false);
  };

  const fetchData = useCallback(
    async (query: string = "") => {
      const result = await executeWithErrorHandling(async () => {
        const endpoint = query
          ? `/api/videos?search=${encodeURIComponent(query)}`
          : "/api/videos";
        const videosResponse = await axios.get(endpoint);
        const videosData = videosResponse.data.success
          ? videosResponse.data.data.videos
          : videosResponse.data.videos || [];
        if (!Array.isArray(videosData))
          throw new Error("Unexpected video response format");

        let statsData = null;
        if (!query) {
          const statsResponse = await axios.get("/api/user/statistics");
          statsData = statsResponse.data.success
            ? statsResponse.data.data
            : statsResponse.data || null;
        }
        return { videos: videosData, stats: statsData };
      });

      if (result) {
        setVideos(result.videos);
        // **REMOVED**: No longer creating refs here
        // result.videos.forEach(video => {
        //   if (!videoPlayerRefs.current[video.id]) {
        //     videoPlayerRefs.current[video.id] = React.createRef<HTMLVideoElement>();
        //   }
        // });

        if (result.stats) {
          setStats(result.stats);
        }
      }
    },
    [executeWithErrorHandling]
  ); // Removed stats from dependencies

  useEffect(() => {
    fetchData(debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchData]);

  const handleSubscribed = () => {
    fetchData();
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

  const handleAddToWorkspace = (videoId: string) => {
    // Renamed
    setSelectedVideoId(videoId);
    setShowAddToWorkspaceModal(true); // Renamed
  };

  // **UPDATED**: Accepts the ref from VideoCard
  const handleComment = (
    videoId: string,
    videoPlayerRef: React.RefObject<HTMLVideoElement>
  ) => {
    setSelectedVideoIdForComment(videoId);
    setActiveVideoRef(videoPlayerRef); // Store the ref for the modal
    setShowCommentModal(true);
  };

  const handleShare = (video: Video) => {
    // Added handler
    setSelectedVideoForShare(video);
    setShowShareModal(true);
  };

  // **UPDATED**: Clear the active ref when closing the comment modal
  const handleCloseCommentModal = () => {
    setShowCommentModal(false);
    setSelectedVideoIdForComment(null);
    setActiveVideoRef(null); // Clear the ref
  };

  const handleViewChange = (size: ThumbnailSize) => {
    setThumbnailSize(size);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // --- Calculations and formatting functions remain the same ---
  const totalOriginalSize = stats ? Number(stats.totalOriginalSize) || 0 : 0;
  const totalCompressedSize = stats
    ? Number(stats.totalCompressedSize) || 0
    : 0;
  const storageQuota = stats ? Number(stats.storageQuota) || 1 : 1; // Avoid division by zero
  const compressionSavings = Math.max(
    0,
    totalOriginalSize - totalCompressedSize
  );
  const storageUsedPercentage = Math.min(
    100,
    (totalOriginalSize / storageQuota) * 100
  );

  const formatDuration = (secondsInput: number | null | undefined): string => {
    const seconds = Math.round(Number(secondsInput) || 0);
    if (seconds <= 0) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    let durationString = "";
    if (hours > 0) durationString += `${hours}h `;
    if (minutes > 0) durationString += `${minutes}m `;
    if (secs > 0 || durationString === "") durationString += `${secs}s`; // Show seconds if duration is less than a minute
    return durationString.trim();
  };
  // --- End calculations ---

  // --- Render helper functions (renderLoading, renderError, etc.) remain the same ---
  const renderLoading = () => (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonVideoCard key={`skel-vid-${i}`} />
      ))}
    </div>
  );

  const renderError = () => (
    <div className="alert alert-error">
      <AlertTriangle />
      <div>
        <h3 className="font-bold">Error Loading Data</h3>
        <div className="text-sm">{getErrorMessage(error)}</div>
      </div>
      <button
        className="btn btn-sm btn-outline"
        onClick={() => {
          clearError();
          fetchData(debouncedSearchQuery);
        }}
      >
        Try Again
      </button>
    </div>
  );

  const renderNoVideos = () => (
    <div className="text-center py-16 bg-base-200 rounded-lg">
      <Film className="mx-auto w-16 h-16 text-base-content/50 mb-4" />
      <h2 className="text-2xl font-semibold mb-2">
        Your Video Library is Empty
      </h2>
      <p className="text-lg text-base-content/70">
        Upload your first video to see it here.
      </p>
    </div>
  );

  const renderNoSearchResults = () => (
    <div className="text-center py-16 bg-base-200 rounded-lg">
      <Search className="mx-auto w-16 h-16 text-base-content/50 mb-4" />
      <h2 className="text-2xl font-semibold mb-2">No Videos Found</h2>
      <p className="text-lg text-base-content/70">
        Your search for &quot;{searchQuery}&quot; did not return any results.
      </p>
      <button className="btn btn-link mt-2" onClick={() => setSearchQuery("")}>
        Clear Search
      </button>
    </div>
  );
  // --- End render helpers ---

  return (
    <div className="container mx-auto p-4">
      {/* --- Modals --- */}
      {showOnboarding && (
        <OnboardingTour onComplete={handleOnboardingComplete} />
      )}
      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribed={handleSubscribed}
        />
      )}
      {showAddToWorkspaceModal && selectedVideoId && (
        <AddToWorkspaceModal
          videoId={selectedVideoId}
          onClose={() => setShowAddToWorkspaceModal(false)}
        />
      )}
      {showCommentModal && selectedVideoIdForComment && (
        <CommentModal
          videoId={selectedVideoIdForComment}
          onClose={handleCloseCommentModal} // Use updated close handler
          // Explicitly pass undefined if activeVideoRef is null
          videoPlayerRef={activeVideoRef ?? undefined}
        />
      )}
      {showShareModal && selectedVideoForShare && (
        <ShareModal
          resourceId={selectedVideoForShare.id}
          resourceType="video"
          resourceName={selectedVideoForShare.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {/* --- End Modals --- */}

      {/* --- Stats Section --- */}
      <div className="mb-8">
        {/* Stats rendering logic remains the same */}
        {isLoading && !stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={`skel-stat-${i}`} />
            ))}
          </div>
        ) : stats ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Film}
                label="Total Videos"
                value={stats.totalVideos}
                color="primary"
                description="The total count of videos you've uploaded."
              />
              <StatCard
                icon={HardDrive}
                label="Storage Used"
                value={filesize(totalOriginalSize)}
                color="secondary"
                description="Total original size before compression."
              />
              <StatCard
                icon={Zap}
                label="Compression Savings"
                value={filesize(compressionSavings)}
                color="accent"
                description={`Space saved: ${filesize(compressionSavings)}`}
              />
              <StatCard
                icon={Clock}
                label="Total Duration"
                value={formatDuration(stats.totalDuration)}
                color="info"
                description="Combined duration of all videos."
              />
            </div>
            <div className="mt-6 bg-base-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-semibold">Storage Usage</h3>
                {stats.isSubscribed ? (
                  <div className="badge badge-success">PRO PLAN</div>
                ) : (
                  <div className="badge badge-ghost">FREE PLAN</div>
                )}
              </div>
              <progress
                className={`progress ${
                  storageUsedPercentage > 90
                    ? "progress-error"
                    : storageUsedPercentage > 70
                    ? "progress-warning"
                    : "progress-primary"
                } w-full`}
                value={storageUsedPercentage}
                max="100"
                aria-label={`Storage used: ${storageUsedPercentage.toFixed(
                  1
                )}%`}
              ></progress>
              <div className="flex justify-between text-sm text-base-content opacity-70 mt-1">
                <span>
                  {filesize(totalOriginalSize)} of {filesize(storageQuota)}
                </span>
                {!stats.isSubscribed && totalOriginalSize >= storageQuota && (
                  <button
                    className="link link-error font-semibold"
                    onClick={() => setShowSubscriptionModal(true)}
                  >
                    Upgrade Required
                  </button>
                )}
                {!stats.isSubscribed &&
                  totalOriginalSize < storageQuota &&
                  storageUsedPercentage > 80 && (
                    <button
                      className="link link-warning font-semibold"
                      onClick={() => setShowSubscriptionModal(true)}
                    >
                      Upgrade Soon
                    </button>
                  )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {/* --- End Stats Section --- */}

      {/* --- Video Library Section Header --- */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        {/* Header content remains the same */}
        <h2 className="text-3xl font-bold" id="video-library-heading">
          Your Video Library
        </h2>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50 pointer-events-none" />
            <input
              type="search"
              placeholder="Search videos..."
              className="input input-bordered w-full max-w-xs pl-10 pr-4"
              aria-label="Search your videos by title or description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="btn btn-ghost"
              aria-haspopup="true"
              aria-controls="view-menu"
              title="Change view layout"
            >
              View
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
            <ul
              tabIndex={0}
              id="view-menu"
              className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-36 z-50"
            >
              <li>
                <button
                  className={`w-full text-left ${
                    thumbnailSize === "small" ? "active" : ""
                  }`}
                  onClick={() => handleViewChange("small")}
                >
                  <Grid className="w-4 h-4 mr-2 inline-block" /> Small Grid
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left ${
                    thumbnailSize === "medium" ? "active" : ""
                  }`}
                  onClick={() => handleViewChange("medium")}
                >
                  <LayoutGrid className="w-4 h-4 mr-2 inline-block" /> Medium
                  Grid
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left ${
                    thumbnailSize === "large" ? "active" : ""
                  }`}
                  onClick={() => handleViewChange("large")}
                >
                  <List className="w-4 h-4 mr-2 inline-block" /> Large List
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* --- End Header --- */}

      {/* --- Video Grid/List --- */}
      {/* Loading/Error/Empty states remain the same */}
      {isLoading && renderLoading()}
      {!isLoading && error && renderError()}
      {!isLoading &&
        !error &&
        videos.length === 0 &&
        (searchQuery ? renderNoSearchResults() : renderNoVideos())}

      {!isLoading && !error && videos.length > 0 && (
        <div
          className={`grid gap-6 ${
            thumbnailSize === "small"
              ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
              : thumbnailSize === "medium"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1" // Large List
          }`}
        >
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDownload={handleDownload}
              onAddToWorkspace={handleAddToWorkspace}
              onComment={handleComment} // Pass the handler directly
              onShare={handleShare}
              thumbnailSize={thumbnailSize}
              // No need to pass ref here; VideoCard passes its internal ref UP via onComment
            />
          ))}
        </div>
      )}
      {/* --- End Video Grid/List --- */}
    </div>
  );
}

export default Home;
