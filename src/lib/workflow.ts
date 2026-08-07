import { spawn } from "child_process";
import path from "path";

/**
 * Spawns the refactored Python multi-agent pipeline in the background.
 * The python workflow script handles all 9 agents, queries the DB via PyMongo,
 * calls OpenAI, and updates logs/states in real-time.
 */
export async function runProcurementWorkflow(requestId: string) {
  const scriptPath = path.join(process.cwd(), "agents", "workflow.py");
  console.log(`Spawning Python Agent workflow subprocess: python ${scriptPath} ${requestId}`);

  const pythonProcess = spawn("python", [scriptPath, requestId], {
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1" // Ensures logs are printed in real-time
    }
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
}

export async function runLeaveWorkflow(leaveRequestId: string) {
  const scriptPath = path.join(process.cwd(), "agents", "leave_workflow.py");
  console.log(`Spawning Python Leave Agent workflow: python ${scriptPath} ${leaveRequestId}`);

  const pythonProcess = spawn("python", [scriptPath, leaveRequestId], {
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1"
    }
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
}
