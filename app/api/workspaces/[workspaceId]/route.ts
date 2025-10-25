import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes,
} from "@/lib/error-handler";
import { hasWorkspaceAccess } from "@/lib/workspace-permissions"; // Assume this helper exists

// GET /api/workspaces/[workspaceId] - Get details for a single workspace
export async function GET(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    const { workspaceId } = params;
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    const { workspace, role } = await hasWorkspaceAccess(userId, workspaceId, ['OWNER', 'EDITOR', 'VIEWER']); // Check if user has any access

    // Include videos, members, etc.
    const workspaceDetails = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
            owner: { select: { userId: true } },
            memberships: {
                include: { user: { select: { userId: true } } },
                orderBy: { createdAt: 'asc' },
            },
            videos: {
                orderBy: { createdAt: 'desc' },
                select: { id: true, title: true, publicId: true, createdAt: true, duration: true } // Select necessary fields
            },
            // Include recent activity logs if needed
            // activityLog: { take: 10, orderBy: { timestamp: 'desc' }, include: { user: { select: { userId: true } } } }
        }
    });

    if (!workspaceDetails) throw ErrorTypes.RECORD_NOT_FOUND;


     // Format response
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
     const { memberships, ...rest } = workspaceDetails;
     const responseData = {
        ...rest,
        userRole: role, // Role of the current requesting user
        members: memberships.map(m => ({ userId: m.user.userId, role: m.role })), // Simplified members list
     };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
     console.error(`Error fetching workspace ${params.workspaceId}:`, error);
     const errorResponse = handleApiError(error);
     return NextResponse.json(errorResponse, { status: error instanceof AppError ? error.statusCode : 500 });
  }
}


// DELETE /api/workspaces/[workspaceId] - Delete a workspace (Owner only)
export async function DELETE(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    const { workspaceId } = params;
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    // Ensure the user is the OWNER
     await hasWorkspaceAccess(userId, workspaceId, ['OWNER']);

    // Use transaction for safety
    await prisma.$transaction(async (tx) => {
        // Delete related data first
        await tx.activityLog.deleteMany({ where: { workspaceId } });
        await tx.membership.deleteMany({ where: { workspaceId } });
        await tx.shareLink.deleteMany({ where: { resourceId: workspaceId, resourceType: 'workspace' } });
        // Videos are not deleted, just disconnected. Add deletion logic if required.

        // Delete the workspace
        await tx.workspace.delete({ where: { id: workspaceId } });
    });


    return NextResponse.json(createSuccessResponse(null, "Workspace deleted successfully"));
  } catch (error) {
    console.error(`Error deleting workspace ${params.workspaceId}:`, error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: error instanceof AppError ? error.statusCode : 500 });
  }
}

// PATCH /api/workspaces/[workspaceId] - Update workspace details (Owner/Editor only)
export async function PATCH(
    request: Request,
    { params }: { params: { workspaceId: string } }
) {
    try {
        const { userId } = await auth();
        const { workspaceId } = params;
        if (!userId) throw ErrorTypes.UNAUTHORIZED;

        // Ensure OWNER or EDITOR access
        await hasWorkspaceAccess(userId, workspaceId, ['OWNER', 'EDITOR']);

        const { name } = await request.json();
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new AppError("Workspace name cannot be empty", 400, "VALIDATION_ERROR");
        }

        const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { name: name.trim() },
        });

         // Log update action
         await prisma.activityLog.create({
            data: {
                action: 'WORKSPACE_UPDATED',
                userId: userId,
                workspaceId: workspaceId,
                details: { oldName: /* fetch if needed */ undefined, newName: name.trim() }
            }
         });

        return NextResponse.json(createSuccessResponse(updatedWorkspace, "Workspace updated successfully"));

    } catch (error) {
        console.error(`Error updating workspace ${params.workspaceId}:`, error);
        const errorResponse = handleApiError(error);
        return NextResponse.json(errorResponse, { status: error instanceof AppError ? error.statusCode : 500 });
    }
}