import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import {
  ErrorTypes,
  validateFileUpload,
  validateCloudinaryConfig,
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

// Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_SECRET_KEY!,
});

interface CloudinaryUploadResult {
  public_id: string;
  [key: string]: string | number | undefined;
}

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

    // Extract and validate file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Validate file (max 10MB for images)
    validateFileUpload(file, 10 * 1024 * 1024);

    // Convert file to buffer
    const bytes = await file!.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "next-cloudinary-upload",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(
                new AppError(
                  `Image upload failed: ${error.message}`,
                  502,
                  "CLOUDINARY_UPLOAD_FAILED"
                )
              );
            } else if (!result) {
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
        uploadStream.end(buffer);
      }
    );

    // Return success response
    const response = createSuccessResponse(
      { publicId: result.public_id },
      "Image uploaded successfully"
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}
