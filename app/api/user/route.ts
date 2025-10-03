import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  createSuccessResponse,
  handleApiError,
  AppError,
} from "@/lib/error-handler";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { isSubscribed } = await request.json();

    const user = await prisma.user.upsert({
      where: { userId },
      update: { isSubscribed },
      create: { userId, isSubscribed },
    });

    return NextResponse.json(createSuccessResponse(user, "User updated successfully"));
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, {
      status: error instanceof AppError ? error.statusCode : 500,
    });
  }
}
