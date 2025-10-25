// lib/workspace-permissions.ts
import { prisma } from "@/lib/prisma";
import { ErrorTypes } from "@/lib/error-handler";
import { WorkspaceRole, Workspace } from "@prisma/client";

/**
 * Checks if a user has the required role in a workspace.
 * Throws FORBIDDEN or NOT_FOUND error if access is denied or workspace doesn't exist.
 * Returns the workspace and the user's role if access is granted.
 */
export async function hasWorkspaceAccess(
    userId: string,
    workspaceId: string,
    requiredRoles: WorkspaceRole[]
): Promise<{ workspace: Workspace, role: WorkspaceRole }> {

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
            memberships: {
                where: { userId: userId },
                select: { role: true },
            },
        },
    });

    if (!workspace) {
        throw ErrorTypes.RECORD_NOT_FOUND; // Workspace not found
    }

    let userRole: WorkspaceRole | null = null;
    if (workspace.ownerId === userId) {
        userRole = WorkspaceRole.OWNER;
    } else if (workspace.memberships.length > 0) {
        userRole = workspace.memberships[0].role;
    }

    if (!userRole || !requiredRoles.includes(userRole)) {
        throw ErrorTypes.FORBIDDEN; // User does not have the required role
    }

    return { workspace, role: userRole };
}


/**
 * Checks if a user can access a video by checking their access to *any* workspace the video belongs to.
 * Throws FORBIDDEN or NOT_FOUND if access is denied or video doesn't exist.
 */
export async function hasWorkspaceAccessThroughVideo(
    userId: string,
    videoId: string,
    requiredRoles: WorkspaceRole[]
): Promise<void> {
     const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { workspaceIDs: true },
     });

     if (!video) {
        throw ErrorTypes.RECORD_NOT_FOUND; // Video not found
     }

     if (video.workspaceIDs.length === 0) {
         // Maybe only the uploader can access if not in any workspace? Or deny all?
         const originalUploader = await prisma.video.findUnique({ where: { id: videoId }, select: { userId: true } });
         if (originalUploader?.userId !== userId) {
             throw ErrorTypes.FORBIDDEN; // Or adjust logic as needed
         }
         return; // Allow uploader access if video isn't in a workspace
     }

     // Check if the user has required access in *at least one* of the workspaces
     const accessibleWorkspaceCount = await prisma.workspace.count({
        where: {
            id: { in: video.workspaceIDs },
            OR: [
                { ownerId: userId }, // User is the owner
                { memberships: { some: { userId: userId, role: { in: requiredRoles } } } } // User is a member with required role
            ]
        }
     });

     if (accessibleWorkspaceCount === 0) {
         throw ErrorTypes.FORBIDDEN; // User doesn't have access via any workspace
     }
}