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