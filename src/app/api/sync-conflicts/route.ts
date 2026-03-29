export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = { status: "conflict" };

    const [conflicts, total] = await Promise.all([
      prisma.offlineSyncQueue.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          branch: {
            select: { id: true, name: true, tenant_id: true },
          },
        },
      }),
      prisma.offlineSyncQueue.count({ where }),
    ]);

    return NextResponse.json({
      conflicts,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List sync conflicts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, payload } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.offlineSyncQueue.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Sync queue entry not found" },
        { status: 404 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case "accept":
        updateData = {
          status: "synced",
          synced_at: new Date(),
        };
        break;
      case "reject":
        updateData = {
          status: "rejected",
          error: "Rejected by admin",
        };
        break;
      case "edit":
        if (!payload) {
          return NextResponse.json(
            { error: "payload is required for edit action" },
            { status: 400 }
          );
        }
        updateData = {
          status: "synced",
          payload,
          synced_at: new Date(),
        };
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: accept, reject, or edit" },
          { status: 400 }
        );
    }

    const conflict = await prisma.offlineSyncQueue.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ conflict });
  } catch (error) {
    console.error("Resolve sync conflict error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
