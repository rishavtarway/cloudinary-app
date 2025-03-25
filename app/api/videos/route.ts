import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth(); // Ensure this is awaited

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
        where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
        { message: "Videos fetched successfully", videos },
        { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
        { error: "Error while fetching videos" },
        { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
