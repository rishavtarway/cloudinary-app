import React, { useState, useEffect, useCallback } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileDown, FileUp, Plus, MessageCircle } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";

dayjs.extend(relativeTime);

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

const thumbnailSizes = {
  small: { width: 150, height: 100 },
  medium: { width: 400, height: 225 },
  large: { width: 800, height: 450 },
};

interface VideoCardProps {
  video: Video;
  onDownload?: (url: string, title: string) => void;
  onAddToLibrary?: (videoId: string) => void;
  onComment?: (videoId: string) => void;
  thumbnailSize?: keyof typeof thumbnailSizes;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload, onAddToLibrary, onComment, thumbnailSize = 'medium' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const isSmall = thumbnailSize === 'small';

  const getThumbnailUrl = useCallback((publicId: string) => {
    if (!publicId) return undefined;
    const { width, height } = thumbnailSizes[thumbnailSize];
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
  }, [thumbnailSize]);

  const getFullVideoUrl = useCallback((publicId: string) => {
    if (!publicId) return undefined;
    return getCldVideoUrl({
      src: publicId,
      width: 1920,
      height: 1080,
      assetType: "video",
    });
  }, []);

  const getPreviewVideoUrl = useCallback((publicId: string) => {
    if (!publicId) return undefined;
    return getCldVideoUrl({
      src: publicId,
      width: 400,
      height: 225,
      rawTransformations: ["e_preview:duration_15:max_seg_9:min_seg_dur_1"],
      assetType: "video",
    });
  }, []);

  const formatSize = useCallback((size: number) => {
    return filesize(size);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  const originalSize = Number(video.originalSize) || 1;
  const compressedSize = Number(video.compressedSize) || 1;
  const compressionPercentage = Math.round(
    (1 - compressedSize / originalSize) * 100
  );

  useEffect(() => {
    setPreviewError(false);
  }, [isHovered]);

  const handlePreviewError = () => {
    console.warn(
      `Preview failed for video: ${video.title} (${video.publicId})`
    );
    setPreviewError(true);
  };

  const handleDownload = () => {
    const url = getFullVideoUrl(video.publicId);
    if (onDownload && url) {
      onDownload(url, video.title);
    }
  };
  
  const handleAddToLibrary = () => {
    if (onAddToLibrary) {
      onAddToLibrary(video.id);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(video.id);
    }
  };

  return (
    <div
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-labelledby={`video-title-${video.id}`}
    >
      <figure className="aspect-video relative overflow-hidden">
        <video
          src={isHovered && !previewError ? getPreviewVideoUrl(video.publicId) : undefined}
          poster={getThumbnailUrl(video.publicId)}
          autoPlay={isHovered && !previewError}
          muted
          loop
          className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered && !previewError ? 'opacity-100' : 'opacity-0'}`}
          onError={handlePreviewError}
          loading="lazy"
        />
        <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.title}
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${isHovered && !previewError ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            onError={(e) => {
              console.warn(`Thumbnail failed for video: ${video.title} (${video.publicId})`);
              (e.target as HTMLImageElement).src = "/placeholder-video.png";
            }}
        />

        {previewError && isHovered && (
             <div className="w-full h-full flex items-center justify-center bg-base-300">
              <div className="text-center">
                <p className="text-error text-sm">Preview unavailable</p>
              </div>
            </div>
        )}

        <div className={`absolute bottom-2 right-2 bg-base-100 bg-opacity-70 px-2 py-1 rounded-lg flex items-center ${isSmall ? 'text-xs px-1 py-0.5' : 'text-sm'}`}>
          <Clock size={isSmall ? 12 : 16} className="mr-1" />
          {formatDuration(video.duration)}
        </div>
      </figure>

      {isSmall ? (
        <div className="card-body p-2">
          <h2 id={`video-title-${video.id}`} className="card-title text-sm font-bold truncate" title={video.title}>{video.title}</h2>
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs font-semibold">
              <span className="text-accent">{compressionPercentage}% savings</span>
            </div>
            <div>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={handleDownload} aria-label={`Download ${video.title}`}>
                <Download size={14} />
              </button>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={handleAddToLibrary} aria-label={`Add ${video.title} to a library`}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-body p-4">
          <h2 id={`video-title-${video.id}`} className="card-title text-lg font-bold">{video.title}</h2>
          <p className="text-sm text-base-content opacity-70 mb-2 truncate">
            {video.description}
          </p>
          <p className="text-xs text-base-content opacity-60 mb-4">
            Uploaded {dayjs(video.createdAt).fromNow()}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <FileUp size={18} className="mr-2 text-primary" />
              <div>
                <div className="font-semibold">Original</div>
                <div>{formatSize(originalSize)}</div>
              </div>
            </div>
            <div className="flex items-center">
              <FileDown size={18} className="mr-2 text-secondary" />
              <div>
                <div className="font-semibold">Compressed</div>
                <div>{formatSize(compressedSize)}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm font-semibold">
              Compression:{" "}
              <span className="text-accent">{compressionPercentage}%</span>
            </div>
            <div>
                <button className="btn btn-primary btn-sm mr-2" onClick={handleDownload} aria-label={`Download ${video.title}`}>
                    <Download size={16} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleAddToLibrary} aria-label={`Add ${video.title} to a library`}>
                    <Plus size={16} />
                </button>
                <button className="btn btn-info btn-sm ml-2" onClick={handleComment} aria-label={`View comments for ${video.title}`}>
                <MessageCircle size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
