// app/api/libraries/[libraryId]/videos/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function POST(request: Request, { params }: { params: { libraryId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { videoId } = await request.json();

    const library = await prisma.library.update({
      where: { id: params.libraryId },
      data: {
        videos: {
          connect: { id: videoId },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(library, "Video added to library"));
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { libraryId: string; videoId: string } }
) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const library = await prisma.library.findFirst({
      where: { id: params.libraryId, ownerId },
    });

    if (!library) {
      throw new AppError("Library not found or you are not the owner", 404, "NOT_FOUND");
    }

    await prisma.library.update({
      where: { id: params.libraryId },
      data: {
        videos: {
          disconnect: { id: params.videoId },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(null, "Video removed successfully"));
  } catch (error) {
    console.error("Error removing video:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}