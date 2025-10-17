import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  ErrorTypes,
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

// Define a more flexible type for the search conditions
type SearchCondition = {
    [key in 'title' | 'description']?: { contains: string; mode: "insensitive" };
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(handleApiError(ErrorTypes.UNAUTHORIZED), {
        status: ErrorTypes.UNAUTHORIZED.statusCode,
      });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("search");

    // Use Prisma's generated types for better type safety
    const whereClause: {
      userId: string;
      OR?: SearchCondition[];
    } = { userId };

    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Fetch user's videos
    const videos = await prisma.video.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Return success response
    const response = createSuccessResponse(
      { videos },
      "Videos fetched successfully"
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching videos:", error);

    // Handle database errors specifically
    if (error instanceof Error && error.message.includes("prisma")) {
      const dbError = new AppError(
        "Failed to retrieve videos from database",
        500,
        "DATABASE_ERROR"
      );
      const errorResponse = handleApiError(dbError);
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
