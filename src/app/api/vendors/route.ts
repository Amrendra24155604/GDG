import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const vendors = await Vendor.find({});
    return NextResponse.json({ success: true, vendors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
