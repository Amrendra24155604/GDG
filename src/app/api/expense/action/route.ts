import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExpenseClaim, AuditLog, Notification, ManagerApproval, User } from "@/lib/models";
import { generateFormalAIEmail } from "@/lib/email_service";

// POST: Manager action for Expense Claim (Approve, Reject, Clarify, Payment Processed)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { claimId, managerId, action, comments, rejectionReason } = body;

    if (!claimId || !action) {
      return NextResponse.json({ success: false, error: "claimId and action are required." }, { status: 400 });
    }

    const claim = await ExpenseClaim.findById(claimId);
    if (!claim) {
      return NextResponse.json({ success: false, error: "Expense claim not found." }, { status: 404 });
    }

    let newStatus = claim.currentStatus;
    let auditAction = "";

    if (action === "Approve") {
      newStatus = "Payment Processing";
      auditAction = "Expense Approved by Manager";
    } else if (action === "Reject") {
      newStatus = "Rejected";
      auditAction = "Expense Rejected by Manager";
    } else if (action === "Clarify") {
      newStatus = "Clarification Requested";
      auditAction = "Manager Requested Expense Clarification";
    } else if (action === "CompletePayment") {
      newStatus = "Payment Completed";
      auditAction = "Finance Reimbursement Payment Completed";
    }

    const updatedClaim = await ExpenseClaim.findByIdAndUpdate(
      claimId,
      {
        currentStatus: newStatus,
        managerComments: comments || claim.managerComments,
        rejectionReason: rejectionReason || claim.rejectionReason
      },
      { new: true }
    );

    // Record Manager Approval / Decision entry
    await ManagerApproval.create({
      requestId: claimId,
      managerId: managerId || "EMP-002",
      aiRecommendation: claim.aiRecommendation || "APPROVE",
      decision: action,
      comments: comments || rejectionReason
    });

    // Record Audit Log
    await AuditLog.create({
      requestId: claimId,
      actor: managerId || "EMP-002",
      action: auditAction,
      details: `Action: ${action}. Status changed to ${newStatus}. ${comments ? `Comments: ${comments}` : ""}`
    });

    // Generate Formal AI Email Notification for Employee
    const empUser = await User.findOne({ employeeId: claim.employeeId });
    const empName = empUser ? empUser.name : claim.employeeId;
    const empEmail = empUser ? empUser.email : "employee@company.com";

    const emailActionMap: Record<string, "Approved" | "Rejected" | "Clarification Requested" | "Payment Completed"> = {
      Approve: "Approved",
      Reject: "Rejected",
      Clarify: "Clarification Requested",
      CompletePayment: "Payment Completed"
    };

    const aiEmail = await generateFormalAIEmail({
      employeeName: empName,
      employeeEmail: empEmail,
      workflowType: "Expense Reimbursement",
      action: emailActionMap[action] || "Approved",
      requestIdOrNumber: claim.claimNumber || claim._id.toString(),
      details: `${claim.expenseType} Reimbursement Claim (Amount: ₹${claim.amount?.toLocaleString()})`,
      managerComments: comments || rejectionReason || "Action taken by manager."
    });

    await Notification.create({
      userId: claim.employeeId,
      title: `✉️ ${aiEmail.subject}`,
      description: aiEmail.body,
      type: action === "Approve" || action === "CompletePayment" ? "Success" : action === "Clarify" ? "Alert" : "Info"
    });

    return NextResponse.json({
      success: true,
      message: `Expense claim status updated to ${newStatus}. Formal AI email generated.`,
      claim: updatedClaim,
      email: aiEmail
    });

  } catch (error: any) {
    console.error("Expense Action API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
