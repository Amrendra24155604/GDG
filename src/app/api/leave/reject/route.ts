import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LeaveRequest, AuditLog, Notification, ManagerApproval, User } from "@/lib/models";
import { generateFormalAIEmail } from "@/lib/email_service";

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

    // Generate Formal AI Email Notification for Employee
    const empUser = await User.findOne({ employeeId: request.employeeId });
    const empName = empUser ? empUser.name : request.employeeId;
    const empEmail = empUser ? empUser.email : "employee@company.com";

    const aiEmail = await generateFormalAIEmail({
      employeeName: empName,
      employeeEmail: empEmail,
      workflowType: "Leave",
      action: decision === "Clarification Requested" ? "Clarification Requested" : "Rejected",
      requestIdOrNumber: request.leaveNumber || request._id.toString(),
      details: `${request.leaveType} (${new Date(request.startDate).toLocaleDateString()} - ${new Date(request.endDate).toLocaleDateString()})`,
      managerComments: comments || "Action taken by manager."
    });

    await Notification.create({
      userId: request.employeeId,
      title: `✉️ ${aiEmail.subject}`,
      description: aiEmail.body,
      type: decision === "Clarification Requested" ? "Alert" : "Info"
    });

    return NextResponse.json({ success: true, request, email: aiEmail });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
