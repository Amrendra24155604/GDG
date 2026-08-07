import { spawn } from "child_process";
import path from "path";
import {
  runProcurementWorkflowNode,
  runLeaveWorkflowNode,
  runExpenseWorkflowNode
} from "./node_workflow";

/**
 * Spawns the Python multi-agent pipeline in local dev environments,
 * or falls back seamlessly to the Node.js native agent runner in serverless cloud environments (Vercel).
 */
export async function runProcurementWorkflow(requestId: string) {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.log(`[Cloud Deployment]: Running Node.js native Procurement Agent workflow for ${requestId}`);
    runProcurementWorkflowNode(requestId).catch((e) => console.error(e));
    return;
  }

  const scriptPath = path.join(process.cwd(), "agents", "workflow.py");
  console.log(`Spawning Python Agent workflow subprocess: python ${scriptPath} ${requestId}`);

  try {
    const pythonProcess = spawn("python", [scriptPath, requestId], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    });

    pythonProcess.on("error", (err) => {
      console.warn(`[Python Spawn Error]: Falling back to Node native workflow for ${requestId}:`, err.message);
      runProcurementWorkflowNode(requestId);
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log(`[Python Workflow stdout]: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`[Python Workflow stderr]: ${data.toString().trim()}`);
    });

    pythonProcess.on("close", (code) => {
      console.log(`[Python Workflow exit]: Multi-agent execution loop finished with code ${code}`);
    });
  } catch (err) {
    console.warn(`[Python Spawn Failed]: Executing Node fallback workflow:`, err);
    runProcurementWorkflowNode(requestId);
  }
}

export async function runLeaveWorkflow(leaveRequestId: string) {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.log(`[Cloud Deployment]: Running Node.js native Leave Agent workflow for ${leaveRequestId}`);
    runLeaveWorkflowNode(leaveRequestId).catch((e) => console.error(e));
    return;
  }

  const scriptPath = path.join(process.cwd(), "agents", "leave_workflow.py");
  console.log(`Spawning Python Leave Agent workflow: python ${scriptPath} ${leaveRequestId}`);

  try {
    const pythonProcess = spawn("python", [scriptPath, leaveRequestId], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    });

    pythonProcess.on("error", (err) => {
      console.warn(`[Python Spawn Error]: Falling back to Node native Leave workflow:`, err.message);
      runLeaveWorkflowNode(leaveRequestId);
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log(`[Leave Python Workflow stdout]: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`[Leave Python Workflow stderr]: ${data.toString().trim()}`);
    });

    pythonProcess.on("close", (code) => {
      console.log(`[Leave Python Workflow exit]: Multi-agent execution finished with code ${code}`);
    });
  } catch (err) {
    runLeaveWorkflowNode(leaveRequestId);
  }
}

export async function runExpenseWorkflow(expenseClaimId: string) {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.log(`[Cloud Deployment]: Running Node.js native Expense Agent workflow for ${expenseClaimId}`);
    runExpenseWorkflowNode(expenseClaimId).catch((e) => console.error(e));
    return;
  }

  const scriptPath = path.join(process.cwd(), "agents", "expense_workflow.py");
  console.log(`Spawning Python Expense Agent workflow: python ${scriptPath} ${expenseClaimId}`);

  try {
    const pythonProcess = spawn("python", [scriptPath, expenseClaimId], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    });

    pythonProcess.on("error", (err) => {
      console.warn(`[Python Spawn Error]: Falling back to Node native Expense workflow:`, err.message);
      runExpenseWorkflowNode(expenseClaimId);
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log(`[Expense Python Workflow stdout]: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`[Expense Python Workflow stderr]: ${data.toString().trim()}`);
    });

    pythonProcess.on("close", (code) => {
      console.log(`[Expense Python Workflow exit]: Multi-agent execution finished with code ${code}`);
    });
  } catch (err) {
    runExpenseWorkflowNode(expenseClaimId);
  }
}
