import React, { useState, useEffect, useCallback, useRef } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileDown, FileUp, Plus, MessageCircle, Share2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import Image from 'next/image';

dayjs.extend(relativeTime);

interface Video {
  id: string;
  title: string;
  description?: string;
  publicId: string;
  createdAt: string;
  duration: number;
  originalSize: number | string;
  compressedSize: number | string;
}

const thumbnailSizes = {
  small: { width: 150, height: 100 },
  medium: { width: 400, height: 225 },
  large: { width: 800, height: 450 },
};

interface VideoCardProps {
  video: Video;
  onDownload?: (url: string, title: string) => void;
  onAddToWorkspace?: (videoId: string) => void;
  onComment?: (videoId: string, videoPlayerRef: React.RefObject<HTMLVideoElement>) => void;
  onShare?: (video: Video) => void;
  thumbnailSize?: keyof typeof thumbnailSizes;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onDownload,
  onAddToWorkspace,
  onComment,
  onShare,
  thumbnailSize = 'medium'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isSmall = thumbnailSize === 'small';

  const getThumbnailUrl = useCallback((publicId: string) => {
    if (!publicId) return "/placeholder-video.png";
    const { width, height } = thumbnailSizes[thumbnailSize];
    try {
      return getCldImageUrl({
        src: publicId, 
        width, 
        height, 
        crop: "fill", 
        gravity: "auto", 
        format: "jpg", 
        quality: "auto", 
        assetType: "video",
      });
    } catch (e) {
      console.error("Error generating thumbnail URL:", e);
      return "/placeholder-video.png";
    }
  }, [thumbnailSize]);

  const getFullVideoUrl = useCallback((publicId: string) => {
    if (!publicId) return undefined;
    try {
      return getCldVideoUrl({ 
        src: publicId, 
        assetType: "video" 
      });
    } catch (e) { 
      console.error("Error getting full video URL:", e); 
      return undefined; 
    }
  }, []);

  const getPreviewVideoUrl = useCallback((publicId: string) => {
    if (!publicId) return undefined;
    try {
      return getCldVideoUrl({
        src: publicId, 
        width: 400, 
        height: 225,
        rawTransformations: ["e_preview:duration_10"],
        assetType: "video",
        format: "mp4"
      });
    } catch (e) { 
      console.error("Error getting preview URL:", e); 
      return undefined; 
    }
  }, []);

  const formatSize = useCallback((sizeInput: number | string | null | undefined): string => {
    try {
      const size = Number(sizeInput);
      if (isNaN(size) || size <= 0) return 'N/A';
      return filesize(size);
    } catch { 
      return 'N/A'; 
    }
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Safely parse sizes
  const originalSize = Number(video.originalSize) || 0;
  const compressedSize = Number(video.compressedSize) || 0;
  const compressionPercentage = originalSize > 0 ? Math.round(
    (1 - compressedSize / originalSize) * 100
  ) : 0;

  useEffect(() => {
    setPreviewError(false);
    const player = videoRef.current;
    if (player) {
      if (isHovered && !previewError) {
        player.play().catch(e => console.warn("Autoplay prevented:", e));
      } else {
        player.pause();
      }
    }
  }, [isHovered, previewError]);

  const handlePreviewError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.warn(`Preview failed for video: ${video.title} (${video.publicId})`, e.nativeEvent);
    setPreviewError(true);
  };

  const handleDownload = () => {
    const url = getFullVideoUrl(video.publicId);
    if (onDownload && url) {
      onDownload(url, video.title);
    }
  };

  const handleAddToWorkspace = () => {
    if (onAddToWorkspace) {
      onAddToWorkspace(video.id);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(video.id, videoRef);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(video);
    }
  };

  const thumbnailUrl = getThumbnailUrl(video.publicId);
  const previewUrl = getPreviewVideoUrl(video.publicId);

  return (
    <div
      className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 ${isSmall ? 'text-xs' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-labelledby={`video-title-${video.id}`}
    >
      <figure className="aspect-video relative overflow-hidden bg-black group">
        {/* Preview Video Layer */}
        {previewUrl && !previewError && (
          <video
            ref={videoRef}
            src={previewUrl}
            poster={thumbnailUrl}
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            onError={handlePreviewError}
            preload="none"
          />
        )}

        {/* Static Thumbnail Image Layer */}
        <Image
          src={thumbnailUrl}
          alt={video.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`object-cover transition-opacity duration-300 ${
            isHovered && !previewError ? 'opacity-0' : 'opacity-100 z-0'
          }`}
          priority={false}
          unoptimized={thumbnailUrl === "/placeholder-video.png"}
        />

        {/* Error Overlay */}
        {previewError && isHovered && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-base-300 z-20">
            <div className="text-center p-2">
              <p className="text-error text-sm">Preview unavailable</p>
            </div>
          </div>
        )}

        {/* Duration Badge */}
        <div className={`absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-1.5 py-0.5 rounded text-xs flex items-center z-20 ${
          isSmall ? 'text-[10px] px-1' : ''
        }`}>
          <Clock size={isSmall ? 10 : 12} className="mr-1" />
          {formatDuration(video.duration)}
        </div>
      </figure>

      {/* Card Body */}
      <div className={`card-body ${isSmall ? 'p-2' : 'p-4'}`}>
        <h2 
          id={`video-title-${video.id}`} 
          className={`card-title font-bold truncate ${isSmall ? 'text-sm' : 'text-lg'}`} 
          title={video.title}
        >
          {video.title}
        </h2>

        {!isSmall && (
          <>
            <p className="text-sm text-base-content/70 mb-2 truncate" title={video.description}>
              {video.description || "No description"}
            </p>
            <p className="text-xs text-base-content/60 mb-4">
              Uploaded {dayjs(video.createdAt).fromNow()}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <FileUp size={18} className="text-primary flex-shrink-0" />
                <div>
                  <div className="font-semibold">Original</div>
                  <div className="text-xs opacity-80">{formatSize(originalSize)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileDown size={18} className="text-secondary flex-shrink-0" />
                <div>
                  <div className="font-semibold">Compressed</div>
                  <div className="text-xs opacity-80">{formatSize(compressedSize)}</div>
                </div>
              </div>
            </div>
            <div className="text-sm font-semibold mb-3">
              Compression:{" "}
              <span className="text-accent">{compressionPercentage}% savings</span>
            </div>
          </>
        )}

        {isSmall && (
          <div className="text-xs font-semibold mt-1">
            <span className="text-accent">{compressionPercentage}% savings</span>
          </div>
        )}

        <div className="card-actions justify-end items-center">
          <button 
            className={`btn btn-ghost btn-circle ${isSmall ? 'btn-xs' : 'btn-sm'}`} 
            onClick={handleComment} 
            title="Comments"
          >
            <MessageCircle size={isSmall ? 14 : 16} />
          </button>
          <button 
            className={`btn btn-ghost btn-circle ${isSmall ? 'btn-xs' : 'btn-sm'}`} 
            onClick={handleAddToWorkspace} 
            title="Add to Workspace"
          >
            <Plus size={isSmall ? 14 : 16} />
          </button>
          <button 
            className={`btn btn-ghost btn-circle ${isSmall ? 'btn-xs' : 'btn-sm'}`} 
            onClick={handleShare} 
            title="Share Video"
          >
            <Share2 size={isSmall ? 14 : 16} />
          </button>
          <button 
            className={`btn ${isSmall ? 'btn-ghost btn-xs btn-circle' : 'btn-primary btn-sm'}`} 
            onClick={handleDownload} 
            title="Download Video"
          >
            <Download size={isSmall ? 14 : 16} />
            {!isSmall && <span className="ml-1">Download</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
