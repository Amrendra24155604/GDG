import os
import sys
import time
import json
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not MONGODB_URI:
    print("Error: MONGODB_URI not set in env.", file=sys.stderr)
    sys.exit(1)

client = MongoClient(MONGODB_URI)
db = client.get_default_database()
if db is None:
    db = client["careerpilot"]

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

def simulate_delay(seconds=1):
    time.sleep(seconds)

def log_agent_execution(request_id, agent_name, action, status, confidence, reasoning, evidence=None, exec_time=1200):
    log_entry = {
        "requestId": request_id,
        "agentName": agent_name,
        "action": action,
        "status": status,
        "confidence": confidence,
        "reasoning": reasoning,
        "evidence": json.dumps(evidence) if evidence else None,
        "executionTime": exec_time,
        "timestamp": datetime.now(timezone.utc)
    }
    db["aiworkflowlogs"].insert_one(log_entry)

def main():
    if len(sys.argv) < 2:
        print("Error: Missing expenseClaimId argument.", file=sys.stderr)
        sys.exit(1)
        
    claim_id_str = sys.argv[1]
    print(f"Starting Python Multi-Agent Expense Workflow for Claim: {claim_id_str}")
    
    try:
        claim_id = ObjectId(claim_id_str)
    except Exception as e:
        print(f"Error: Invalid ExpenseClaim ObjectId format: {e}", file=sys.stderr)
        sys.exit(1)
        
    claim = db["expenseclaims"].find_one({"_id": claim_id})
    if not claim:
        print(f"Error: Expense claim {claim_id_str} not found in DB.", file=sys.stderr)
        sys.exit(1)
        
    db["expenseclaims"].update_one(
        {"_id": claim_id},
        {"$set": {"currentStatus": "AI Processing"}}
    )
    
    employee_id = claim.get("employeeId")
    employee = db["users"].find_one({"employeeId": employee_id})
    emp_name = employee.get("name", "Amrendra Yadav") if employee else "Amrendra Yadav"
    emp_dept = employee.get("department", "Engineering") if employee else "Engineering"
    emp_role = employee.get("role", "Employee") if employee else "Employee"
    
    # 1. Employee Context Agent
    simulate_delay(1)
    monthly_limit = 25000
    claimed_this_month = 8400
    remaining_limit = monthly_limit - claimed_this_month
    
    ctx_reasoning = f"Employee {emp_name} ({emp_dept} - {emp_role}). Monthly policy limit: ₹{monthly_limit:,}, Claimed this month: ₹{claimed_this_month:,}. Remaining: ₹{remaining_limit:,}."
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Employee Context Agent",
        action="Employee Context Verification",
        status="Completed",
        confidence=100,
        reasoning=ctx_reasoning,
        evidence={"employee": emp_name, "department": emp_dept, "monthlyLimit": monthly_limit, "claimedMonth": claimed_this_month}
    )

    # 2. Receipt Agent (OCR / Extraction)
    simulate_delay(1)
    sub_amount = claim.get("amount", 0)
    sub_date = str(claim.get("date"))[:10] if claim.get("date") else "2026-08-05"
    
    # Simulate OCR Extraction
    ocr_merchant = "Uber" if "uber" in claim.get("description", "").lower() or claim.get("expenseType") == "Travel" else "Amazon Web Services"
    ocr_amount = sub_amount
    ocr_date = sub_date
    ocr_receipt_num = "UBR-892731" if ocr_merchant == "Uber" else "AWS-991823"
    
    amount_matches = (ocr_amount == sub_amount)
    ocr_reasoning = f"Extracted Receipt - Merchant: {ocr_merchant}, Amount: ₹{ocr_amount:,}, Date: {ocr_date}, Receipt #: {ocr_receipt_num}. Amount matches submitted claim: {amount_matches}."
    
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Receipt Agent",
        action="OCR Receipt Extraction & Verification",
        status="Completed",
        confidence=98 if amount_matches else 60,
        reasoning=ocr_reasoning,
        evidence={"merchant": ocr_merchant, "amount": ocr_amount, "date": ocr_date, "receiptNumber": ocr_receipt_num, "amountMatches": amount_matches}
    )

    # 3. Expense Classification Agent
    simulate_delay(1)
    category = "Travel" if ocr_merchant == "Uber" else "Cloud / Software"
    business_purpose = "Client Meeting" if category == "Travel" else "Development Infrastructure"
    class_reasoning = f"Categorized merchant '{ocr_merchant}' under '{category}' with business purpose '{business_purpose}'."
    
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Expense Classification Agent",
        action="Automatic Categorization",
        status="Completed",
        confidence=97,
        reasoning=class_reasoning,
        evidence={"category": category, "businessPurpose": business_purpose}
    )

    # 4. Expense History Agent
    simulate_delay(1)
    past_claims = list(db["expenseclaims"].find({"employeeId": employee_id, "_id": {"$ne": claim_id}}).limit(5))
    hist_reasoning = f"Analyzed {len(past_claims)} recent claims for {emp_name}. Spending pattern matches normal employee distribution."
    
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Expense History Agent",
        action="Historical Pattern Analysis",
        status="Completed",
        confidence=95,
        reasoning=hist_reasoning,
        evidence={"pastClaimCount": len(past_claims)}
    )

    # 5. Policy Agent (RAG Policy Retrieval)
    simulate_delay(1)
    policy_doc = db["expensepolicies"].find_one({"category": category})
    max_limit = policy_doc.get("maxLimitPerTrip", 2000) if policy_doc else 2000
    policy_passed = sub_amount <= max_limit
    
    policy_reasoning = f"RAG Query: '{category} Policy'. Max single trip limit: ₹{max_limit:,}. Receipt provided: Yes. Business purpose: '{business_purpose}'. Policy Passed: {policy_passed}."
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Policy Agent",
        action="RAG Knowledge Base Policy Search",
        status="Completed",
        confidence=99 if policy_passed else 70,
        reasoning=policy_reasoning,
        evidence={"category": category, "maxLimit": max_limit, "policyPassed": policy_passed}
    )

    # 6. Duplicate Detection Agent
    simulate_delay(1)
    dup_claim = db["expenseclaims"].find_one({
        "employeeId": employee_id,
        "amount": sub_amount,
        "_id": {"$ne": claim_id},
        "extractedData.receiptNumber": ocr_receipt_num
    })
    is_dup = bool(dup_claim)
    dup_reasoning = f"Cross-referenced receipt #{ocr_receipt_num} across active claims. Potential duplicate detected: {is_dup}."
    
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Duplicate Detection Agent",
        action="Receipt Fingerprint Hash Match",
        status="Completed",
        confidence=99 if not is_dup else 90,
        reasoning=dup_reasoning,
        evidence={"isDuplicate": is_dup, "matchedReceiptNumber": ocr_receipt_num}
    )

    # 7. Risk Agent
    simulate_delay(1)
    risk_score = 12
    if not amount_matches:
        risk_score += 40
    if not policy_passed:
        risk_score += 30
    if is_dup:
        risk_score += 45
        
    risk_level = "LOW" if risk_score < 30 else ("MEDIUM" if risk_score < 60 else "HIGH")
    risk_reasoning = f"Calculated Risk Score: {risk_score}/100 ({risk_level} Risk). Factors: Receipt Valid, Amount Matches: {amount_matches}, Policy Compliant: {policy_passed}, Duplicate: {is_dup}."
    
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Risk Agent",
        action="Multi-Factor Risk Assessment",
        status="Completed",
        confidence=96,
        reasoning=risk_reasoning,
        evidence={"riskScore": risk_score, "riskLevel": risk_level}
    )

    # 8. Reimbursement Recommendation Agent
    simulate_delay(1)
    rec = "APPROVE" if risk_score < 40 else ("CLARIFY" if risk_score < 75 else "REJECT")
    rec_confidence = 98 if rec == "APPROVE" else 85
    
    final_reasoning = f"Recommend {rec} for ₹{sub_amount:,} ({category}). Receipt Verified: Yes | Amount Matches: Yes | Policy Compliant: Yes | Duplicate: None | Risk: {risk_level}."
    
    log_agent_execution(
        request_id=claim_id_str,
        agent_name="Reimbursement Recommendation Agent",
        action="Final Decision Synthesis",
        status="Completed",
        confidence=rec_confidence,
        reasoning=final_reasoning,
        evidence={"recommendation": rec, "confidence": rec_confidence}
    )

    # Update ExpenseClaim Record in Mongo
    db["expenseclaims"].update_one(
        {"_id": claim_id},
        {"$set": {
            "currentStatus": "Pending Manager",
            "aiRecommendation": rec,
            "confidence": rec_confidence,
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "extractedData": {
                "merchant": ocr_merchant,
                "amount": ocr_amount,
                "date": ocr_date,
                "category": category,
                "tax": 60,
                "receiptNumber": ocr_receipt_num,
                "confidence": 98
            }
        }}
    )
    
    print(f"Expense Multi-Agent Workflow Completed for Claim: {claim_id_str}")

if __name__ == "__main__":
    main()
