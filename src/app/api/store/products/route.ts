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
    const category = searchParams.get("category") || "";
    const is_active = searchParams.get("is_active");

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (is_active === "true") {
      where.is_active = true;
    } else if (is_active === "false") {
      where.is_active = false;
    }

    const products = await prisma.storeProduct.findMany({
      where,
      orderBy: { sort_order: "asc" },
      include: {
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("List products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name_ar,
      name_en,
      description,
      price_usd,
      category,
      stock,
      sort_order,
      discount_pct,
      discount_ends_at,
    } = body;

    if (!name_ar || price_usd === undefined || !category) {
      return NextResponse.json(
        { error: "name_ar, price_usd, and category are required" },
        { status: 400 }
      );
    }

    const product = await prisma.storeProduct.create({
      data: {
        name_ar,
        name_en: name_en || null,
        description: description || null,
        price_usd,
        category,
        stock: stock ?? 0,
        sort_order: sort_order ?? 0,
        discount_pct: discount_pct ?? null,
        discount_ends_at: discount_ends_at
          ? new Date(discount_ends_at)
          : null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
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
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.storeProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.name_ar !== undefined) updateData.name_ar = data.name_ar;
    if (data.name_en !== undefined) updateData.name_en = data.name_en;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.price_usd !== undefined) updateData.price_usd = data.price_usd;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    if (data.discount_pct !== undefined)
      updateData.discount_pct = data.discount_pct;
    if (data.discount_ends_at !== undefined)
      updateData.discount_ends_at = data.discount_ends_at
        ? new Date(data.discount_ends_at)
        : null;

    const product = await prisma.storeProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
