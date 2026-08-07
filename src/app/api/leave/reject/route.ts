import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LeaveRequest, AuditLog, Notification, ManagerApproval } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId, managerId, decision, comments } = body;

    if (!requestId || !managerId || !decision) {
      return NextResponse.json({ success: false, error: "requestId, managerId, and decision are required." }, { status: 400 });
    }

    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    if (decision === "Clarification Requested") {
      request.currentStatus = "Clarification Requested";
    } else {
      request.currentStatus = "Rejected";
    }
    await request.save();

    // Create Manager Approval entry
    await ManagerApproval.create({
      requestId: request._id.toString(),
      managerId,
      aiRecommendation: request.aiRecommendation || "Need Review",
      decision,
      comments: comments || "Action taken by manager."
    });

    // Create Audit Log
    await AuditLog.create({
      requestId: request._id.toString(),
      actor: managerId,
      action: decision,
      details: `${decision}: ${comments}`
    });

    // Notify employee
    await Notification.create({
      userId: request.employeeId,
      title: decision === "Clarification Requested" ? "❓ Leave Clarification Needed" : "❌ Leave Request Rejected",
      description: decision === "Clarification Requested" 
        ? `Manager requested clarification: "${comments}"`
        : `Your leave request (${request.leaveType}) has been rejected: "${comments}"`,
      type: decision === "Clarification Requested" ? "Alert" : "Info"
    });

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
