import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes, 
} from "@/lib/error-handler";
import { hasWorkspaceAccess } from "@/lib/workspace-permissions";


export async function POST(
  request: Request,
  { params }: { params: { workspaceId: string } } 
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw ErrorTypes.UNAUTHORIZED; 
    }

    const { workspaceId } = params; 

    // Permission Check: Ensure user can edit the workspace 
    await hasWorkspaceAccess(userId, workspaceId, ['OWNER', 'EDITOR']);


    const { videoId } = await request.json();
    if (!videoId) {
        throw new AppError("videoId is required in the request body", 400, "VALIDATION_ERROR");
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        videos: {
          connect: { id: videoId }, 
        },
        activityLog: {
            create: {
                action: 'VIDEO_ADDED_TO_WORKSPACE',
                userId: userId,
                details: { videoId: videoId }
            }
        }
      },
      include: { // Include necessary fields in the response if needed
        videos: { where: { id: videoId }, select: { id: true, title: true } }
      }
    });

    return NextResponse.json(createSuccessResponse(updatedWorkspace, "Video added to workspace successfully"));
  } catch (error) {
    console.error(`Error adding video to workspace ${params.workspaceId}:`, error); 
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { workspaceId: string } } 
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw ErrorTypes.UNAUTHORIZED;
    }

    const { workspaceId } = params; // Use correct param name

    await hasWorkspaceAccess(userId, workspaceId, ['OWNER', 'EDITOR']);


    const { videoId } = await request.json(); // Assuming videoId is in the body
     if (!videoId) {
        throw new AppError("videoId is required in the request body", 400, "VALIDATION_ERROR");
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        videos: {
          disconnect: { id: videoId }, 
        },
         
         activityLog: {
            create: {
                action: 'VIDEO_REMOVED_FROM_WORKSPACE',
                userId: userId,
                details: { videoId: videoId }
            }
         }
      },
    });

    return NextResponse.json(createSuccessResponse(null, "Video removed from workspace successfully"));
  } catch (error) {
    console.error(`Error removing video from workspace ${params.workspaceId}:`, error); // Log with context
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}