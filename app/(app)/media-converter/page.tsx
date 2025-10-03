"use client";
import React, { useState, useEffect } from "react";
import { CldImage, CldVideoPlayer } from "next-cloudinary";
import { getCldImageUrl } from "next-cloudinary";

// Define a precise type for our transformation options
interface CloudinaryTransformation {
    width: number;
    height: number;
    crop: "fill" | "crop" | "fit" | "auto" | "fill_pad";
    gravity: "auto" | "face" | "center";
}

const socialFormats: Record<string, CloudinaryTransformation> = {
  "Instagram Square (1:1)": { width: 1080, height: 1080, crop: "fill", gravity: "auto" },
  "Instagram Portrait (4:5)": { width: 1080, height: 1350, crop: "fill", gravity: "auto" },
  "Instagram Story (9:16)": { width: 1080, height: 1920, crop: "fill", gravity: "auto" },
  "Twitter Post (16:9)": { width: 1200, height: 675, crop: "fill", gravity: "auto" },
  "Facebook Post (1.91:1)": { width: 1200, height: 630, crop: "fill", gravity: "auto" },
  "Pinterest Pin (2:3)": { width: 1000, height: 1500, crop: "fill", gravity: "auto" },
  "YouTube Banner (16:9)": { width: 2560, height: 1440, crop: "fill", gravity: "auto" },
};
type SocialFormat = keyof typeof socialFormats;

const availableFormats = {
  video: [
    { name: "MP4", value: "mp4" }, { name: "WebM", value: "webm" },
    { name: "AVI", value: "avi" }, { name: "MOV", value: "mov" },
  ],
  image: [
    { name: "PNG", value: "png" }, { name: "JPG", value: "jpg" },
    { name: "WebP", value: "webp" }, { name: "GIF", value: "gif" },
  ],
};

const MAX_PREVIEW_DIMENSION = 800;

export default function MediaConverter() {
  const [uploadedFile, setUploadedFile] = useState<{ publicId: string; resourceType: 'image' | 'video' } | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedSocial, setSelectedSocial] = useState<SocialFormat | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // ... (handleFileUpload and handleDownload remain the same)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFile(null);

    const formData = new FormData();
    formData.append("file", file);
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const endpoint = resourceType === 'video' ? '/api/video-uploader' : '/api/image-uploader';

    if (resourceType === 'video') {
        formData.append("title", file.name);
        formData.append("originalSize", file.size.toString());
    }

    try {
      const response = await fetch(endpoint, { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const publicId = data.data?.publicId || data.publicId;

      setUploadedFile({ publicId, resourceType });
      if (resourceType === 'image') {
        setSelectedSocial("Instagram Square (1:1)");
        setSelectedFormat("png");
      } else {
        setSelectedFormat("mp4");
        setSelectedSocial("");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!uploadedFile) return;
    const { publicId, resourceType } = uploadedFile;

    let downloadUrl = "";
    let downloadFilename = "";

    if (resourceType === 'image' && selectedSocial) {
        const transformation = socialFormats[selectedSocial];
        downloadUrl = getCldImageUrl({
            src: publicId,
            ...transformation,
            format: selectedFormat || 'png'
        });
        downloadFilename = `${selectedSocial.replace(/[^a-zA-Z0-9]/g, '_')}.${selectedFormat || 'png'}`;
    } else {
        downloadUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/f_${selectedFormat}/${publicId}.${selectedFormat}`;
        downloadFilename = `${publicId}.${selectedFormat}`;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const getPreviewProps = () => {
    if (uploadedFile?.resourceType === 'image' && selectedSocial) {
        const props = socialFormats[selectedSocial];
        if (props.width > MAX_PREVIEW_DIMENSION || props.height > MAX_PREVIEW_DIMENSION) {
            const aspectRatio = props.width / props.height;
            if (props.width > props.height) {
                return { ...props, width: MAX_PREVIEW_DIMENSION, height: Math.round(MAX_PREVIEW_DIMENSION / aspectRatio) };
            } else {
                return { ...props, height: MAX_PREVIEW_DIMENSION, width: Math.round(MAX_PREVIEW_DIMENSION * aspectRatio) };
            }
        }
        return props;
    }
    return { width: 500, height: 500, crop: "fill" as const, gravity: "auto" as const };
  }

  useEffect(() => {
    if (uploadedFile) {
        setIsTransforming(true);
    }
  }, [selectedSocial, selectedFormat, uploadedFile]);

  return (
    <div>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Media Converter</h1>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">1. Upload a File</h2>
            <div className="form-control">
              <input type="file" onChange={handleFileUpload} className="file-input file-input-bordered file-input-primary w-full" accept="image/*,video/*"/>
            </div>
            {isUploading && <progress className="progress progress-primary w-full mt-4"></progress>}
            
            {uploadedFile && (
              <div className="mt-6 space-y-6">
                <h2 className="card-title">2. Choose Your Format</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uploadedFile.resourceType === 'image' && (
                        <div className="form-control">
                            <label className="label"><span className="label-text">Social Media Preset</span></label>
                            <select className="select select-bordered w-full" value={selectedSocial} onChange={(e) => setSelectedSocial(e.target.value as SocialFormat)}>
                                {Object.keys(socialFormats).map((format) => <option key={format} value={format}>{format}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-control">
                        <label className="label"><span className="label-text">Convert to Format</span></label>
                        <select className="select select-bordered w-full" value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                            {availableFormats[uploadedFile.resourceType].map((format) => <option key={format.value} value={format.value}>{format.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">3. Preview</h3>
                  <div className="relative flex justify-center items-center p-4 bg-base-200 rounded-lg min-h-[300px]">
                    {isTransforming && (
                        <div className="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-50 z-10">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    )}
                    {uploadedFile.resourceType === 'image' ? (
                        <CldImage
                            key={`${selectedSocial}-${selectedFormat}`}
                            {...getPreviewProps()}
                            src={uploadedFile.publicId}
                            alt="Transformed Image"
                            onLoad={() => setIsTransforming(false)}
                        />
                    ) : (
                        <CldVideoPlayer 
                            width="500" 
                            height="300" 
                            src={uploadedFile.publicId} 
                            onMetadataLoad={() => setIsTransforming(false)} 
                        />
                    )}
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                    Download File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}