import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function POST(
  request: Request,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { email } = await request.json();

    if (!email) {
      throw new AppError("Email is required", 400, "VALIDATION_ERROR");
    }

    const library = await prisma.library.findFirst({
      where: {
        id: params.libraryId,
        ownerId: ownerId,
      },
    });

    if (!library) {
      throw new AppError(
        "Library not found or you are not the owner",
        404,
        "NOT_FOUND"
      );
    }

    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });

    if (users.data.length === 0) {
      throw new AppError(
        `User with email "${email}" not found`,
        404,
        "USER_NOT_FOUND"
      );
    }

    const memberClerkId = users.data[0].id;

    const member = await prisma.user.findUnique({
      where: { userId: memberClerkId },
    });

    if (!member) {
      throw new AppError(
        "User not found in our database. Make sure they have logged in at least once.",
        404,
        "USER_NOT_FOUND"
      );
    }

    // Prevent adding the owner as a member again
    if (library.ownerId === member.userId) {
      throw new AppError(
        "The owner is already a member of the library.",
        400,
        "BAD_REQUEST"
      );
    }

    const updatedLibrary = await prisma.library.update({
      where: { id: params.libraryId },
      data: {
        members: {
          connect: { id: member.id },
        },
      },
    });

    return NextResponse.json(
      createSuccessResponse(updatedLibrary, "Member added successfully")
    );
  } catch (error) {
    console.error("Error adding member:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { libraryId: string; memberId: string } }
) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const library = await prisma.library.findFirst({
      where: { id: params.libraryId, ownerId },
    });

    if (!library) {
      throw new AppError("Library not found or you are not the owner", 404, "NOT_FOUND");
    }

    // Find the member by their Clerk User ID to get their internal DB ID
    const member = await prisma.user.findUnique({
      where: { userId: params.memberId },
    });

    if (!member) {
      throw new AppError("Member not found", 404, "NOT_FOUND");
    }

    // Disconnect the member from the library
    await prisma.library.update({
      where: { id: params.libraryId },
      data: {
        members: {
          disconnect: { id: member.id },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(null, "Member removed successfully"));
  } catch (error) {
    console.error("Error removing member:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}