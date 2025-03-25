import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
console.log("Current NODE_ENV:", process.env.NODE_ENV);

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
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    // console.log(userId);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure Cloudinary credentials exist
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_SECRET_KEY
    ) {
      return NextResponse.json(
        { error: "Cloudinary credentials not found" },
        { status: 500 }
      );
    }

    // Extract form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const originalSize = formData.get("originalSize") as string | null;

    // console.log("formdata is ",file,title, description, originalSize);

    // Validate required fields
    if (!file || !title || !originalSize) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload video to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "video-upload",
            resource_type: "video",
            transformation: [{ quality: "auto", fetch_format: "mp4" }],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else if (!result) {
              console.error("Cloudinary result is undefined.");
              reject(new Error("Cloudinary upload returned undefined."));
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          }
        );
        // Write buffer to stream
        uploadStream.write(buffer);
        uploadStream.end();
      }
    );

    console.log("Cloudinary upload result:", result);

    // Ensure Cloudinary upload was successful
    if (!result || !result.public_id) {
      return NextResponse.json(
        { error: "Cloudinary upload failed" },
        { status: 500 }
      );
    }

    // Save video details in Prisma
    const videoData = {
      title,
      description: description || "",
      publicId: result.public_id,
      originalSize,
      compressedSize: String(result.bytes || 0),
      duration: result.duration || 0,
      userId, // Ensure this exists
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Attempting to save video with data:", videoData);

    const videos = await prisma.video.create({ data: videoData });

    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Error during video upload:", error);
  return NextResponse.json({ error: "Upload video failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
