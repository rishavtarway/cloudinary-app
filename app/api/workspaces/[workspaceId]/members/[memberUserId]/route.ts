import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes,
} from "@/lib/error-handler";
import { WorkspaceRole } from "@prisma/client";
import { hasWorkspaceAccess } from "@/lib/workspace-permissions";

// DELETE /api/workspaces/[workspaceId]/members/[memberUserId] - Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberUserId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    const { workspaceId, memberUserId: targetUserId } = await params;
    if (!currentUserId) throw ErrorTypes.UNAUTHORIZED;

    // Ensure the current user is OWNER or EDITOR
    const { workspace, role: currentUserRole } = await hasWorkspaceAccess(currentUserId, workspaceId, ['OWNER', 'EDITOR']);

     // Find the membership to be deleted
     const membershipToRemove = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
     });

     if (!membershipToRemove) {
        throw new AppError("Membership not found", 404, "NOT_FOUND");
     }

     // Prevent removing the owner
     if (membershipToRemove.role === 'OWNER' || workspace.ownerId === targetUserId) {
         throw new AppError("Cannot remove the workspace owner", 400, "BAD_REQUEST");
     }

     // Prevent editors from removing other editors or owners (only owners can do that)
     if (currentUserRole === 'EDITOR' && membershipToRemove.role !== 'VIEWER') {
        throw new AppError("Editors can only remove viewers", 403, "FORBIDDEN");
     }


    await prisma.membership.delete({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId: workspaceId } },
    });

    // Log action
     await prisma.activityLog.create({
        data: {
            action: 'MEMBER_REMOVED',
            userId: currentUserId,
            workspaceId: workspaceId,
            details: { removedUserId: targetUserId }
        }
     });

    return NextResponse.json(createSuccessResponse(null, "Member removed successfully"));
  } catch (error) {
    console.error("Error removing member:", error);
    const errorResponse = handleApiError(error);
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(errorResponse, { status });
  }
}

// PATCH /api/workspaces/[workspaceId]/members/[memberUserId] - Update member role
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; memberUserId: string }> }
) {
    try {
        const { userId: currentUserId } = await auth();
        const { workspaceId, memberUserId: targetUserId } = await params;
        if (!currentUserId) throw ErrorTypes.UNAUTHORIZED;

        // Only owners can change roles
        const { workspace } = await hasWorkspaceAccess(currentUserId, workspaceId, ['OWNER']);

        const { role: newRole } = await request.json();
        if (!newRole || !Object.values(WorkspaceRole).includes(newRole as WorkspaceRole) || newRole === 'OWNER') {
            throw new AppError("Invalid role specified. Must be EDITOR or VIEWER.", 400, "VALIDATION_ERROR");
        }

        // Find the membership to update
        const membershipToUpdate = await prisma.membership.findUnique({
            where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
        });

        if (!membershipToUpdate) {
            throw new AppError("Membership not found", 404, "NOT_FOUND");
        }

         // Prevent changing owner's role
        if (membershipToUpdate.role === 'OWNER' || workspace.ownerId === targetUserId) {
            throw new AppError("Cannot change the owner's role", 400, "BAD_REQUEST");
        }

        const updatedMembership = await prisma.membership.update({
            where: { userId_workspaceId: { userId: targetUserId, workspaceId: workspaceId } },
            data: { role: newRole as WorkspaceRole },
             include: { user: { select: { userId: true } } }
        });

        // Log action
         await prisma.activityLog.create({
            data: {
                action: 'MEMBER_ROLE_UPDATED',
                userId: currentUserId,
                workspaceId: workspaceId,
                details: { targetUserId: targetUserId, newRole: newRole }
            }
         });

        return NextResponse.json(createSuccessResponse({ userId: updatedMembership.user.userId, role: updatedMembership.role }, "Member role updated successfully"));

    } catch (error) {
        console.error("Error updating member role:", error);
        const errorResponse = handleApiError(error);
        const status = error instanceof AppError ? error.statusCode : 500;
        return NextResponse.json(errorResponse, { status });
    }
}