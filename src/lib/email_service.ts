import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface EmailPayload {
  employeeName: string;
  employeeEmail: string;
  workflowType: "Procurement" | "Leave" | "Expense Reimbursement";
  action: "Approved" | "Rejected" | "Clarification Requested" | "Payment Completed";
  requestIdOrNumber: string;
  details: string;
  managerName?: string;
  managerComments?: string;
}

/**
 * Generates a formal AI notification email body using OpenAI GPT-4o-mini,
 * falling back to a structured template if no API key is set.
 */
export async function generateFormalAIEmail(payload: EmailPayload): Promise<{ subject: string; body: string }> {
  const {
    employeeName,
    employeeEmail,
    workflowType,
    action,
    requestIdOrNumber,
    details,
    managerName = "Raja babu (Manager)",
    managerComments = ""
  } = payload;

  const defaultSubject = `[Notification] ${workflowType} Request (${requestIdOrNumber}) - ${action}`;
  let emailBody = "";

  if (openai) {
    try {
      const prompt = `
You are the AI Executive Operations Assistant for an enterprise company. 
Write a highly professional, polite, and formal email notification to an employee regarding the manager's decision on their request.

Details:
- Employee Name: ${employeeName}
- Request Type: ${workflowType}
- Request ID / Ref: ${requestIdOrNumber}
- Manager Action: ${action}
- Manager Name: ${managerName}
- Manager Comments: ${managerComments || "None provided"}
- Request Summary Details: ${details}

Requirements:
1. Subject line must be concise and formal.
2. The email body must be structured with formal greeting, clear statement of decision, summary of request, manager notes (if any), next operational steps, and professional sign-off.
3. Return a valid JSON object matching this exact schema:
{
  "subject": "string",
  "body": "string (formatted with plain text newlines or clean paragraphing)"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          subject: parsed.subject || defaultSubject,
          body: parsed.body || ""
        };
      }
    } catch (err) {
      console.warn("OpenAI Email Generation Warning, falling back to template:", err);
    }
  }

  // Fallback Formal Template if OpenAI API key is unavailable or fails
  emailBody = `Dear ${employeeName},

This is an automated formal notification from the Enterprise AI Operations Portal regarding your recent ${workflowType} request (${requestIdOrNumber}).

==================================================
DECISION SUMMARY
==================================================
• Request Reference: ${requestIdOrNumber}
• Status Update: ${action.toUpperCase()}
• Reviewed By: ${managerName}
• Request Summary: ${details}
${managerComments ? `• Manager Review Notes: "${managerComments}"` : ""}

${
  action === "Approved"
    ? `Your ${workflowType.toLowerCase()} request has been formally APPROVED by your manager. All downstream operations (such as purchase order issuance, budget deduction, or calendar updates) have been automatically initiated.`
    : action === "Rejected"
    ? `Regrettably, your ${workflowType.toLowerCase()} request was REJECTED during manager review. Please review the notes provided above or contact your department lead for further guidance.`
    : action === "Clarification Requested"
    ? `Your manager has requested additional information regarding your ${workflowType.toLowerCase()} request. Please log in to the Employee Portal dashboard and submit your response to re-trigger the AI evaluation loop.`
    : `Your expense reimbursement payment of ${details} has been completed by Finance.`
}

If you have any questions or require support, please reach out via the AI Operations Portal.

Sincerely,

Enterprise AI Operations System
Automated Corporate Notification Desk
`;

  return {
    subject: defaultSubject,
    body: emailBody
  };
}
