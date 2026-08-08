import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LeaveRequest, User, AuditLog, Notification, ManagerApproval } from "@/lib/models";
import { generateFormalAIEmail } from "@/lib/email_service";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId, managerId, comments } = body;

    if (!requestId || !managerId) {
      return NextResponse.json({ success: false, error: "requestId and managerId are required." }, { status: 400 });
    }

    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    // Deduct leave balance
    const employee = await User.findOne({ employeeId: request.employeeId });
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee profile not found." }, { status: 404 });
    }

    // Calculate requested days
    const duration = Math.round((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let balanceKey: "casualLeave" | "sickLeave" | "earnedLeave" = "casualLeave";
    if (request.leaveType.toLowerCase().includes("sick")) {
      balanceKey = "sickLeave";
    } else if (request.leaveType.toLowerCase().includes("earned") || request.leaveType.toLowerCase().includes("annual")) {
      balanceKey = "earnedLeave";
    }

    const currentBalance = employee.leaveBalance?.[balanceKey] ?? 8;
    const newBalance = Math.max(0, currentBalance - duration);

    // Update user balance
    await User.updateOne(
      { employeeId: request.employeeId },
      { $set: { [`leaveBalance.${balanceKey}`]: newBalance } }
    );

    // Update request status
    request.currentStatus = "Approved";
    await request.save();

    // Create Manager Approval entry
    await ManagerApproval.create({
      requestId: request._id.toString(),
      managerId,
      aiRecommendation: request.aiRecommendation || "Approve",
      decision: "Approved",
      comments: comments || "Approved."
    });

    // Create Audit Log
    await AuditLog.create({
      requestId: request._id.toString(),
      actor: managerId,
      action: "Approved Leave",
      details: `Approved ${request.leaveType} for ${request.employeeId}. Balance reduced to ${newBalance} days.`
    });

    // Generate Formal AI Email Notification for Employee
    const empName = employee ? employee.name : request.employeeId;
    const empEmail = employee ? employee.email : "employee@company.com";

    const aiEmail = await generateFormalAIEmail({
      employeeName: empName,
      employeeEmail: empEmail,
      workflowType: "Leave",
      action: "Approved",
      requestIdOrNumber: request.leaveNumber || request._id.toString(),
      details: `${request.leaveType} (${duration} Days: ${new Date(request.startDate).toLocaleDateString()} - ${new Date(request.endDate).toLocaleDateString()})`,
      managerComments: comments || "Approved."
    });

    // Create Notification with formal AI email
    await Notification.create({
      userId: request.employeeId,
      title: `✉️ ${aiEmail.subject}`,
      description: aiEmail.body,
      type: "Success"
    });

    return NextResponse.json({ success: true, request, email: aiEmail });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
