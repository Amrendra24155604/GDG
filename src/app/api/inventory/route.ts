import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Asset } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const assets = await Asset.find({});
    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
