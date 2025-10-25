import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
  ErrorTypes,
} from "@/lib/error-handler";

// GET /api/workspaces - Fetch workspaces user owns or is a member of
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId: userId } } },
        ],
      },
      include: {
        owner: { select: { userId: true } }, // Select non-sensitive data
        memberships: {
          include: {
            user: { select: { userId: true } },
          },
        },
        _count: { // Count videos efficiently
          select: { videos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add role information to the response for easier frontend use
    const workspacesWithRoles = workspaces.map(ws => {
      const membership = ws.memberships.find(m => m.userId === userId);
      const role = ws.ownerId === userId ? 'OWNER' : membership?.role;

      const { memberships, ...rest } = ws; // Exclude detailed memberships array from main response if not needed
      return { ...rest, userRole: role, videoCount: ws._count.videos, memberCount: memberships.length + 1 }; // +1 for owner
    });


    return NextResponse.json(createSuccessResponse(workspacesWithRoles, "Workspaces fetched successfully"));
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) throw ErrorTypes.UNAUTHORIZED;

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError("Workspace name is required", 400, "VALIDATION_ERROR");
    }

    // Find the internal User record
     const user = await prisma.user.findUnique({ where: { userId } });
     if (!user) {
         // This assumes users are created on first login via webhook or another mechanism
         throw new AppError("User profile not found", 404, "USER_NOT_FOUND");
     }


    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        // Automatically add the owner as a member with OWNER role
        memberships: {
          create: {
            userId: userId,
            role: 'OWNER',
          },
        },
        // Log creation
         activityLog: {
            create: {
                action: 'WORKSPACE_CREATED',
                userId: userId,
            }
         }
      },
       include: {
           owner: { select: { userId: true } },
           memberships: { include: { user: { select: { userId: true } } } },
            _count: { select: { videos: true } },
       }
    });

     // Format response similarly to GET
     const role = 'OWNER';
     const { memberships, ...rest } = workspace;
     const responseData = { ...rest, userRole: role, videoCount: workspace._count.videos, memberCount: memberships.length };


    return NextResponse.json(createSuccessResponse(responseData, "Workspace created successfully"), { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}