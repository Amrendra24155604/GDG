import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProcurementRequest, ManagerApproval, AuditLog, Notification, User } from "@/lib/models";
import { generateFormalAIEmail } from "@/lib/email_service";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId, managerId, decision, comments } = body; // decision: "Rejected" or "Clarification Requested"

    if (!requestId || !managerId || !decision) {
      return NextResponse.json(
        { success: false, error: "requestId, managerId and decision are required." },
        { status: 400 }
      );
    }

    const request = await ProcurementRequest.findById(requestId);
    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 }
      );
    }

    let nextStatus = "Rejected";
    let actionLabel = "Manager Rejected";
    let notificationTitle = "Request Rejected";
    let notificationType = "Alert";

    if (decision === "Clarification Requested") {
      nextStatus = "Pending Manager"; // Awaiting clarification but remains in manager queue or can be marked as "Clarification"
      // Wait, let's keep status as "Pending Manager" or map it back to "Submitted"
      // Let's use "Pending Manager" but change some state so employee sees clarification.
      actionLabel = "Clarification Requested";
      notificationTitle = "Clarification Required";
      notificationType = "Info";
    }

    // 1. Update Request status
    request.currentStatus = nextStatus;
    // Save comments/clarification request inside request's database notes or recommendation summary
    if (decision === "Clarification Requested") {
      request.justification = `${request.justification} (Clarification requested: "${comments}")`;
    }
    await request.save();

    // 2. Create ManagerApproval log
    await ManagerApproval.create({
      requestId,
      managerId,
      aiRecommendation: request.aiRecommendation || "Approve",
      decision,
      comments: comments || "Action taken by manager."
    });

    // 3. Create AuditLog entry
    await AuditLog.create({
      requestId,
      actor: managerId,
      action: actionLabel,
      details: `Manager ${managerId} updated request status. Comments: ${comments || "None"}`
    });

    // 4. Generate Formal AI Email Notification for Employee
    const empUser = await User.findOne({ employeeId: request.employeeId });
    const empName = empUser ? empUser.name : request.employeeId;
    const empEmail = empUser ? empUser.email : "employee@company.com";

    const aiEmail = await generateFormalAIEmail({
      employeeName: empName,
      employeeEmail: empEmail,
      workflowType: "Procurement",
      action: decision === "Clarification Requested" ? "Clarification Requested" : "Rejected",
      requestIdOrNumber: request.requestNumber || request._id.toString(),
      details: `${request.quantity}x ${request.itemName} (Estimated Cost: ₹${request.estimatedCost?.toLocaleString()})`,
      managerComments: comments || "Action taken by manager."
    });

    await Notification.create({
      userId: request.employeeId,
      title: `✉️ ${aiEmail.subject}`,
      description: aiEmail.body,
      type: notificationType
    });

    return NextResponse.json({
      success: true,
      message: `Request status updated to ${nextStatus} (${decision}). Formal AI email generated.`,
      request,
      email: aiEmail
    });

  } catch (error: any) {
    console.error("Reject API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
