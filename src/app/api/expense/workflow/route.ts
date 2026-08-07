import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AIWorkflowLog } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ success: false, error: "requestId is required" }, { status: 400 });
    }

    const logs = await AIWorkflowLog.find({ requestId }).sort({ timestamp: 1 });
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
