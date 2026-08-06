import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProcurementRequest, AuditLog } from "@/lib/models";
import { runProcurementWorkflow } from "@/lib/workflow";

// GET: List all procurement requests
export async function GET() {
  try {
    await connectDB();
    const requests = await ProcurementRequest.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new procurement request
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      employeeId,
      managerId,
      itemName,
      quantity,
      justification,
      priority,
      preferredVendor,
      estimatedCost
    } = body;

    if (!employeeId || !itemName) {
      return NextResponse.json(
        { success: false, error: "employeeId and itemName are required fields." },
        { status: 400 }
      );
    }

    // Generate unique request number (e.g. PR-2026-98765)
    const count = await ProcurementRequest.countDocuments();
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestNumber = `PR-2026-${count + 1}-${uniqueSuffix}`;

    const newRequest = await ProcurementRequest.create({
      requestNumber,
      employeeId,
      managerId: managerId || "EMP-002", // Default to Sarah Jenkins if not specified
      itemName,
      category: "Pending", // Will be updated by Requirement Agent
      quantity: quantity || 1,
      justification,
      priority: priority || "Medium",
      preferredVendor,
      estimatedCost: estimatedCost || 0,
      currentStatus: "Submitted"
    });

    // Create Audit Log entry
    await AuditLog.create({
      requestId: newRequest._id,
      actor: employeeId,
      action: "Request Submitted",
      details: `Created procurement request for ${quantity}x "${itemName}" with estimated cost of ₹${estimatedCost}.`
    });

    // Trigger Multi-Agent AI Workflow asynchronously in the background
    // (do not await so the API responds immediately, and the client displays live execution)
    runProcurementWorkflow(newRequest._id.toString()).catch((err) => {
      console.error(`Workflow failure for request ${newRequest._id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: "Procurement request submitted. AI workflow initiated.",
      request: newRequest
    });

  } catch (error: any) {
    console.error("Create Request API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
