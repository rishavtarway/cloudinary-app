import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  ErrorTypes,
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(handleApiError(ErrorTypes.UNAUTHORIZED), {
        status: ErrorTypes.UNAUTHORIZED.statusCode,
      });
    }

    const videos = await prisma.video.findMany({ where: { userId } });

    const totalVideos = videos.length;

    const totalOriginalSize = videos.reduce(
      (acc, video) => acc + parseInt(video.originalSize, 10),
      0
    );
    const totalCompressedSize = videos.reduce(
      (acc, video) => acc + parseInt(video.compressedSize, 10),
      0
    );
    const totalDuration = videos.reduce(
      (acc, video) => acc + video.duration,
      0
    );
    const stats = {
      totalVideos,
      totalOriginalSize,
      totalCompressedSize,
      totalDuration,
    };

    const response = createSuccessResponse(
      stats,
      "User statistics fetched successfully"
    );
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
