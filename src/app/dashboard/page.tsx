"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

interface UpdateItem {
  id: string;
  type: "campaign" | "policy" | "leave" | "expense" | "procurement" | "system";
  title: string;
  description: string;
  time: string;
}

interface ProcurementReq {
  _id: string;
  requestNumber: string;
  employeeId: string;
  managerId: string;
  itemName: string;
  category: string;
  quantity: number;
  justification: string;
  specifications?: string;
  priority: string;
  preferredVendor: string;
  estimatedCost: number;
  currentStatus: string;
  aiRecommendation?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowLog {
  _id: string;
  requestId: string;
  agentName: string;
  action: string;
  status: string;
  confidence: number;
  reasoning: string;
  evidence?: string;
  executionTime: number;
  timestamp: string;
}

const getAvatarColor = (name: string) => {
  const colors = [
    "#1a73e8", // Google Blue
    "#ea4335", // Google Red
    "#fbbc05", // Google Yellow
    "#34a853", // Google Green
    "#ab47bc", // Purple
    "#00acc1", // Cyan
    "#ff7043", // Orange
  ];
  if (!name) return colors[0];
  let charCodeSum = 0;
  for (let i = 0; i < name.length; i++) {
    charCodeSum += name.charCodeAt(i);
  }
  return colors[charCodeSum % colors.length];
};

export default function Dashboard() {
  const router = useRouter();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Mobile Nav Tab State (for Portal view)
  const [activeTab, setActiveTab] = useState<"home" | "procure" | "leave" | "expenses">("home");

  // Portal Role (determined directly by current user's role)
  const portalViewRole = currentUser && (currentUser.role === "Manager" || currentUser.role === "Admin") ? "Manager" : "Employee";
  const firstLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U";
  const avatarBg = getAvatarColor(currentUser?.name || "");

  // DB Statistics / Budgets
  const [budgetData, setBudgetData] = useState({
    allocated: 150000,
    used: 35000,
    remaining: 115000,
  });

  // Dynamic Procurement Requests
  const [requests, setRequests] = useState<ProcurementReq[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementReq | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [recentUpdates, setRecentUpdates] = useState<UpdateItem[]>([]);

  // Modals (Portal view)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProcureModalOpen, setIsProcureModalOpen] = useState(false);

  // Form inputs (Portal view)
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Meals");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  // Procurement Form (Portal view)
  const [procureItem, setProcureItem] = useState("");
  const [procureQty, setProcureQty] = useState(1);
  const [procureCost, setProcureCost] = useState("");
  const [procurePriority, setProcurePriority] = useState("Medium");
  const [procureVendor, setProcureVendor] = useState("Dell Inc");
  const [procureReason, setProcureReason] = useState("");
  const [procureSpecs, setProcureSpecs] = useState("");
  const [procureCategory, setProcureCategory] = useState("Laptop");

  // Manager Approval notes (Portal view)
  const [managerComments, setManagerComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =========================================================================
  // DEVELOPER DASHBOARD STATES
  // =========================================================================
  const [devTab, setDevTab] = useState<"provision" | "database">("provision");

  // Developer User Creator Form Inputs
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("Employee");
  const [newUserDesignation, setNewUserDesignation] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("AI Research");
  const [newUserManagerId, setNewUserManagerId] = useState("EMP-002");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserLocation, setNewUserLocation] = useState("Remote");
  const [provisionSuccessMsg, setProvisionSuccessMsg] = useState("");
  const [provisionErrorMsg, setProvisionErrorMsg] = useState("");
  const [provisionLoading, setProvisionLoading] = useState(false);

  // Developer Database Editor Inputs
  const [dbCollections, setDbCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("User");
  const [dbDocuments, setDbDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [documentJsonText, setDocumentJsonText] = useState("");
  const [dbEditorLoading, setDbEditorLoading] = useState(false);
  const [dbEditorSuccess, setDbEditorSuccess] = useState("");
  const [dbEditorError, setDbEditorError] = useState("");
  const [newDocId, setNewDocId] = useState("");

  const generateMongoId = () => {
    const chars = "abcdef0123456789";
    let id = "";
    for (let i = 0; i < 24; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  };

  // =========================================================================
  // INITIALIZATION & SESSION CHECKS
  // =========================================================================
  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userJson);
    setCurrentUser(user);

    // User role loaded automatically from session
  }, []);

  // Fetch collections if Developer logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "Developer") {
      fetchCollections();
    }
  }, [currentUser]);

  // Load portal statistics and lists
  useEffect(() => {
    if (currentUser && currentUser.role !== "Developer") {
      refreshDashboardData();
    }
  }, [currentUser]);

  // Dynamic Polling for Portal AI Pipeline
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (!selectedRequest) return;

    const shouldPoll =
      selectedRequest.currentStatus === "Submitted" ||
      selectedRequest.currentStatus === "AI Processing";

    if (shouldPoll) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const reqRes = await fetch(`/api/procurement/request/${selectedRequest._id}`);
          const reqData = await reqRes.json();
          if (reqData.success) {
            setSelectedRequest(reqData.request);
            if (reqData.request.currentStatus !== "Submitted" && reqData.request.currentStatus !== "AI Processing") {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }
              refreshDashboardData();
            }
          }

          const logRes = await fetch(`/api/procurement/workflow?requestId=${selectedRequest._id}`);
          const logData = await logRes.json();
          if (logData.success) {
            setWorkflowLogs(logData.logs);
          }
        } catch (e) {
          console.error("Polling logs error:", e);
        }
      }, 1500);
    } else {
      const fetchOnce = async () => {
        try {
          const logRes = await fetch(`/api/procurement/workflow?requestId=${selectedRequest._id}`);
          const logData = await logRes.json();
          if (logData.success) {
            setWorkflowLogs(logData.logs);
          }
        } catch (e) {
          console.error("Fetch logs error:", e);
        }
      };
      fetchOnce();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedRequest?._id, selectedRequest?.currentStatus]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    router.push("/login");
  };

  // =========================================================================
  // PORTAL WORKFLOW METHODS
  // =========================================================================
  const refreshDashboardData = async () => {
    if (!currentUser) return;
    try {
      let res;
      // Filter by Employee or Manager depending on visual simulator tab
      if (portalViewRole === "Employee") {
        res = await fetch(`/api/procurement/my-requests?employeeId=${currentUser.employeeId}`);
      } else {
        res = await fetch("/api/procurement/request"); // Manager/Admin lists all
      }
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }

      // Fetch AI Research budget
      const bRes = await fetch("/api/budgets");
      const bData = await bRes.json();
      if (bData.success) {
        const aiDept = bData.budgets.find((b: any) => b.department === currentUser.department || b.department === "AI Research");
        if (aiDept) {
          setBudgetData({
            allocated: aiDept.allocatedBudget,
            used: aiDept.usedBudget,
            remaining: aiDept.remainingBudget,
          });
        }
      }

      // Default campaigns updates
      setRecentUpdates([
        {
          id: "sys-1",
          type: "campaign",
          title: "Q4 Townhall Schedule Updated",
          description: "The Q4 Townhall has been moved to next Thursday at 10 AM EST. Please check your calendar invites.",
          time: "2 hours ago",
        },
        {
          id: "sys-2",
          type: "policy",
          title: "New Travel Policy 2024",
          description: "Updates to the employee travel and expense policy are now available. Review before booking upcoming trips.",
          time: "Yesterday",
        }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProcureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procureItem || !currentUser) return;

    try {
      const res = await fetch("/api/procurement/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentUser.employeeId,
          managerId: currentUser.managerId || "EMP-002",
          itemName: procureItem,
          category: procureCategory,
          quantity: procureQty,
          justification: procureReason,
          specifications: procureSpecs,
          priority: procurePriority,
          preferredVendor: procureVendor,
          estimatedCost: parseFloat(procureCost) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsProcureModalOpen(false);
        setProcureItem("");
        setProcureQty(1);
        setProcureCost("");
        setProcureReason("");
        setProcureSpecs("");
        setProcureCategory("Laptop");
        setProcurePriority("Medium");

        await refreshDashboardData();
        setSelectedRequest(data.request);
        setWorkflowLogs([]);
        setNotificationsCount(prev => prev + 1);
      } else {
        alert("Submission failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedRequest || actionLoading || !currentUser) return;
    if (!confirm("Are you sure you want to withdraw this request? This will archive it and allow you to submit a new request in this category.")) return;
    
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id
        })
      });
      const data = await res.json();
      if (data.success) {
        await refreshDashboardData();
        setSelectedRequest(data.request);
      } else {
        alert("Withdrawal failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          managerId: currentUser.employeeId,
          comments: managerComments || "Approved based on multi-agent compliance validation."
        })
      });
      const data = await res.json();
      if (data.success) {
        setManagerComments("");
        setSelectedRequest(data.request);
        refreshDashboardData();
        alert("Request successfully approved. Purchase Order has been generated!");
      } else {
        alert("Approval failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error approving request: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          managerId: currentUser.employeeId,
          decision: "Rejected",
          comments: managerComments || "Rejected. Over budget or does not satisfy requirements."
        })
      });
      const data = await res.json();
      if (data.success) {
        setManagerComments("");
        setSelectedRequest(data.request);
        refreshDashboardData();
        alert("Request rejected.");
      } else {
        alert("Rejection failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error rejecting request: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClarify = async () => {
    if (!selectedRequest || !managerComments || actionLoading || !currentUser) {
      alert("Please provide comments outlining the clarification required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          managerId: currentUser.employeeId,
          decision: "Clarification Requested",
          comments: managerComments
        })
      });
      const data = await res.json();
      if (data.success) {
        setManagerComments("");
        setSelectedRequest(data.request);
        refreshDashboardData();
        alert("Clarification requested from employee.");
      } else {
        alert("Failed to request clarification: " + data.error);
      }
    } catch (e: any) {
      alert("Error requesting clarification: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Leave request submitted successfully (Mock).");
    setIsLeaveModalOpen(false);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Expense report submitted successfully (Mock).");
    setIsExpenseModalOpen(false);
  };

  const pendingRequests = requests.filter(
    r => r.currentStatus === "Submitted" || r.currentStatus === "AI Processing" || r.currentStatus === "Pending Manager"
  );
  const latestRequest = requests[0];

  const getUpdateIcon = (type: UpdateItem["type"]) => {
    switch (type) {
      case "campaign": return "campaign";
      case "policy": return "policy";
      case "leave": return "calendar_today";
      case "expense": return "receipt_long";
      case "procurement": return "shopping_cart";
      default: return "info";
    }
  };

  const agentWorkflowSteps = [
    { name: "Requirement Analysis Agent", label: "Requirement Analysis Completed" },
    { name: "Employee Context Agent", label: "Employee Profile Retrieved" },
    { name: "Inventory Agent", label: "Inventory Checked" },
    { name: "Budget Agent", label: "Budget Retrieved" },
    { name: "Vendor Intelligence Agent", label: "Vendor Comparison Completed" },
    { name: "Policy Agent", label: "Policy Validation Passed" },
    { name: "Risk Agent", label: "Risk Analysis Completed" },
    { name: "Recommendation Agent", label: "Recommendation Generated" },
    { name: "Notification Agent", label: "Notifications Dispatched" }
  ];

  // =========================================================================
  // DEVELOPER DASHBOARD ACTIONS
  // =========================================================================
  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/developer/collections");
      const data = await res.json();
      if (data.success) {
        setDbCollections(data.collections);
        // Default to first collection
        if (data.collections.length > 0) {
          fetchDocuments(data.collections[0].name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = async (colName: string) => {
    setDbEditorLoading(true);
    setSelectedDocument(null);
    setDocumentJsonText("");
    try {
      const res = await fetch("/api/developer/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionName: colName })
      });
      const data = await res.json();
      if (data.success) {
        setDbDocuments(data.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDbEditorLoading(false);
    }
  };

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const col = e.target.value;
    setSelectedCollection(col);
    fetchDocuments(col);
  };

  const selectDocumentForEditing = (doc: any) => {
    setSelectedDocument(doc);
    // Strip mongoose metadata fields so they are not editable in JSON
    const { _id, __v, createdAt, updatedAt, ...editableDoc } = doc;
    setDocumentJsonText(JSON.stringify(editableDoc, null, 2));
    setDbEditorSuccess("");
    setDbEditorError("");
  };

  const saveEditedDocument = async () => {
    if (!selectedDocument) return;
    setDbEditorSuccess("");
    setDbEditorError("");

    try {
      const parsedData = JSON.parse(documentJsonText);

      const res = await fetch("/api/developer/update-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollection,
          action: "update",
          docId: selectedDocument._id,
          data: parsedData
        })
      });

      const data = await res.json();
      if (data.success) {
        setDbEditorSuccess(`Mongoose record updated successfully! timestamp 'updatedAt/lastUpdatedAt' refreshed.`);
        // Reload list
        fetchDocuments(selectedCollection);
        setSelectedDocument(data.document);
        setDocumentJsonText(JSON.stringify(data.document, null, 2));
      } else {
        setDbEditorError("Update failed: " + data.error);
      }
    } catch (err: any) {
      setDbEditorError("JSON Syntax Error: " + err.message);
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument) return;
    if (!confirm("Are you sure you want to permanently delete this document?")) return;
    setDbEditorSuccess("");
    setDbEditorError("");

    try {
      const res = await fetch("/api/developer/update-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollection,
          action: "delete",
          docId: selectedDocument._id
        })
      });
      const data = await res.json();
      if (data.success) {
        setDbEditorSuccess("Document deleted successfully from MongoDB.");
        setSelectedDocument(null);
        setDocumentJsonText("");
        fetchDocuments(selectedCollection);
      } else {
        setDbEditorError("Deletion failed: " + data.error);
      }
    } catch (e: any) {
      setDbEditorError("Error: " + e.message);
    }
  };

  const showCreateDocumentTemplate = () => {
    // Generate default template based on collection schema
    const nextId = generateMongoId();
    setNewDocId(nextId);
    let template: any = {};
    if (selectedCollection === "User") {
      template = {
        name: "",
        email: "",
        username: "",
        password: "",
        role: "Employee",
        designation: "",
        department: "",
        managerId: "EMP-002",
        phone: "",
        location: "Remote"
      };
    } else if (selectedCollection === "Asset") {
      template = {
        assetId: "AST-110",
        assetName: "",
        category: "Laptop",
        serialNumber: "",
        assignedTo: "",
        department: "",
        condition: "New",
        status: "Available"
      };
    } else if (selectedCollection === "Vendor") {
      template = {
        vendorName: "",
        email: "",
        phone: "",
        address: "",
        gstNumber: "",
        rating: 4.5,
        averageDeliveryDays: 5,
        approved: true,
        products: []
      };
    } else if (selectedCollection === "DepartmentBudget") {
      template = {
        department: "",
        fiscalYear: "2026",
        allocatedBudget: 100000,
        usedBudget: 0,
        remainingBudget: 100000
      };
    } else {
      template = {
        key: "value"
      };
    }

    setSelectedDocument({ _id: "NEW_TEMPLATE" });
    setDocumentJsonText(JSON.stringify(template, null, 2));
    setDbEditorSuccess("");
    setDbEditorError("");
  };

  const saveNewDocument = async () => {
    setDbEditorSuccess("");
    setDbEditorError("");

    try {
      const parsedData = JSON.parse(documentJsonText);
      // Inject the generated MongoDB ID
      parsedData._id = newDocId;

      const res = await fetch("/api/developer/update-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollection,
          action: "create",
          data: parsedData
        })
      });

      const data = await res.json();
      if (data.success) {
        setDbEditorSuccess("New record successfully saved to MongoDB!");
        fetchDocuments(selectedCollection);
        setSelectedDocument(data.document);
        setDocumentJsonText(JSON.stringify(data.document, null, 2));
      } else {
        setDbEditorError("Creation failed: " + data.error);
      }
    } catch (err: any) {
      setDbEditorError("JSON Syntax Error: " + err.message);
    }
  };

  const handleDevUserProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionSuccessMsg("");
    setProvisionErrorMsg("");
    setProvisionLoading(true);

    try {
      const res = await fetch("/api/developer/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
          designation: newUserDesignation,
          department: newUserDepartment,
          managerId: newUserManagerId,
          phone: newUserPhone,
          location: newUserLocation
        })
      });

      const data = await res.json();
      if (data.success) {
        setProvisionSuccessMsg(`User profile provisioned. Account credentials email successfully sent to ${newUserEmail}!`);
        // Clear fields
        setNewUserName("");
        setNewUserEmail("");
        setNewUserUsername("");
        setNewUserPassword("");
        setNewUserDesignation("");
      } else {
        setProvisionErrorMsg(data.error || "Failed to provision user.");
      }
    } catch (err: any) {
      setProvisionErrorMsg("Error: " + err.message);
    } finally {
      setProvisionLoading(false);
    }
  };

  // Safe Loading check
  if (!currentUser) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#f9f9f9", fontFamily: "sans-serif" }}>
        <p>Loading session authentication details...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW RENDER: DEVELOPER DASHBOARD VIEW
  // =========================================================================
  if (currentUser.role === "Developer") {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "#000",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}
            >
              D
            </div>
            <div className={styles.title}>Developer Admin Console</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--on-surface-variant)" }}>
              Session: <strong>Amrendra (Developer)</strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 16px",
                backgroundColor: "var(--primary)",
                color: "var(--on-primary)",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px"
              }}
            >
              Log Out
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.welcomeSection}>
            <h1 className={styles.welcomeTitle}>Admin Administration Dashboard</h1>
            <p className={styles.welcomeSub}>Manage global MongoDB document collections and provision users with email notifications.</p>
          </section>

          {/* Dev Tab switchers */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--outline-variant)", gap: "16px" }}>
            <button
              onClick={() => setDevTab("provision")}
              style={{
                padding: "12px 16px",
                fontWeight: "bold",
                fontSize: "15px",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: devTab === "provision" ? "3px solid var(--primary)" : "none",
                color: devTab === "provision" ? "var(--primary)" : "var(--on-surface-variant)",
                cursor: "pointer"
              }}
            >
              User Provisioning (Mail Dispatch)
            </button>
            <button
              onClick={() => setDevTab("database")}
              style={{
                padding: "12px 16px",
                fontWeight: "bold",
                fontSize: "15px",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: devTab === "database" ? "3px solid var(--primary)" : "none",
                color: devTab === "database" ? "var(--primary)" : "var(--on-surface-variant)",
                cursor: "pointer"
              }}
            >
              MongoDB Direct Collection Editor
            </button>
          </div>

          {/* Tab 1: User Provisioning */}
          {devTab === "provision" && (
            <section
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--outline-variant)",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "700px",
                display: "flex",
                flexDirection: "column",
                gap: "24px"
              }}
            >
              <h3 style={{ fontSize: "20px", fontWeight: "700" }}>Provision Corporate User</h3>
              <p style={{ color: "var(--on-surface-variant)", fontSize: "14px", marginTop: "-16px" }}>
                Fills database records and automatically dispatches a credential email details to the entered address.
              </p>

              {provisionSuccessMsg && (
                <div style={{ padding: "12px 16px", backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9", borderRadius: "8px", fontSize: "14px" }}>
                  {provisionSuccessMsg}
                </div>
              )}
              {provisionErrorMsg && (
                <div style={{ padding: "12px 16px", backgroundColor: "#ffdad6", color: "#ba1a1a", border: "1px solid #ffb4ab", borderRadius: "8px", fontSize: "14px" }}>
                  {provisionErrorMsg}
                </div>
              )}

              <form onSubmit={handleDevUserProvisionSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Corporate Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. user@domain.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sarahj"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Security Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter login password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Portal Role</label>
                    <select
                      className={styles.formSelect}
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="Employee">Employee (Create Requests)</option>
                      <option value="Manager">Manager (Review & Approve Requests)</option>
                      <option value="Procurement">Procurement Officer (Inventory & Vendors)</option>
                      <option value="Admin">System Admin (Operations Manager)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Designation Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Lead Engineer"
                      value={newUserDesignation}
                      onChange={(e) => setNewUserDesignation(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department</label>
                    <select
                      className={styles.formSelect}
                      value={newUserDepartment}
                      onChange={(e) => setNewUserDepartment(e.target.value)}
                    >
                      <option value="AI Research">AI Research</option>
                      <option value="Operations">Operations</option>
                      <option value="Procurement">Procurement</option>
                      <option value="IT">IT Support</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Location</label>
                    <input
                      type="text"
                      value={newUserLocation}
                      onChange={(e) => setNewUserLocation(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={provisionLoading}
                  className={styles.btnPrimary}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "14px", marginTop: "12px" }}
                >
                  <span className="material-symbols-outlined">send</span>
                  {provisionLoading ? "Provisioning..." : "Add and Send Credentials Email"}
                </button>
              </form>
            </section>
          )}

          {/* Tab 2: MongoDB Collection Editor */}
          {devTab === "database" && (
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
              {/* Left Column: List of documents */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Collection Model</label>
                  <select
                    className={styles.formSelect}
                    value={selectedCollection}
                    onChange={handleCollectionChange}
                    style={{ fontWeight: "bold" }}
                  >
                    {dbCollections.map(c => (
                      <option key={c.name} value={c.name}>{c.label} ({c.name})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontWeight: "700" }}>Documents (Recent 100)</h4>
                  <button
                    onClick={showCreateDocumentTemplate}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#2e7d32",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    + Add Record
                  </button>
                </div>

                {dbEditorLoading ? (
                  <p>Loading documents...</p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "500px",
                      overflowY: "auto",
                      border: "1px solid var(--outline-variant)",
                      borderRadius: "8px",
                      padding: "8px",
                      backgroundColor: "var(--surface)"
                    }}
                  >
                    {dbDocuments.length === 0 ? (
                      <p style={{ padding: "16px", color: "var(--on-surface-variant)", fontSize: "13px" }}>No documents inside this collection.</p>
                    ) : (
                      dbDocuments.map(doc => {
                        const isSelected = selectedDocument?._id === doc._id;
                        // Pick a display identifier
                        const label = doc.name || doc.itemName || doc.policyName || doc.vendorName || doc.requestNumber || doc.title || doc._id;
                        return (
                          <div
                            key={doc._id}
                            onClick={() => selectDocumentForEditing(doc)}
                            style={{
                              padding: "10px",
                              backgroundColor: isSelected ? "var(--surface-container-highest)" : "var(--surface-container-low)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                              fontSize: "13px",
                              fontFamily: "var(--font-mono)",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {label}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: JSON code editor */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ fontWeight: "700" }}>Mongoose Document Editor</h4>

                {dbEditorSuccess && (
                  <div style={{ padding: "10px 14px", backgroundColor: "#e8f5e9", color: "#2e7d32", borderRadius: "6px", fontSize: "13px" }}>
                    {dbEditorSuccess}
                  </div>
                )}
                {dbEditorError && (
                  <div style={{ padding: "10px 14px", backgroundColor: "#ffdad6", color: "#ba1a1a", borderRadius: "6px", fontSize: "13px" }}>
                    {dbEditorError}
                  </div>
                )}

                {selectedDocument ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--on-surface-variant)" }}>
                      Document ID: <strong>{selectedDocument._id === "NEW_TEMPLATE" ? `${newDocId} (Generated)` : selectedDocument._id}</strong>
                    </div>

                    <textarea
                      style={{
                        width: "100%",
                        height: "380px",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid var(--outline-variant)",
                        backgroundColor: "#1e1e1e",
                        color: "#d4d4d4",
                        outline: "none"
                      }}
                      value={documentJsonText}
                      onChange={(e) => setDocumentJsonText(e.target.value)}
                    />

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      {selectedDocument._id !== "NEW_TEMPLATE" && (
                        <button
                          onClick={deleteDocument}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#ba1a1a",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "14px"
                          }}
                        >
                          Delete Document
                        </button>
                      )}

                      <button
                        onClick={selectedDocument._id === "NEW_TEMPLATE" ? saveNewDocument : saveEditedDocument}
                        className={styles.btnPrimary}
                        style={{ padding: "10px 20px", fontSize: "14px" }}
                      >
                        {selectedDocument._id === "NEW_TEMPLATE" ? "Save New Document" : "Save Document Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px dashed var(--outline-variant)",
                      borderRadius: "8px",
                      padding: "48px",
                      textAlign: "center",
                      color: "var(--on-surface-variant)"
                    }}
                  >
                    Select a document on the left to edit its schema values in raw JSON structure.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW RENDER: STANDARD EMPLOYEE/MANAGER VIEW
  // =========================================================================
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 16px" }}>
          <div
            className={styles.avatar}
            style={{
              backgroundColor: avatarBg,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "16px",
              fontFamily: "var(--font-sans)",
              userSelect: "none"
            }}
          >
            {firstLetter}
          </div>
          <div className={styles.title}>Employee Portal</div>
        </div>

        {/* Logout container */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 16px",
              backgroundColor: "var(--primary)",
              color: "var(--on-primary)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px"
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.welcomeSection}>
          <h1 className={styles.welcomeTitle}>Welcome back, {currentUser.name}!</h1>
          <p className={styles.welcomeSub}>
            Role: <strong style={{ color: "var(--primary)" }}>{currentUser.role}</strong>. Designation: {currentUser.designation}.
          </p>
        </section>

        <section className={styles.actionsSection}>
          <h2 className={styles.sectionHeader}>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--primary-fixed)", color: "var(--primary)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              </div>
              <span className={styles.actionText}>Request Leave</span>
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--secondary-fixed)", color: "var(--secondary)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
              </div>
              <span className={styles.actionText}>Submit Expense</span>
            </button>
            <button
              onClick={() => setIsProcureModalOpen(true)}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--tertiary-fixed)", color: "var(--tertiary)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
              </div>
              <span className={styles.actionText}>New Order</span>
            </button>
            <button
              onClick={() => alert("Multi-agent procurement automates verification details on demand.")}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              </div>
              <span className={styles.actionText}>AI Agents Info</span>
            </button>
          </div>
        </section>

        <section className={styles.bentoSection}>
          <div className={styles.bentoCard}>
            <div className={styles.bentoHeader}>
              <div className={styles.bentoTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: "var(--tertiary)" }}>shopping_cart</span>
                <h3 className={styles.bentoTitle}>Procurement</h3>
              </div>
            </div>
            <div className={styles.bentoBody}>
              <div className={styles.bentoBodyCenter}>
                <span className={styles.bentoValue} style={{ color: "var(--tertiary)" }}>{pendingRequests.length}</span>
                <span className={styles.bentoSubvalue} style={{ display: "block" }}>Active AI / Pending Requests</span>
              </div>
            </div>
            <div className={styles.bentoFooter}>
              <span>Latest: {latestRequest ? latestRequest.itemName : "None"}</span>
              {latestRequest && (
                <span className={styles.bentoTag} style={{ fontSize: "10px", fontWeight: "bold" }}>
                  {latestRequest.currentStatus}
                </span>
              )}
            </div>
          </div>

          <div className={styles.bentoCard}>
            <div className={styles.bentoHeader}>
              <div className={styles.bentoTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>calendar_today</span>
                <h3 className={styles.bentoTitle}>Leave</h3>
              </div>
            </div>
            <div className={styles.bentoBody}>
              <div className={styles.bentoBodyGrid}>
                <div className={styles.balanceBlock} style={{ backgroundColor: "var(--primary-fixed)" }}>
                  <span className={styles.balanceValue} style={{ color: "var(--on-primary-fixed-variant)" }}>14</span>
                  <span className={styles.balanceLabel}>Days Balance</span>
                </div>
                <div className={styles.balanceBlock} style={{ backgroundColor: "var(--surface-container)" }}>
                  <span className={styles.balanceValue} style={{ color: "var(--on-surface)" }}>1</span>
                  <span className={styles.balanceLabel}>Pending Request</span>
                </div>
              </div>
            </div>
            <div className={styles.bentoFooter}>
              <span>Upcoming: Nov 24 - Nov 28</span>
            </div>
          </div>

          <div className={styles.bentoCard}>
            <div className={styles.bentoHeader}>
              <div className={styles.bentoTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: "var(--secondary)" }}>receipt_long</span>
                <h3 className={styles.bentoTitle}>Research Budget</h3>
              </div>
            </div>
            <div className={styles.bentoBody}>
              <div className={styles.bentoBodyProgress}>
                <div className={styles.progressHeader} style={{ fontSize: "13px" }}>
                  <span style={{ color: "var(--on-surface-variant)" }}>Remaining AI Dept Budget</span>
                  <span style={{ color: "var(--on-surface)", fontWeight: "bold" }}>
                    ₹{budgetData.remaining.toLocaleString()} / ₹{budgetData.allocated.toLocaleString()}
                  </span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      backgroundColor: "var(--secondary)",
                      width: `${(budgetData.remaining / budgetData.allocated) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.bentoFooter}>
              <span>Used Budget: ₹{budgetData.used.toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }} className="md:grid-cols-3">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="md:col-span-1">
            <h2 className={styles.sectionHeader}>
              {portalViewRole === "Employee" ? "My Requests" : "All Requests for Review"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {requests.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: "12px", color: "var(--on-surface-variant)" }}>
                  No requests submitted yet. Use "New Order" to create one.
                </div>
              ) : (
                requests.map((r) => {
                  const isSelected = selectedRequest?._id === r._id;
                  let statusBg = "var(--surface-container-highest)";
                  let statusColor = "var(--on-surface-variant)";

                  if (r.currentStatus === "Approved" || r.currentStatus === "Purchase Ordered" || r.currentStatus === "Delivered") {
                    statusBg = "#e8f5e9";
                    statusColor = "#2e7d32";
                  } else if (r.currentStatus === "Rejected") {
                    statusBg = "#ffeacc";
                    statusColor = "#c62828";
                  } else if (r.currentStatus === "AI Processing") {
                    statusBg = "#e3f2fd";
                    statusColor = "#1565c0";
                  }

                  return (
                    <div
                      key={r._id}
                      onClick={() => setSelectedRequest(r)}
                      style={{
                        padding: "16px",
                        backgroundColor: isSelected ? "var(--surface-container-high)" : "var(--surface)",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--outline-variant)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "bold" }}>
                          {r.requestNumber}
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            backgroundColor: statusBg,
                            color: statusColor
                          }}
                        >
                          {r.currentStatus}
                        </span>
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "bold" }}>{r.itemName}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--on-surface-variant)" }}>
                        <span>Qty: {r.quantity} | Cost: ₹{r.estimatedCost.toLocaleString()}</span>
                        <span>Priority: {r.priority}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="md:col-span-2">
            <h2 className={styles.sectionHeader}>Live AI Workflow & Decision Brief</h2>

            {selectedRequest ? (
              <div
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px"
                }}
              >
                <div style={{ borderBottom: "1px solid var(--outline-variant)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: "22px", fontWeight: "700" }}>{selectedRequest.itemName}</h3>
                      <p style={{ color: "var(--on-surface-variant)", fontSize: "14px", marginTop: "4px" }}>
                        Requested by: Employee {selectedRequest.employeeId} on {new Date(selectedRequest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>₹{selectedRequest.estimatedCost.toLocaleString()}</div>
                      <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--on-surface-variant)", marginTop: "4px" }}>
                        Status: <strong style={{ color: "var(--primary)" }}>{selectedRequest.currentStatus}</strong>
                      </div>
                    </div>
                  </div>
                  {selectedRequest.justification && (
                    <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                      <strong>Justification:</strong> "{selectedRequest.justification}"
                    </div>
                  )}
                  {selectedRequest.specifications && (
                    <div style={{ marginTop: "8px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                      <strong>Specifications:</strong> "{selectedRequest.specifications}"
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>timeline</span>
                    AI Coordinator Agent Pipeline
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", paddingLeft: "24px" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "9px",
                        top: "10px",
                        bottom: "10px",
                        width: "2px",
                        backgroundColor: "var(--outline-variant)"
                      }}
                    />

                    {agentWorkflowSteps.map((step, idx) => {
                      const log = workflowLogs.find(l => l.agentName === step.name);
                      const isCompleted = log && log.status === "Completed";
                      const isFailed = log && log.status === "Failed";

                      const isProcessing = !log && (
                        selectedRequest.currentStatus === "AI Processing" ||
                        selectedRequest.currentStatus === "Submitted"
                      ) && (
                          idx === workflowLogs.length
                        );

                      let stepTextColor = "var(--on-surface-variant)";
                      let stepIcon = "circle";
                      let iconColor = "var(--outline-variant)";

                      if (isCompleted) {
                        stepTextColor = "var(--on-surface)";
                        stepIcon = "check_circle";
                        iconColor = "#2e7d32";
                      } else if (isFailed) {
                        stepTextColor = "#ba1a1a";
                        stepIcon = "error";
                        iconColor = "#ba1a1a";
                      } else if (isProcessing) {
                        stepTextColor = "var(--on-surface)";
                        stepIcon = "sync";
                        iconColor = "var(--secondary)";
                      }

                      const isExpanded = expandedLogIndex === idx;

                      return (
                        <div key={step.name} style={{ position: "relative" }}>
                          <div
                            style={{
                              position: "absolute",
                              left: "-24px",
                              top: "2px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "99px",
                              backgroundColor: "var(--surface)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 10
                            }}
                          >
                            <span
                              className={`material-symbols-outlined ${isProcessing ? "animate-spin" : ""}`}
                              style={{
                                fontSize: "18px",
                                color: iconColor,
                                fontVariationSettings: isCompleted ? "'FILL' 1" : ""
                              }}
                            >
                              {stepIcon}
                            </span>
                          </div>

                          <div
                            onClick={() => isCompleted && setExpandedLogIndex(isExpanded ? null : idx)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              cursor: isCompleted ? "pointer" : "default",
                              backgroundColor: isExpanded ? "var(--surface-container-low)" : "transparent",
                              transition: "background-color 0.2s ease"
                            }}
                          >
                            <span style={{ fontSize: "14px", fontWeight: isProcessing ? "700" : "500", color: stepTextColor }}>
                              {isCompleted ? `✓ ${step.label}` : isProcessing ? `⏳ Processing ${step.label}...` : step.label}
                            </span>
                            {isCompleted && (
                              <span className="material-symbols-outlined" style={{ fontSize: "18px", transform: isExpanded ? "rotate(180deg)" : "" }}>
                                expand_more
                              </span>
                            )}
                          </div>

                          {isCompleted && isExpanded && log && (
                            <div
                              style={{
                                marginTop: "8px",
                                marginLeft: "8px",
                                padding: "16px",
                                backgroundColor: "var(--surface-container-lowest)",
                                border: "1px solid var(--outline-variant)",
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                fontSize: "13px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)" }}>
                                <span>Agent: <strong>{log.agentName}</strong></span>
                                <span>Confidence: <strong style={{ color: "#2e7d32" }}>{log.confidence}%</strong></span>
                              </div>
                              <div style={{ color: "var(--on-surface-variant)", lineHeight: "1.4" }}>
                                <strong>Reasoning:</strong> {log.reasoning}
                              </div>
                              {log.evidence && (
                                <div style={{ marginTop: "4px" }}>
                                  <details>
                                    <summary style={{ cursor: "pointer", fontWeight: "bold", outline: "none" }}>Show Queried Sources / Raw Data</summary>
                                    <pre style={{
                                      marginTop: "8px",
                                      padding: "8px",
                                      backgroundColor: "var(--surface-container-high)",
                                      borderRadius: "4px",
                                      overflowX: "auto",
                                      fontSize: "11px",
                                      fontFamily: "var(--font-mono)"
                                    }}>
                                      {JSON.stringify(JSON.parse(log.evidence), null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "flex-end", color: "var(--on-surface-variant)", fontSize: "11px" }}>
                                <span>Execution time: {log.executionTime}ms</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedRequest.currentStatus === "Pending Manager" && (
                  <div
                    style={{
                      borderTop: "2px dashed var(--outline-variant)",
                      paddingTop: "24px",
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="material-symbols-outlined" style={{ color: "#f57c00" }}>assignment_late</span>
                      <h4 style={{ fontSize: "18px", fontWeight: "700" }}>AI Synthesis Decision Brief</h4>
                    </div>

                    <div
                      style={{
                        padding: "18px",
                        backgroundColor: "#fef8f0",
                        border: "1px solid #ffe0b2",
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#e65100" }}>
                          AI Recommendation: {selectedRequest.aiRecommendation || "Approve"}
                        </span>
                        <span style={{
                          backgroundColor: "#e65100",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}>
                          {selectedRequest.confidence || 95}% confidence
                        </span>
                      </div>

                      <ul style={{ paddingLeft: "18px", listStyleType: "disc", fontSize: "14px", color: "#5d4037", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {workflowLogs
                          .filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Recommendation Agent")
                          .map((log, idx) => (
                            <li key={idx}>
                              <strong>{log.agentName}:</strong> {log.reasoning}
                            </li>
                          ))
                        }
                        {workflowLogs.filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Recommendation Agent").length === 0 && (
                          <li>AI Coordinator agents are compiling audit results...</li>
                        )}
                      </ul>
                    </div>

                    {portalViewRole === "Manager" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600" }}>Manager Approval Comments</label>
                        <textarea
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid var(--outline-variant)",
                            fontSize: "14px",
                            minHeight: "80px",
                            outline: "none",
                            backgroundColor: "var(--background)",
                            color: "var(--on-surface)"
                          }}
                          placeholder="Add approval comments or query explanations..."
                          value={managerComments}
                          onChange={(e) => setManagerComments(e.target.value)}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                          <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: "#2e7d32",
                              color: "white",
                              border: "none",
                              padding: "12px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            <span className="material-symbols-outlined">check_circle</span>
                            Approve
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: "#c62828",
                              color: "white",
                              border: "none",
                              padding: "12px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            <span className="material-symbols-outlined">cancel</span>
                            Reject
                          </button>
                          <button
                            onClick={handleClarify}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: "#ef6c00",
                              color: "white",
                              border: "none",
                              padding: "12px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            <span className="material-symbols-outlined">chat_bubble</span>
                            Clarify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%" }}>
                        {["Submitted", "AI Processing", "Pending Manager"].includes(selectedRequest.currentStatus) && (
                          <button
                            onClick={handleWithdraw}
                            disabled={actionLoading}
                            style={{
                              width: "100%",
                              padding: "12px",
                              backgroundColor: "transparent",
                              color: "#ba1a1a",
                              border: "1px solid #ba1a1a",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              fontSize: "14px",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>undo</span>
                            {actionLoading ? "Withdrawing..." : "Retrieve / Withdraw Request"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedRequest.currentStatus === "Purchase Ordered" && (
                  <div
                    style={{
                      borderTop: "2px dashed var(--outline-variant)",
                      paddingTop: "24px",
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2e7d32" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>local_shipping</span>
                      <h4 style={{ fontSize: "18px", fontWeight: "700" }}>Purchase Order Issued</h4>
                    </div>
                    <div style={{ padding: "16px", backgroundColor: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: "12px", fontSize: "14px" }}>
                      A purchase order has been generated automatically and dispatched to the recommended vendor.
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        <div>PO Number: <strong>PO-2026-NBD</strong></div>
                        <div>Estimated Delivery: <strong>5 Days</strong></div>
                        <div>Vendor: <strong>Dell Inc</strong></div>
                        <div>Authorized By: <strong>Sarah Jenkins</strong></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  border: "1px dashed var(--outline-variant)",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px",
                  color: "var(--on-surface-variant)",
                  textAlign: "center"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--outline)" }}>
                  shopping_bag
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginTop: "16px" }}>No Request Selected</h3>
                <p style={{ fontSize: "14px", marginTop: "4px" }}>
                  Select an active procurement request from the list to view its real-time AI Agent execution tracking and manager decision brief.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={styles.updatesSection}>
          <h2 className={styles.sectionHeader}>Recent System Activity</h2>
          <div className={styles.updatesCard}>
            {recentUpdates.map((update) => (
              <div key={update.id} className={styles.updateItem}>
                <div className={styles.updateIcon}>
                  <span className="material-symbols-outlined">{getUpdateIcon(update.type)}</span>
                </div>
                <div className={styles.updateContent}>
                  <h4 className={styles.updateHeader}>{update.title}</h4>
                  <p className={styles.updateText}>{update.description}</p>
                  <span className={styles.updateTime}>{update.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className={styles.bottomNav}>
        <button
          onClick={() => setActiveTab("home")}
          className={`${styles.navButton} ${activeTab === "home" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "home" ? "'FILL' 1" : "" }}>dashboard</span>
          <span className={styles.navButtonText}>Home</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("procure");
            setIsProcureModalOpen(true);
          }}
          className={`${styles.navButton} ${activeTab === "procure" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "procure" ? "'FILL' 1" : "" }}>shopping_cart</span>
          <span className={styles.navButtonText}>Procure</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("leave");
            setIsLeaveModalOpen(true);
          }}
          className={`${styles.navButton} ${activeTab === "leave" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "leave" ? "'FILL' 1" : "" }}>calendar_today</span>
          <span className={styles.navButtonText}>Leave</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("expenses");
            setIsExpenseModalOpen(true);
          }}
          className={`${styles.navButton} ${activeTab === "expenses" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "expenses" ? "'FILL' 1" : "" }}>receipt_long</span>
          <span className={styles.navButtonText}>Expenses</span>
        </button>
      </nav>

      {isLeaveModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsLeaveModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Request Leave</h3>
              <button className={styles.modalClose} onClick={() => setIsLeaveModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleLeaveSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Leave Type</label>
                  <select
                    className={styles.formSelect}
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                  >
                    <option>Annual Leave</option>
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>Maternity/Paternity Leave</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Start Date</label>
                  <input
                    type="date"
                    required
                    className={styles.formInput}
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>End Date</label>
                  <input
                    type="date"
                    required
                    className={styles.formInput}
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reason</label>
                  <input
                    type="text"
                    placeholder="Enter reason for leave..."
                    className={styles.formInput}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsLeaveModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsExpenseModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Submit Expense</h3>
              <button className={styles.modalClose} onClick={() => setIsExpenseModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <select
                    className={styles.formSelect}
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                  >
                    <option>Meals</option>
                    <option>Travel</option>
                    <option>Office Equipment</option>
                    <option>Software/Subscriptions</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    className={styles.formInput}
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter expense details (e.g. Client Dinner)..."
                    className={styles.formInput}
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Submit Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProcureModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProcureModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create AI-Analyzed Procurement Order</h3>
              <button className={styles.modalClose} onClick={() => setIsProcureModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleProcureSubmit}>
              <div className={styles.modalBody}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell Precision Laptop"
                      className={styles.formInput}
                      value={procureItem}
                      onChange={(e) => setProcureItem(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category</label>
                    <select
                      className={styles.formSelect}
                      value={procureCategory}
                      onChange={(e) => setProcureCategory(e.target.value)}
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Software">Software</option>
                      <option value="Cloud Credits">Cloud Credits</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Preferred Vendor</label>
                    <select
                      className={styles.formSelect}
                      value={procureVendor}
                      onChange={(e) => setProcureVendor(e.target.value)}
                    >
                      <option value="Dell Inc">Dell Inc (Approved)</option>
                      <option value="HP Store">HP Store (Approved)</option>
                      <option value="Apple Enterprise">Apple Enterprise (Approved)</option>
                      <option value="Blacklisted Hardware">Blacklisted Hardware (Warning!)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Estimated Unit Cost (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2499"
                      className={styles.formInput}
                      value={procureCost}
                      onChange={(e) => setProcureCost(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className={styles.formInput}
                      value={procureQty}
                      onChange={(e) => setProcureQty(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority</label>
                    <select
                      className={styles.formSelect}
                      value={procurePriority}
                      onChange={(e) => setProcurePriority(e.target.value)}
                    >
                      <option value="Low">Low (Non-urgent replenishment)</option>
                      <option value="Medium">Medium (Standard upgrade)</option>
                      <option value="High">High (Immediate work block)</option>
                      <option value="Critical">Critical (System downtime)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Business Justification</label>
                  <textarea
                    required
                    placeholder="Explain why this equipment is needed..."
                    className={styles.formInput}
                    style={{ minHeight: "80px", outline: "none", resize: "none" }}
                    value={procureReason}
                    onChange={(e) => setProcureReason(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Product Specifications (Optional)</label>
                  <textarea
                    placeholder="Describe specific models, brands, or technical specs (e.g. 16GB RAM, 512GB SSD)..."
                    className={styles.formInput}
                    style={{ minHeight: "60px", outline: "none", resize: "none" }}
                    value={procureSpecs}
                    onChange={(e) => setProcureSpecs(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsProcureModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>smart_toy</span>
                  Initiate AI Analysis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
