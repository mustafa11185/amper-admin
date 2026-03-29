import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { body: replyBody } = body;

    if (!replyBody) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticket_id: id,
        author_id: (session.user as any).id || "system",
        author_type: "company_user",
        body: replyBody,
      },
    });

    // Update ticket status to "in_progress" if it was "open"
    if (ticket.status === "open") {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "in_progress" },
      });
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error("Create reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
