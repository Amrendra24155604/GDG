import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LeaveRequest, AuditLog } from "@/lib/models";
import { runLeaveWorkflow } from "@/lib/workflow";

export async function GET() {
  try {
    await connectDB();
    const requests = await LeaveRequest.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { employeeId, managerId, leaveType, startDate, endDate, reason, halfDay, optionalNote } = body;

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const count = await LeaveRequest.countDocuments();
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const leaveNumber = `LR-2026-${count + 1}-${uniqueSuffix}`;

    const newRequest = await LeaveRequest.create({
      leaveNumber,
      employeeId,
      managerId: managerId || "EMP-002",
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      halfDay: !!halfDay,
      optionalNote,
      currentStatus: "Submitted"
    });

    await AuditLog.create({
      requestId: newRequest._id.toString(),
      actor: employeeId,
      action: "Leave Submitted",
      details: `Submitted ${leaveType} from ${startDate} to ${endDate}.`
    });

    // Run leave agentic pipeline in background
    runLeaveWorkflow(newRequest._id.toString());

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
