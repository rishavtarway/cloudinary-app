// IMPORTANT: This route should NOT use clerkMiddleware or auth() as it's public facing
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, AppError, ErrorTypes, createSuccessResponse } from "@/lib/error-handler";
import bcrypt from 'bcryptjs';

// GET /api/public/share/[token] - Fetch shared resource details (handles password check via POST)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    let token ='';
    try {
        token = (await params).token;
        if (!token) throw new AppError("Token is required", 400);

        const shareLink = await prisma.shareLink.findUnique({ where: { token } });

        if (!shareLink) throw ErrorTypes.RECORD_NOT_FOUND;

        // Check expiry
        if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
            throw new AppError("This link has expired", 410, "GONE"); // 410 Gone
        }

        // If password protected, don't return data, just indicate password needed
        if (shareLink.passwordHash) {
            return NextResponse.json(createSuccessResponse({ requiresPassword: true }, "Password required"));
        }

        // Increment view count (consider debouncing or background job for high traffic)
        await prisma.shareLink.update({
            where: { id: shareLink.id },
            data: { viewCount: { increment: 1 } },
        });

        // Fetch the actual resource based on type
        let resourceData;
        if (shareLink.resourceType === 'video') {
            resourceData = await prisma.video.findUnique({
                where: { id: shareLink.resourceId },
                select: { title: true, description: true, publicId: true, duration: true, createdAt: true } // Select public fields
            });
        } else if (shareLink.resourceType === 'workspace') {
            resourceData = await prisma.workspace.findUnique({
                where: { id: shareLink.resourceId },
                select: {
                    name: true,
                    videos: { select: { title: true, publicId: true, duration: true } } // Select public fields
                }
            });
        }

        if (!resourceData) throw ErrorTypes.RECORD_NOT_FOUND; // Resource might have been deleted

        return NextResponse.json(createSuccessResponse(resourceData, "Resource fetched successfully"));

    } catch (error) {
        console.error(`Error fetching public share link ${token}:`, error);
        const errorResponse = handleApiError(error);
        return NextResponse.json(errorResponse, { status: error instanceof AppError ? error.statusCode : 500 });
    }
}


// POST /api/public/share/[token] - Verify password and fetch resource
export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    let token ='';
     try {
        token = (await params).token;
        if (!token) throw new AppError("Token is required", 400);

        const { password } = await request.json();
        if (!password) throw new AppError("Password is required", 400);


        const shareLink = await prisma.shareLink.findUnique({ where: { token } });

        if (!shareLink) throw ErrorTypes.RECORD_NOT_FOUND;
        if (!shareLink.passwordHash) throw new AppError("This link is not password protected", 400);

        // Check expiry
        if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
            throw new AppError("This link has expired", 410, "GONE");
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, shareLink.passwordHash);
        if (!passwordMatch) {
            throw new AppError("Incorrect password", 401, "UNAUTHORIZED");
        }

        // Increment view count
        await prisma.shareLink.update({
            where: { id: shareLink.id },
            data: { viewCount: { increment: 1 } },
        });

        // Fetch the resource (same logic as GET)
        let resourceData;
        if (shareLink.resourceType === 'video') {
            resourceData = await prisma.video.findUnique({
                where: { id: shareLink.resourceId },
                select: { title: true, description: true, publicId: true, duration: true, createdAt: true }
            });
        } else if (shareLink.resourceType === 'workspace') {
            resourceData = await prisma.workspace.findUnique({
                where: { id: shareLink.resourceId },
                select: { name: true, videos: { select: { title: true, publicId: true, duration: true } } }
            });
        }

        if (!resourceData) throw ErrorTypes.RECORD_NOT_FOUND;

        return NextResponse.json(createSuccessResponse(resourceData, "Resource fetched successfully"));

    } catch (error) {
        console.error(`Error verifying password for share link ${token}:`, error);
        const errorResponse = handleApiError(error);
        return NextResponse.json(errorResponse, { status: error instanceof AppError ? error.statusCode : 500 });
    }
}