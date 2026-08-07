import os
import sys
import time
import json
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from pymongo import MongoClient
from openai import OpenAI
from dotenv import load_dotenv

# Load env variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not MONGODB_URI:
    print("Error: MONGODB_URI not set in env.", file=sys.stderr)
    sys.exit(1)

if not OPENAI_API_KEY:
    print("Error: OPENAI_API_KEY not set in env.", file=sys.stderr)
    sys.exit(1)

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_default_database()
if db is None:
    db = client["careerpilot"]

# Initialize OpenAI
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Helper to simulate visual timeline delays
def simulate_delay(seconds=1):
    time.sleep(seconds)

# Helper to load operational rules for a specific agent from leave_agent.md
def load_agent_rules(agent_name):
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        agent_md_path = os.path.join(script_dir, "leave_agent.md")
        if not os.path.exists(agent_md_path):
            agent_md_path = os.path.join(os.path.dirname(script_dir), "leave_agent.md")
        
        with open(agent_md_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        lines = content.splitlines()
        rules = []
        capture = False
        for line in lines:
            if line.startswith("## "):
                header = line[3:].strip()
                if agent_name.lower() in header.lower():
                    capture = True
                    continue
                else:
                    capture = False
            if capture:
                rules.append(line)
        return "\n".join(rules).strip()
    except Exception as e:
        print(f"Warning: Could not load rules for {agent_name} from leave_agent.md: {e}", file=sys.stderr)
        return ""

def main():
    if len(sys.argv) < 2:
        print("Error: Missing leaveRequestId argument.", file=sys.stderr)
        sys.exit(1)
        
    request_id_str = sys.argv[1]
    print(f"Starting Python Multi-Agent Leave Workflow for Request: {request_id_str}")
    
    try:
        req_id = ObjectId(request_id_str)
    except Exception as e:
        print(f"Error: Invalid LeaveRequest ObjectId format: {e}", file=sys.stderr)
        sys.exit(1)
        
    request = db["leaverequests"].find_one({"_id": req_id})
    if not request:
        print(f"Error: Leave Request {request_id_str} not found in database.", file=sys.stderr)
        sys.exit(1)
        
    # Set status to AI Processing
    db["leaverequests"].update_one(
        {"_id": req_id},
        {"$set": {"currentStatus": "AI Processing"}}
    )
    
    # Initialize variables for cross-agent flow
    user_info = None
    balance_check = None
    policy_check = None
    team_availability = None
    calendar_conflict = None
    
    # Define corporate calendar milestones for conflict agent to inspect
    milestones = [
        {"date": "2026-08-19", "event": "Product release v2.0 scheduled"},
        {"date": "2026-08-25", "event": "Quarterly board review meeting"},
        {"date": "2026-09-07", "event": "National Labor Day Holiday"}
    ]
    
    # =========================================================================
    # AGENT 1: Employee Context Agent
    # =========================================================================
    try:
        start_time = time.time()
        emp_id = request.get("employeeId")
        user = db["users"].find_one({"employeeId": emp_id})
        if not user:
            raise ValueError(f"Requester employee profile {emp_id} not found in database.")
            
        bal = user.get("leaveBalance", {"casualLeave": 8, "sickLeave": 10, "earnedLeave": 14})
        
        user_info = {
            "employeeName": user.get("name"),
            "department": user.get("department"),
            "managerId": user.get("managerId"),
            "joiningDate": user.get("joiningDate").strftime("%Y-%m-%d") if isinstance(user.get("joiningDate"), datetime) else str(user.get("joiningDate")),
            "leaveBalance": {
                "casualLeave": bal.get("casualLeave", 8),
                "sickLeave": bal.get("sickLeave", 10),
                "earnedLeave": bal.get("earnedLeave", 14)
            }
        }
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Employee Context Agent",
            "action": "Retrieved employee profile and current leave balances.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": f"Retrieved profile for {user_info['employeeName']} in department '{user_info['department']}'.",
            "evidence": json.dumps(user_info),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 1: Employee Context Agent Completed.")
    except Exception as err:
        print(f"Agent 1 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Employee Context Agent",
            "action": "Retrieve employee context",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        
    simulate_delay(1)
    
    # =========================================================================
    # AGENT 2: Leave Balance Check Agent
    # =========================================================================
    try:
        start_time = time.time()
        start_date = request.get("startDate")
        end_date = request.get("endDate")
        leave_type = request.get("leaveType")
        
        # Calculate working days (inclusive)
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace("Z", ""))
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace("Z", ""))
            
        requested_days = (end_date - start_date).days + 1
        
        # Determine available balance from type
        balance_key = "casualLeave"
        if "sick" in leave_type.lower():
            balance_key = "sickLeave"
        elif "earned" in leave_type.lower() or "annual" in leave_type.lower():
            balance_key = "earnedLeave"
            
        balance_dict = user_info.get("leaveBalance", {}) if isinstance(user_info, dict) else {}
        available = balance_dict.get(balance_key, 0) if isinstance(balance_dict, dict) else 0
        sufficient = available >= requested_days
        deficit = max(0, requested_days - available)
        
        balance_check = {
            "requestedDays": requested_days,
            "availableBalance": available,
            "sufficient": sufficient,
            "deficit": deficit,
            "reasoning": f"Requested {requested_days} days of {leave_type}. Available balance: {available} days."
        }
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Leave Balance Check Agent",
            "action": "Verified requested leave duration against available balance.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": balance_check["reasoning"],
            "evidence": json.dumps(balance_check),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 2: Leave Balance Check Completed.")
    except Exception as err:
        print(f"Agent 2 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Leave Balance Check Agent",
            "action": "Check leave balance",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        
    simulate_delay(1)

    # =========================================================================
    # AGENT 3: Policy Agent
    # =========================================================================
    try:
        start_time = time.time()
        rules_text = load_agent_rules("Policy Agent")
        
        prompt = f"""
You are the Policy Agent. Validate this leave request against the company policy rules:
{rules_text}

Request Details:
Leave Type: {request.get("leaveType")}
Requested Days: {balance_check.get("requestedDays") if balance_check else 1}
Start Date: {request.get("startDate")}
End Date: {request.get("endDate")}
Submission Date: {request.get("createdAt")}

Output a JSON object matching this structure:
{{
  "policyPassed": boolean,
  "violations": ["string"],
  "reasoning": "string"
}}
"""
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        policy_check = result
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Leave Policy Agent",
            "action": "Validated requested leave against corporate guidelines.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": result.get("reasoning", "Leave complies with policies."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 3: Policy Agent Completed.")
    except Exception as err:
        print(f"Agent 3 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Leave Policy Agent",
            "action": "Check leave policy rules",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        
    simulate_delay(1)

    # =========================================================================
    # AGENT 4: Team Availability Agent
    # =========================================================================
    try:
        start_time = time.time()
        dept = user_info.get("department", "Engineering") if user_info else "Engineering"
        emp_id = request.get("employeeId")
        
        # Find all other team members in department
        team_members = list(db["users"].find({"department": dept}))
        total_team = len(team_members)
        
        # Check overlapping approved leaves for department team members on start_date -> end_date
        overlap_count = 0
        overlapping_emails = []
        
        start_dt = request.get("startDate")
        end_dt = request.get("endDate")
        if isinstance(start_dt, str):
            start_dt = datetime.fromisoformat(start_dt.replace("Z", ""))
        if isinstance(end_dt, str):
            end_dt = datetime.fromisoformat(end_dt.replace("Z", ""))
            
        for member in team_members:
            m_id = member.get("employeeId")
            if m_id == emp_id:
                continue
            # Look for approved leave overlapping with these dates
            conflict_leave = db["leaverequests"].find_one({
                "employeeId": m_id,
                "currentStatus": "Approved",
                "$or": [
                    {"startDate": {"$lte": end_dt}, "endDate": {"$gte": start_dt}}
                ]
            })
            if conflict_leave:
                overlap_count += 1
                overlapping_emails.append(member.get("name"))
                
        # Calculate availability risk
        unavailable_percentage = (overlap_count / max(1, total_team)) * 100
        operational_risk = "High" if unavailable_percentage >= 50 else "Low"
        
        team_availability = {
            "totalTeamMembers": total_team,
            "activeOnLeave": overlap_count,
            "operationalRisk": operational_risk,
            "unavailablePercentage": int(unavailable_percentage),
            "details": f"{total_team - overlap_count - 1} / {total_team} team members available. Currently on leave: {', '.join(overlapping_emails) if overlapping_emails else 'None'}."
        }
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Team Availability Agent",
            "action": "Evaluated team schedule overlaps and resource availability levels.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": f"Operational Risk: {operational_risk} ({int(unavailable_percentage)}% of department team members currently on leave).",
            "evidence": json.dumps(team_availability),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 4: Team Availability Checked.")
    except Exception as err:
        print(f"Agent 4 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Team Availability Agent",
            "action": "Check team availability",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        
    simulate_delay(1)

    # =========================================================================
    # AGENT 5: Calendar / Conflict Agent
    # =========================================================================
    try:
        start_time = time.time()
        rules_text = load_agent_rules("Calendar / Conflict Agent")
        
        prompt = f"""
You are the Calendar / Conflict Agent. Check if the leave request overlaps with critical company milestones or deadlines:
{rules_text}

Milestones context:
{json.dumps(milestones, indent=2)}

Request Dates:
Start Date: {request.get("startDate")}
End Date: {request.get("endDate")}

Output a JSON object matching this structure:
{{
  "hasConflicts": boolean,
  "conflictsList": ["string"],
  "details": "string"
}}
"""
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        calendar_conflict = result
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Calendar / Conflict Agent",
            "action": "Checked date overlaps with major project releases and corporate holidays.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": result.get("details", "No major schedule conflicts found."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 5: Calendar / Conflict Agent Checked.")
    except Exception as err:
        print(f"Agent 5 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Calendar / Conflict Agent",
            "action": "Verify calendar conflicts",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        
    simulate_delay(1)

    # =========================================================================
    # AGENT 6: Recommendation Agent
    # =========================================================================
    try:
        start_time = time.time()
        rules_text = load_agent_rules("Recommendation Agent")
        
        prompt = f"""
You are the Recommendation Agent. Synthesize findings from all agents and generate a final recommendation decision brief (Approve, Reject, or Need Review) for the manager:
{rules_text}

Input Context:
Employee Context: {json.dumps(user_info)}
Leave Balance Check: {json.dumps(balance_check)}
Policy Check: {json.dumps(policy_check)}
Team Availability: {json.dumps(team_availability)}
Calendar Conflicts: {json.dumps(calendar_conflict)}

Instructions:
1. Deduct confidence score dynamically from 100 based on the rules:
   - Deduct 40% if the leave balance is insufficient (`sufficient: false`).
   - Deduct 30% if the policy validation fails (`policyPassed: false`).
   - Deduct 15% if the team availability operational risk is High (`operationalRisk: "High"`).
   - Deduct 10% if there is an important project release/milestone conflict (`hasConflicts: true`).
2. Provide a detailed bullet-point summary justifying the deductions and decision.
3. Recommend: "Approve", "Reject", or "Need Review".

Output a JSON object matching this structure:
{{
  "decision": "string (Approve, Reject, Need Review)",
  "confidence": number,
  "justification": "string (bulleted reasoning showing exact math steps)",
  "summaries": {{
    "balanceCheck": "string",
    "policyCheck": "string",
    "teamAvailability": "string",
    "calendarConflicts": "string"
  }}
}}
"""
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        
        # Programmatic validation of the confidence score to prevent LLM calculation discrepancies
        calc_confidence = 100
        if balance_check and not balance_check.get("sufficient", True):
            calc_confidence -= 40
        if policy_check and not policy_check.get("policyPassed", True):
            calc_confidence -= 30
        if team_availability and team_availability.get("operationalRisk", "Low") == "High":
            calc_confidence -= 15
        if calendar_conflict and calendar_conflict.get("hasConflicts", False):
            calc_confidence -= 10
            
        calc_confidence = max(0, min(100, calc_confidence))
        result["confidence"] = calc_confidence
        
        # Enforce reject decision if balance insufficient
        if balance_check and not balance_check.get("sufficient", True):
            result["decision"] = "Reject"
            
        # Enforce review or reject if policy fails, operational risk high, or conflicts exist
        elif (policy_check and not policy_check.get("policyPassed", True)) or \
             (team_availability and team_availability.get("operationalRisk", "Low") == "High") or \
             (calendar_conflict and calendar_conflict.get("hasConflicts", False)):
            if result["decision"] == "Approve":
                result["decision"] = "Need Review"
                
        # Update Leave Request with AI decision
        db["leaverequests"].update_one(
            {"_id": req_id},
            {"$set": {
                "currentStatus": "Pending Manager",
                "aiRecommendation": result.get("decision", "Need Review"),
                "confidence": calc_confidence
            }}
        )
        
        # Write Log entry
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Recommendation Agent",
            "action": "Generated final leave recommendation decision brief.",
            "status": "Completed",
            "confidence": calc_confidence,
            "reasoning": result.get("justification", "Leave verified."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 6: Recommendation Agent Completed.")
    except Exception as err:
        print(f"Agent 6 Error: {err}", file=sys.stderr)
        db["leaverequests"].update_one(
            {"_id": req_id},
            {"$set": {"currentStatus": "Pending Manager", "aiRecommendation": "Need Review", "confidence": 50}}
        )
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Recommendation Agent",
            "action": "Generate recommendation brief",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        
    print("Python Multi-Agent Leave Workflow Execution Finished.")

if __name__ == "__main__":
    main()
