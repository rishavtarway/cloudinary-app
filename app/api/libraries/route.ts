import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // First, find the user's internal ID from their Clerk ID
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      // This case should ideally not happen if users are created on first sign-in
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const libraries = await prisma.library.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { memberIDs: { has: user.id } }, // Correctly query the array of member IDs
        ],
      },
      include: {
        owner: {
          select: { userId: true }, // Select only non-sensitive user data
        },
        members: {
          select: { userId: true },
        },
        videos: {
          select: { id: true, title: true, publicId: true }, // Select only necessary video fields
        },
      },
    });

    return NextResponse.json(createSuccessResponse(libraries, "Libraries fetched successfully"));
  } catch (error) {
    console.error("Error fetching libraries:", error); // Added for better logging
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { name } = await request.json();

    if (!name) {
      throw new AppError("Library name is required", 400, "VALIDATION_ERROR");
    }

    const library = await prisma.library.create({
      data: {
        name,
        ownerId: userId,
      },
    });

    return NextResponse.json(createSuccessResponse(library, "Library created successfully"));
  } catch (error) {
    console.error("Error creating library:", error); // Added for better logging
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}
