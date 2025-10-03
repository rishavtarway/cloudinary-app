import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  ErrorTypes,
  validateFileUpload,
  validateCloudinaryConfig,
  validateRequiredFields,
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
  [key: string]: string | number | undefined;
}

// Add allowed video types
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

export async function POST(request: NextRequest) {

  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(handleApiError(ErrorTypes.UNAUTHORIZED), {
        status: ErrorTypes.UNAUTHORIZED.statusCode,
      });
    }

    // Validate Cloudinary configuration
    validateCloudinaryConfig();

    // Extract form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const originalSize = formData.get("originalSize") as string | null;

    // Validate required fields
    validateRequiredFields({ file, title, originalSize });

    // Validate file (max 60MB for videos)
    validateFileUpload(file, 60 * 1024 * 1024, ALLOWED_VIDEO_TYPES);

    // Convert file to buffer for Cloudinary upload
    const bytes = await file!.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload video to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "video-upload",
            resource_type: "video",
             // This is the updated part for AI optimization
            transformation: [{ quality: "auto:good", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(
                new AppError(
                  `Video upload failed: ${error.message}`,
                  502,
                  "CLOUDINARY_UPLOAD_FAILED"
                )
              );
            } else if (!result) {
              console.error("Cloudinary result is undefined.");
              reject(
                new AppError(
                  "Cloudinary upload returned no result",
                  502,
                  "CLOUDINARY_UPLOAD_FAILED"
                )
              );
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          }
        );
        uploadStream.write(buffer);
        uploadStream.end();
      }
    );

    console.log("Cloudinary upload result:", result);

    // Ensure Cloudinary upload was successful
    if (!result || !result.public_id) {
      throw new AppError(
        "Cloudinary upload failed - no public ID returned",
        502,
        "CLOUDINARY_UPLOAD_FAILED"
      );
    }

    // Save video details in Prisma
    const videoData = {
      title: title!,
      description: description || "",
      publicId: result.public_id,
      originalSize: originalSize!,
      compressedSize: String(result.bytes || 0),
      duration: result.duration || 0,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Attempting to save video with data:", videoData);

    const video = await prisma.video.create({ data: videoData });

    // Return success response
    const response = createSuccessResponse(
      video,
      "Video uploaded and saved successfully"
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error during video upload:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
