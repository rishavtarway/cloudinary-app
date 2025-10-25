import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes,
} from "@/lib/error-handler";
import { WorkspaceRole } from "@prisma/client"; // Import enum
import { hasWorkspaceAccess } from "@/lib/workspace-permissions";

// POST /api/workspaces/[workspaceId]/members - Add a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    const { workspaceId } = await params;
    if (!currentUserId) throw ErrorTypes.UNAUTHORIZED;

    // Ensure the current user is OWNER or EDITOR
    await hasWorkspaceAccess(currentUserId, workspaceId, ['OWNER', 'EDITOR']);

    const { email, role } = await request.json();

    if (!email || typeof email !== 'string') {
      throw new AppError("Email is required", 400, "VALIDATION_ERROR");
    }
    if (!role || !Object.values(WorkspaceRole).includes(role as WorkspaceRole)) {
        throw new AppError("Invalid role specified. Must be EDITOR or VIEWER.", 400, "VALIDATION_ERROR");
    }
    if (role === 'OWNER') {
        throw new AppError("Cannot assign OWNER role.", 400, "BAD_REQUEST");
    }

    // Find user by email via Clerk
    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });
    if (users.data.length === 0) {
      throw new AppError(`User with email "${email}" not found in Clerk`, 404, "USER_NOT_FOUND");
    }
    const targetClerkId = users.data[0].id;


     // Ensure the target user exists in our User table (they need to have logged in once)
     const targetUser = await prisma.user.findUnique({ where: { userId: targetClerkId } });
     if (!targetUser) {
         throw new AppError("User profile not found in our database. Ensure they have logged in at least once.", 404, "USER_NOT_FOUND");
     }

     // Prevent adding self again if already owner/member (handled by unique constraint, but good practice)
     const existingMembership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: targetClerkId, workspaceId: workspaceId } }
     });
     if (existingMembership) {
        throw new AppError("User is already a member of this workspace.", 400, "BAD_REQUEST");
     }

    // Create the membership
    const newMembership = await prisma.membership.create({
      data: {
        userId: targetClerkId,
        workspaceId: workspaceId,
        role: role as WorkspaceRole,
      },
      include: {
          user: { select: { userId: true } } // Include Clerk ID in response
      }
    });

     // Log action
     await prisma.activityLog.create({
        data: {
            action: 'MEMBER_ADDED',
            userId: currentUserId,
            workspaceId: workspaceId,
            details: { addedUserId: targetClerkId, assignedRole: role }
        }
     });

    return NextResponse.json(
      createSuccessResponse({ userId: newMembership.user.userId, role: newMembership.role }, "Member added successfully"),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding member:", error);
    const errorResponse = handleApiError(error);
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(errorResponse, { status });
  }
}