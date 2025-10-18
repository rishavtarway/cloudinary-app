import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Await params
    const { libraryId } = await params;

    const { email } = await request.json();

    if (!email) {
      throw new AppError("Email is required", 400, "VALIDATION_ERROR");
    }

    const library = await prisma.library.findFirst({
      where: {
        id: libraryId,
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

    // Await the result of calling clerkClient() 
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

    // Check if the member is already in the library
    const isAlreadyMember = await prisma.library.findFirst({
        where: {
            id: libraryId,
            memberIDs: { has: member.id }
        }
    });

    if (isAlreadyMember) {
        throw new AppError(
            "User is already a member of this library.",
            400,
            "BAD_REQUEST"
        );
    }

    const updatedLibrary = await prisma.library.update({
      where: { id: libraryId },
      data: {
        members: {
          connect: { id: member.id },
        },
      },
    });

    return NextResponse.json(
      createSuccessResponse({ id: updatedLibrary.id, name: updatedLibrary.name }, "Member added successfully")
    );
  } catch (error) {
    console.error("Error adding member:", error);
    const errorResponse = handleApiError(error);
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(errorResponse, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Await params
    const { libraryId } = await params;

    const memberClerkId = request.nextUrl.searchParams.get("memberId");

     if (!memberClerkId) {
       throw new AppError("Member ID is required in query parameters", 400, "VALIDATION_ERROR");
     }

    const library = await prisma.library.findFirst({
      where: { id: libraryId, ownerId },
    });

    if (!library) {
      throw new AppError("Library not found or you are not the owner", 404, "NOT_FOUND");
    }

    const member = await prisma.user.findUnique({
      where: { userId: memberClerkId },
    });

    if (!member) {
      throw new AppError("Member not found", 404, "NOT_FOUND");
    }

    await prisma.library.update({
      where: { id: libraryId },
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
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(errorResponse, { status });
  }
}