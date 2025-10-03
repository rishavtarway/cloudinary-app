"use client";
import React, { useState, useEffect, useRef } from "react";
import { CldImage, CldVideoPlayer } from "next-cloudinary";

const availableFormats = {
  // Video formats
  video: [
    { name: "MP4", value: "mp4" },
    { name: "WebM", value: "webm" },
    { name: "AVI", value: "avi" },
    { name: "MOV", value: "mov" },
  ],
  // Image formats
  image: [
    { name: "PNG", value: "png" },
    { name: "JPG", value: "jpg" },
    { name: "WebP", value: "webp" },
    { name: "GIF", value: "gif" },
  ],
};

export default function MediaConverter() {
  const [uploadedFile, setUploadedFile] = useState<{ publicId: string; resourceType: 'image' | 'video' } | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const endpoint = resourceType === 'video' ? '/api/video-uploader' : '/api/image-uploader';

     // Add necessary fields for video upload
     if (resourceType === 'video') {
        formData.append("title", file.name);
        formData.append("originalSize", file.size.toString());
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      // Handle different response structures between video and image uploads
      const publicId = data.data?.publicId || data.publicId;

      setUploadedFile({ publicId, resourceType });
      setSelectedFormat(resourceType === 'video' ? 'mp4' : 'png');

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
    const downloadUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${publicId}.${selectedFormat}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${publicId}.${selectedFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Media Format Converter
        </h1>

        <div className="card">
          <div className="card-body">
            <h2 className="card-title mb-4">Upload a File</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Choose an image or video file</span>
              </label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="file-input file-input-bordered file-input-primary w-full"
                accept="image/*,video/*"
              />
            </div>

            {isUploading && (
              <div className="mt-4">
                <progress className="progress progress-primary w-full"></progress>
              </div>
            )}

            {uploadedFile && (
              <div className="mt-6">
                <h2 className="card-title mb-4">Select Output Format</h2>
                <div className="form-control">
                  <select
                    className="select select-bordered w-full"
                    value={selectedFormat}
                    onChange={(e) =>
                      setSelectedFormat(e.target.value)
                    }
                  >
                    {availableFormats[uploadedFile.resourceType].map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 relative">
                  <h3 className="text-lg font-semibold mb-2">Preview:</h3>
                  <div className="flex justify-center">
                    {uploadedFile.resourceType === 'image' ? (
                        <CldImage
                            width="500"
                            height="500"
                            src={uploadedFile.publicId}
                            sizes="100vw"
                            alt="Transformed Image"
                        />
                    ) : (
                        <CldVideoPlayer
                            width="500"
                            height="500"
                            src={uploadedFile.publicId}
                        />
                    )}
                  </div>
                </div>

                <div className="card-actions justify-end mt-6">
                  <button className="btn btn-primary" onClick={handleDownload}>
                    Download as {selectedFormat.toUpperCase()}
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