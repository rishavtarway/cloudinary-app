import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const libraries = await prisma.library.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { id: userId } } }],
      },
      include: {
        owner: true,
        members: true,
        videos: true,
      },
    });
    return NextResponse.json(
      createSuccessResponse(libraries, "Libraries fetched successfully")
    );
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { name } = await request.json();

    const library = await prisma.library.create({
      data: {
        name,
        ownerId: userId,
      },
    });

    return NextResponse.json(
      createSuccessResponse(library, "Library created successfully")
    );
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}
