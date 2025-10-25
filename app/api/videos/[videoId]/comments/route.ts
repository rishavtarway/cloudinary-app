import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes
} from "@/lib/error-handler";
import { hasWorkspaceAccessThroughVideo } from "@/lib/workspace-permissions"; // Assume helper

// Add this GET handler 
export async function GET(
  request: Request, // Added request parameter
  { params }: { params: { videoId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    const { videoId } = params;

    // Permission Check: User needs access to the workspace containing the video
    await hasWorkspaceAccessThroughVideo(userId, videoId, ['OWNER', 'EDITOR', 'VIEWER']);
    

    const comments = await prisma.comment.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { userId: true } } // Include Clerk user ID
      }
    });

    return NextResponse.json(createSuccessResponse(comments, "Comments fetched successfully"));

  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } } // Adjusted params type
) {
  try {
    const { userId } = await auth();
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    const { videoId } = params; // Directly access videoId

    // Permission Check: User needs access to the workspace containing the video
     await hasWorkspaceAccessThroughVideo(userId, videoId, ['OWNER', 'EDITOR', 'VIEWER']);

    const { text, timestamp } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new AppError("Comment text is required", 400, "VALIDATION_ERROR");
    }
    if (timestamp !== undefined && typeof timestamp !== 'number') {
         throw new AppError("Timestamp must be a number (seconds)", 400, "VALIDATION_ERROR");
    }

    // Basic mention parsing (simple example, enhance as needed)
    // const mentionedUserIds = text.match(/@([\w.-]+)/g)?.map(mention => mention.substring(1)) || [];
    // Here you might want to validate these mentions against Clerk users

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        timestamp: timestamp ?? null, // Store null if not provided
        userId, // Clerk User ID
        videoId,
      },
       include: {
          user: { select: { userId: true } } // Include Clerk ID in response
       }
    });

     // Log action in relevant workspace(s)
     const videoWorkspaces = await prisma.video.findUnique({ where: { id: videoId }, select: { workspaceIDs: true }});
     if (videoWorkspaces?.workspaceIDs) {
        for (const workspaceId of videoWorkspaces.workspaceIDs) {
            await prisma.activityLog.create({
                data: { action: 'COMMENT_POSTED', userId: userId, workspaceId: workspaceId, details: { videoId: videoId, commentId: comment.id } }
            });
        }
     }


    return NextResponse.json(
      createSuccessResponse(comment, "Comment created successfully"), { status: 201 }
    );
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}