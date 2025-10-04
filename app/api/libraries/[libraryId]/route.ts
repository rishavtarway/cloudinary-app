import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function DELETE(
  request: Request,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { userId: ownerId } = await auth();
    if (!ownerId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Find the library to ensure the current user is the owner before deleting
    const library = await prisma.library.findFirst({
      where: {
        id: params.libraryId,
        ownerId: ownerId,
      },
    });

    if (!library) {
      throw new AppError(
        "Library not found or you do not have permission to delete it",
        404,
        "NOT_FOUND"
      );
    }

    // Delete the library
    await prisma.library.delete({
      where: {
        id: params.libraryId,
      },
    });

    return NextResponse.json(createSuccessResponse(null, "Library deleted successfully"));
  } catch (error) {
    console.error("Error deleting library:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}