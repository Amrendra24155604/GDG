"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        // Store user details in localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setError(data.error || "Authentication failed.");
      }
    } catch (err: any) {
      setError("An error occurred during login. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9f9f9",
        fontFamily: "'Hanken Grotesk', sans-serif",
        padding: "20px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e2e2",
          borderRadius: "16px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.04)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#000000",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 auto"
            }}
          >
            P
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#1a1c1c", marginTop: "8px" }}>
            Enterprise Portal Login
          </h1>
          <p style={{ fontSize: "14px", color: "#646464" }}>
            Sign in to access leaves, expenses, and procurement multi-agent workflows.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: "#ffdad6",
              color: "#ba1a1a",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              border: "1px solid #ffb4ab",
              fontWeight: "500",
              lineHeight: "1.4"
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: "600",
                color: "#4c4546"
              }}
            >
              USERNAME OR EMAIL
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Amrendra or email@company.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e2e2",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: "600",
                color: "#4c4546"
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e2e2",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px",
              backgroundColor: "#000000",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "opacity 0.2s",
              marginTop: "8px"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div
          style={{
            borderTop: "1px solid #e2e2e2",
            paddingTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#525252", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🔑 Demo Login Accounts (1-Click Fill)
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                setUsername("Ankush");
                setPassword("Ankush@123");
              }}
              style={{
                padding: "10px 12px",
                backgroundColor: "#fafafa",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                <strong style={{ fontSize: "13px", color: "#0a0a0a", display: "block" }}>👤 User (Employee)</strong>
                <span style={{ fontSize: "12px", color: "#525252" }}>Username: <strong>Ankush</strong> | Pass: <strong>Ankush@123</strong></span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "bold", backgroundColor: "#000000", color: "#ffffff", padding: "4px 8px", borderRadius: "4px" }}>
                Fill
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername("Raja babu");
                setPassword("Ankush@123");
              }}
              style={{
                padding: "10px 12px",
                backgroundColor: "#fafafa",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                <strong style={{ fontSize: "13px", color: "#0a0a0a", display: "block" }}>👔 Manager</strong>
                <span style={{ fontSize: "12px", color: "#525252" }}>Username: <strong>Raja babu</strong> | Pass: <strong>Ankush@123</strong></span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "bold", backgroundColor: "#000000", color: "#ffffff", padding: "4px 8px", borderRadius: "4px" }}>
                Fill
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername("Amrendra");
                setPassword("Ankush@123");
              }}
              style={{
                padding: "10px 12px",
                backgroundColor: "#fafafa",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                <strong style={{ fontSize: "13px", color: "#0a0a0a", display: "block" }}>💻 Developer (Admin)</strong>
                <span style={{ fontSize: "12px", color: "#525252" }}>Username: <strong>Amrendra</strong> | Pass: <strong>Ankush@123</strong></span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "bold", backgroundColor: "#000000", color: "#ffffff", padding: "4px 8px", borderRadius: "4px" }}>
                Fill
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
