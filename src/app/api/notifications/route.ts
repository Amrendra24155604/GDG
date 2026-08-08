import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId query parameter is required." }, { status: 400 });
    }

    // Find notifications for user or broadcast
    const notifications = await Notification.find({
      $or: [{ userId: userId }, { userId: "ALL" }]
    }).sort({ createdAt: -1 }).limit(30);

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
