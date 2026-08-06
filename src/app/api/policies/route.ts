import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProcurementPolicy } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const policies = await ProcurementPolicy.find({});
    return NextResponse.json({ success: true, policies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
