import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const comments = await prisma.comment.findMany({
      where: { videoId: params.videoId },
      include: {
        user: {
          select: { userId: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      createSuccessResponse(comments, "Comments fetched successfully")
    );
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { text } = await request.json();

    if (!text) {
      throw new AppError("Comment text is required", 400, "VALIDATION_ERROR");
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        userId,
        videoId: params.videoId,
      },
    });

    return NextResponse.json(
      createSuccessResponse(comment, "Comment created successfully")
    );
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}