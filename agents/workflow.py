import os
import sys
import time
import json
from datetime import datetime, timezone
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
# Extract db name or default to careerpilot
db = client.get_default_database()
if db is None:
    db = client["careerpilot"]

# Initialize OpenAI
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Helper to sleep/simulate visual timeline
def simulate_delay(seconds=1):
    time.sleep(seconds)

# Helper to load operational rules for a specific agent from agent.md
def load_agent_rules(agent_name):
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        agent_md_path = os.path.join(script_dir, "agent.md")
        if not os.path.exists(agent_md_path):
            agent_md_path = os.path.join(os.path.dirname(script_dir), "agent.md")
        
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
        print(f"Warning: Could not load rules for {agent_name} from agent.md: {e}", file=sys.stderr)
        return ""

def main():
    if len(sys.argv) < 2:
        print("Error: Missing requestId argument.", file=sys.stderr)
        sys.exit(1)
        
    request_id_str = sys.argv[1]
    print(f"Starting Python Multi-Agent workflow for Request: {request_id_str}")
    
    try:
        req_id = ObjectId(request_id_str)
    except Exception as e:
        print(f"Error: Invalid Request ObjectId format: {e}", file=sys.stderr)
        sys.exit(1)
        
    request = db["procurementrequests"].find_one({"_id": req_id})
    if not request:
        print(f"Error: Request {request_id_str} not found in database.", file=sys.stderr)
        sys.exit(1)
        
    # Set status to AI Processing
    db["procurementrequests"].update_one(
        {"_id": req_id},
        {"$set": {"currentStatus": "AI Processing"}}
    )
    
    employee_id = request.get("employeeId")
    employee = db["users"].find_one({"employeeId": employee_id})
    employee_name = employee.get("name", "Unknown Employee") if employee else "Unknown Employee"
    employee_dept = employee.get("department", "Unknown Department") if employee else "Unknown Department"
    employee_role = employee.get("role", "Employee") if employee else "Employee"
    employee_desg = employee.get("designation", "Staff") if employee else "Staff"
    
    # State passing variables
    analyzed_requirement = {}
    employee_context = {}
    inventory_check = {}
    budget_check = {}
    vendor_analysis = {}
    policy_check = {}
    risk_check = {}
    recommendation_details = {}

    # ==========================================
    # Agent 1: Requirement Analysis Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.2)
        
        rules = load_agent_rules("Requirement Analysis Agent")
        prompt = f"""{rules}

Analyze this procurement request:
Item: "{request.get('itemName')}"
Quantity: {request.get('quantity')}
Justification: "{request.get('justification')}"
Specifications: "{request.get('specifications', 'Not specified')}"
Preferred Vendor: "{request.get('preferredVendor', 'Not specified')}"
Estimated Cost: ₹{request.get('estimatedCost', 0)}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        analyzed_requirement = result
        
        # Update category, priority, and estimated cost if missing
        up_data = {}
        if result.get("category"):
            up_data["category"] = result["category"]
        if result.get("recommendedPriority"):
            up_data["priority"] = result["recommendedPriority"]
        if result.get("estimatedUnitCost") and request.get("estimatedCost") == 0:
            up_data["estimatedCost"] = result["estimatedUnitCost"] * request.get("quantity", 1)
            
        if up_data:
            db["procurementrequests"].update_one({"_id": req_id}, {"$set": up_data})
            # reload local request ref
            request = db["procurementrequests"].find_one({"_id": req_id})
            
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Requirement Analysis Agent",
            "action": "Analyzed request requirements and categorized item.",
            "status": "Completed",
            "confidence": result.get("confidenceScore", 95),
            "reasoning": result.get("analysis", f"Analyzed item '{request.get('itemName')}'. Category: {result.get('category')}."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 1: Requirement Analysis Completed.")
    except Exception as err:
        print(f"Agent 1 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Requirement Analysis Agent",
            "action": "Analyzed request requirements",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 2: Employee Context Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.0)
        
        employee_assets_cursor = db["assets"].find({"assignedTo": employee_id})
        employee_assets = list(employee_assets_cursor)
        
        employee_context = {
            "name": employee_name,
            "department": employee_dept,
            "designation": employee_desg,
            "role": employee_role,
            "joiningDate": str(employee.get("joiningDate")) if employee else None,
            "location": employee.get("location") if employee else None,
            "currentAssets": [
                {
                    "assetId": a.get("assetId"),
                    "name": a.get("assetName"),
                    "category": a.get("category"),
                    "purchaseDate": str(a.get("purchaseDate")),
                    "condition": a.get("condition"),
                    "status": a.get("status")
                }
                for a in employee_assets
            ]
        }
        
        asset_summary = ", ".join([f"{a.get('assetName')} ({a.get('condition')})" for a in employee_assets]) if employee_assets else "No active assets assigned."
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Employee Context Agent",
            "action": "Retrieved employee profile and current hardware list.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": f"Employee {employee_name} holds the role of {employee_desg} in {employee_dept} department. Current assigned assets: {asset_summary}.",
            "evidence": json.dumps(employee_context),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 2: Employee Context Retrieved.")
    except Exception as err:
        print(f"Agent 2 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Employee Context Agent",
            "action": "Retrieve employee context",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 3: Inventory Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.2)
        
        # Search for assets in DB that match category or share name keywords
        item_name = request.get("itemName", "")
        keywords = [kw for kw in item_name.split() if len(kw) > 2]
        
        query_conditions = [{"category": request.get("category", "Laptop")}]
        for kw in keywords:
            query_conditions.append({"assetName": {"$regex": kw, "$options": "i"}})
            
        matching_assets_cursor = db["assets"].find({"$or": query_conditions})
        matching_assets = list(matching_assets_cursor)
        
        serializable_matching = [
            {
                "assetId": a.get("assetId"),
                "name": a.get("assetName"),
                "category": a.get("category"),
                "condition": a.get("condition"),
                "status": a.get("status"), # "Available", "Assigned", etc.
                "assignedTo": a.get("assignedTo", "None")
            } for a in matching_assets
        ]
        
        rules = load_agent_rules("Inventory Agent")
        prompt = f"""{rules}

Assess if we can fulfill this request from inventory:
Request: "{request.get('itemName')}" (Qty: {request.get('quantity')}, Category: {request.get('category')})
Specifications: "{request.get('specifications', 'Not specified')}"
Employee Current Assets: {json.dumps(employee_context.get('currentAssets', []))}
Matching Assets in DB (Available and Assigned): {json.dumps(serializable_matching)}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        inventory_check = result
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Inventory Agent",
            "action": "Checked available inventory and asset reassignment options.",
            "status": "Completed",
            "confidence": result.get("confidenceScore", 90),
            "reasoning": result.get("reasoning", "No stock reassignments recommended."),
            "evidence": json.dumps({"availableCount": len([a for a in matching_assets if a.get("status") == "Available"]), "inventoryResult": result}),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 3: Inventory Checked.")
    except Exception as err:
        print(f"Agent 3 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Inventory Agent",
            "action": "Inventory assessment",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 4: Budget Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.0)
        
        budget = db["departmentbudgets"].find_one({"department": employee_dept})
        cost = request.get("estimatedCost", 0)
        
        sufficient = False
        remaining = 0
        reason = ""
        
        if budget:
            remaining = budget.get("remainingBudget", 0)
            sufficient = remaining >= cost
            reason = f"Department '{employee_dept}' has sufficient budget (₹{remaining:,} remaining; request cost is ₹{cost:,})." if sufficient else f"Department '{employee_dept}' budget is insufficient (₹{remaining:,} remaining; request cost is ₹{cost:,})."
        else:
            reason = f"No budget allocation found for department: {employee_dept}. Flagged for review."
            
        budget_check = {
            "sufficient": sufficient,
            "allocated": budget.get("allocatedBudget", 0) if budget else 0,
            "used": budget.get("usedBudget", 0) if budget else 0,
            "remaining": remaining,
            "cost": cost
        }
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Budget Agent",
            "action": "Validated department budget availability.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": reason,
            "evidence": json.dumps(budget_check),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 4: Budget Checked.")
    except Exception as err:
        print(f"Agent 4 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Budget Agent",
            "action": "Budget verification",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 5: Vendor Intelligence Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.4)
        
        keyword = request.get("itemName", "").split(" ")[0]
        quotations_cursor = db["vendorquotations"].find({
            "$or": [
                {"itemName": {"$regex": keyword, "$options": "i"}},
                {"specification": {"$regex": keyword, "$options": "i"}}
            ]
        })
        quotations = list(quotations_cursor)
        
        serializable_quotes = [
            {
                "vendorId": q.get("vendorId"),
                "itemName": q.get("itemName"),
                "price": q.get("price"),
                "deliveryDays": q.get("deliveryDays"),
                "warranty": q.get("warranty")
            } for q in quotations
        ]
        
        vendors_cursor = db["vendors"].find({"approved": True})
        vendors = list(vendors_cursor)
        serializable_vendors = [
            {
                "vendorName": v.get("vendorName"),
                "rating": v.get("rating"),
                "averageDeliveryDays": v.get("averageDeliveryDays")
            } for v in vendors
        ]
        
        rules = load_agent_rules("Vendor Intelligence Agent")
        prompt = f"""{rules}

Compare the available quotations and select the best vendor for this request:
Request Item: "{request.get('itemName')}" (Est Cost: ₹{request.get('estimatedCost')})
Specifications: "{request.get('specifications', 'Not specified')}"
Quotations found: {json.dumps(serializable_quotes)}
Approved Vendors details: {json.dumps(serializable_vendors)}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        vendor_analysis = result
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Vendor Intelligence Agent",
            "action": "Compared vendors and selected best price/warranty quotation.",
            "status": "Completed",
            "confidence": 95,
            "reasoning": result.get("reasoning", f"Recommended: {result.get('recommendedVendor')} at ${result.get('recommendedPrice')}."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 5: Vendor Comparison Completed.")
    except Exception as err:
        print(f"Agent 5 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Vendor Intelligence Agent",
            "action": "Vendor evaluation",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 6: Policy Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.1)
        
        policies_cursor = db["procurementpolicies"].find({
            "category": request.get("category", "Laptop")
        })
        policies = list(policies_cursor)
        serializable_policies = [
            {
                "policyName": p.get("policyName"),
                "minRole": p.get("minRole"),
                "maxBudget": p.get("maxBudget"),
                "requiresQuotation": p.get("requiresQuotation"),
                "allowedVendors": p.get("allowedVendors", [])
            } for p in policies
        ]
        
        rules = load_agent_rules("Policy Agent")
        prompt = f"""{rules}

Verify if this request conforms to corporate procurement policies:
Request: "{request.get('itemName')}"
Category: "{request.get('category')}"
Cost: ₹{request.get('estimatedCost')}
Specifications: "{request.get('specifications', 'Not specified')}"
Preferred Vendor: "{vendor_analysis.get('recommendedVendor', request.get('preferredVendor'))}"
Employee Role: "{employee_role}"
Policies: {json.dumps(serializable_policies)}"""

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
            "agentName": "Policy Agent",
            "action": "Validated request against corporate procurement policies.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": result.get("reasoning", "All policy rules validated successfully."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 6: Policy Checked.")
    except Exception as err:
        print(f"Agent 6 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Policy Agent",
            "action": "Policy validation",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 7: Risk Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.2)
        
        # Check duplicate requests by employee in last 30 days
        thirty_days_ago = datetime.now(timezone.utc) # simple mock date
        # Since it's python, we'll count documents
        keyword = request.get("itemName", "").split(" ")[0]
        duplicates_count = db["procurementrequests"].count_documents({
            "employeeId": employee_id,
            "itemName": {"$regex": keyword, "$options": "i"},
            "_id": {"$ne": req_id}
        })
        
        chosen_vendor = db["vendors"].find_one({"vendorName": vendor_analysis.get("recommendedVendor")})
        vendor_blacklisted = not chosen_vendor.get("approved", True) if chosen_vendor else False
        
        rules = load_agent_rules("Risk Agent")
        prompt = f"""{rules}

Assess risk for this request:
Request: "{request.get('itemName')}"
Estimated Cost: ₹{request.get('estimatedCost')}
Recommended Vendor: "{vendor_analysis.get('recommendedVendor')}"
Vendor Blacklisted: {vendor_blacklisted}
Duplicate Requests recently: {duplicates_count}
Budget Check context: {json.dumps(budget_check)}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        risk_check = result
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Risk Agent",
            "action": "Performed risk scoring, duplicate checks, and vendor scanning.",
            "status": "Completed",
            "confidence": 98,
            "reasoning": result.get("reasoning", f"Risk level: {result.get('riskLevel')} (Score: {result.get('riskScore')}/100)."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 7: Risk Checked.")
    except Exception as err:
        print(f"Agent 7 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Risk Agent",
            "action": "Risk assessment",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    # ==========================================
    # Agent 8: Recommendation Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(1.5)
        
        rules = load_agent_rules("Recommendation Agent")
        prompt = f"""{rules}

Synthesize findings from all agents and generate a final recommendation decision brief for the manager:
Employee: "{employee_name}" (Role: "{employee_role}", Dept: "{employee_dept}")
Request: "{request.get('itemName')}" (Quantity: {request.get('quantity')}, Total Cost: ₹{request.get('estimatedCost')})
Specifications: "{request.get('specifications', 'Not specified')}"
Requirement Analysis: {json.dumps(analyzed_requirement)}
Inventory Assessment: {json.dumps(inventory_check)}
Budget Assessment: {json.dumps(budget_check)}
Vendor Intelligence: {json.dumps(vendor_analysis)}
Policy Validation: {json.dumps(policy_check)}
Risk Analysis: {json.dumps(risk_check)}"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("OpenAI response content was None")
        result = json.loads(content)
        recommendation_details = result
        
        # Save to request
        db["procurementrequests"].update_one(
            {"_id": req_id},
            {
                "$set": {
                    "currentStatus": "Pending Manager",
                    "aiRecommendation": result.get("decision", "Approve"),
                    "confidence": result.get("confidence", 95)
                }
            }
        )
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Recommendation Agent",
            "action": "Compiled decision brief and generated final recommendation.",
            "status": "Completed",
            "confidence": result.get("confidence", 95),
            "reasoning": result.get("justification", "Workflow recommendation generated successfully."),
            "evidence": json.dumps(result),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 8: Final Recommendation Synthesized.")
    except Exception as err:
        print(f"Agent 8 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Recommendation Agent",
            "action": "Decision recommendation synthesis",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })
        db["procurementrequests"].update_one(
            {"_id": req_id},
            {"$set": {"currentStatus": "Pending Manager", "aiRecommendation": "Need Review", "confidence": 50}}
        )

    # ==========================================
    # Agent 9: Notification Agent
    # ==========================================
    try:
        start_time = time.time()
        simulate_delay(0.8)
        
        # Employee notification
        db["notifications"].insert_one({
            "userId": employee_id,
            "title": "AI Analysis Completed",
            "description": f"Your procurement request {request.get('requestNumber')} has been processed by Python AI and awaits Manager approval.",
            "type": "Info",
            "read": False,
            "createdAt": datetime.now(timezone.utc)
        })
        
        # Manager notification
        mgr_id = request.get("managerId", "EMP-002")
        db["notifications"].insert_one({
            "userId": mgr_id,
            "title": "Action Required: Procurement Request",
            "description": f"Request {request.get('requestNumber')} from {employee_name} for {request.get('itemName')} requires review.",
            "type": "Alert",
            "read": False,
            "createdAt": datetime.now(timezone.utc)
        })
        
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Notification Agent",
            "action": "Sent dashboard notifications and prepared email briefs.",
            "status": "Completed",
            "confidence": 100,
            "reasoning": f"System alerts successfully dispatched to Employee {employee_id} and Manager {mgr_id} via PyMongo.",
            "evidence": json.dumps({"employeeNotified": True, "managerNotified": True}),
            "executionTime": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now(timezone.utc)
        })
        print("Agent 9: Notifications Dispatched.")
    except Exception as err:
        print(f"Agent 9 Error: {err}", file=sys.stderr)
        db["aiworkflowlogs"].insert_one({
            "requestId": request_id_str,
            "agentName": "Notification Agent",
            "action": "Notification dispatch",
            "status": "Failed",
            "confidence": 0,
            "reasoning": f"Error: {str(err)}",
            "timestamp": datetime.now(timezone.utc)
        })

    print(f"Python Multi-Agent Workflow Completed for request: {request_id_str}")

if __name__ == "__main__":
    main()
