import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LeaveRequest, AuditLog } from "@/lib/models";
import { runLeaveWorkflow } from "@/lib/workflow";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId, responseText } = body;

    if (!requestId || !responseText) {
      return NextResponse.json({ success: false, error: "requestId and responseText are required." }, { status: 400 });
    }

    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    // Append clarification response to optional note or a history trace
    const oldNote = request.optionalNote || "";
    request.optionalNote = `${oldNote}\n\n[Clarification Response - ${new Date().toLocaleDateString()}]: ${responseText}`;
    request.currentStatus = "Submitted";
    await request.save();

    await AuditLog.create({
      requestId: request._id.toString(),
      actor: request.employeeId,
      action: "Submitted Clarification",
      details: `Responded: ${responseText}`
    });

    // Re-trigger leave AI orchestrator loop
    runLeaveWorkflow(request._id.toString());

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
