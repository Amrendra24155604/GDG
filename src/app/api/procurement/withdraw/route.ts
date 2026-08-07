import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProcurementRequest, AuditLog, Notification } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "requestId is required." },
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

    const validPendingStatuses = ["Submitted", "AI Processing", "Pending Manager"];
    if (!validPendingStatuses.includes(request.currentStatus)) {
      return NextResponse.json(
        { success: false, error: `Only pending requests can be withdrawn. Current status is '${request.currentStatus}'.` },
        { status: 400 }
      );
    }

    // Update status to Withdrawn
    request.currentStatus = "Withdrawn";
    await request.save();

    // Create Audit Log
    await AuditLog.create({
      requestId: request._id,
      actor: request.employeeId,
      action: "Request Withdrawn",
      details: `Employee ${request.employeeId} withdrew request ${request.requestNumber} for ${request.itemName}.`
    });

    // Create Notification
    await Notification.create({
      userId: request.employeeId,
      title: "Request Withdrawn",
      description: `Your request ${request.requestNumber} for ${request.itemName} has been successfully withdrawn.`,
      type: "Info"
    });

    // Also notify the manager if it was pending manager
    if (request.managerId) {
      await Notification.create({
        userId: request.managerId,
        title: "Request Withdrawn by Employee",
        description: `Request ${request.requestNumber} for ${request.itemName} was withdrawn by the employee.`,
        type: "Info"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Request withdrawn successfully.",
      request
    });

  } catch (error: any) {
    console.error("Withdraw API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
