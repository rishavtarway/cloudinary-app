import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes,
} from "@/lib/error-handler";
import bcrypt from 'bcryptjs'; // For password hashing
import { hasWorkspaceAccess } from "@/lib/workspace-permissions";

// POST /api/share-links - Create a share link for a video or workspace
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    const { resourceId, resourceType, expiresAt, password } = await request.json();

    if (!resourceId || !resourceType || (resourceType !== 'video' && resourceType !== 'workspace')) {
      throw new AppError("Valid resourceId and resourceType ('video' or 'workspace') are required", 400, "VALIDATION_ERROR");
    }

    // --- Permission Check ---
    if (resourceType === 'video') {
        const video = await prisma.video.findUnique({ where: { id: resourceId }, select: { userId: true }});
        if (!video) throw ErrorTypes.RECORD_NOT_FOUND;
        // Basic check: Only the uploader can share for now. Expand if needed.
        if (video.userId !== userId) throw ErrorTypes.FORBIDDEN;
    } else { // resourceType === 'workspace'
         // Need at least EDITOR access to create a share link for a workspace
         await hasWorkspaceAccess(userId, resourceId, ['OWNER', 'EDITOR']);
    }
    // --- End Permission Check ---


    let passwordHash: string | null = null;
    if (password && typeof password === 'string' && password.length > 0) {
      passwordHash = await bcrypt.hash(password, 10); // Hash the password
    }

    const shareLink = await prisma.shareLink.create({
      data: {
        resourceId,
        resourceType,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        passwordHash,
      },
    });

    // Log action (consider adding to workspace activity if applicable)
     if (resourceType === 'workspace') {
        await prisma.activityLog.create({
            data: { action: 'SHARE_LINK_CREATED', userId: userId, workspaceId: resourceId, details: { linkId: shareLink.id } }
        });
     }


    // Return the token, not the full object potentially including password hash
    return NextResponse.json(createSuccessResponse({ token: shareLink.token }, "Share link created successfully"), { status: 201 });
  } catch (error) {
    console.error("Error creating share link:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: error instanceof AppError ? error.statusCode : 500 });
  }
}