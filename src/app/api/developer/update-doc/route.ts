import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import * as models from "@/lib/models"; // Ensures all models are registered

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { collectionName, action, docId, data } = body;

    if (!collectionName || !action) {
      return NextResponse.json(
        { success: false, error: "collectionName and action are required." },
        { status: 400 }
      );
    }

    const Model = mongoose.models[collectionName];
    if (!Model) {
      return NextResponse.json(
        { success: false, error: `Model for collection "${collectionName}" not found.` },
        { status: 400 }
      );
    }

    if (action === "update") {
      if (!docId || !data) {
        return NextResponse.json(
          { success: false, error: "docId and data are required for updates." },
          { status: 400 }
        );
      }

      const doc = await Model.findById(docId);
      if (!doc) {
        return NextResponse.json(
          { success: false, error: "Document not found." },
          { status: 404 }
        );
      }

      // Apply data changes
      // Remove mongoose internal fields if sent
      const updateData = { ...data };
      delete updateData._id;
      delete updateData.__v;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      doc.set(updateData);

      // Handle custom lastUpdatedAt or standard updatedAt field updates
      if (Model.schema.paths["lastUpdatedAt"]) {
        doc.set("lastUpdatedAt", new Date());
      }
      if (Model.schema.paths["updatedAt"]) {
        doc.set("updatedAt", new Date());
      }

      await doc.save();

      return NextResponse.json({
        success: true,
        message: "Document updated successfully.",
        document: doc
      });

    } else if (action === "create") {
      if (!data) {
        return NextResponse.json(
          { success: false, error: "data is required for creation." },
          { status: 400 }
        );
      }

      const newDoc = new Model(data);

      if (Model.schema.paths["lastUpdatedAt"]) {
        newDoc.set("lastUpdatedAt", new Date());
      }
      if (Model.schema.paths["updatedAt"]) {
        newDoc.set("updatedAt", new Date());
      }

      await newDoc.save();

      return NextResponse.json({
        success: true,
        message: "Document created successfully.",
        document: newDoc
      });

    } else if (action === "delete") {
      if (!docId) {
        return NextResponse.json(
          { success: false, error: "docId is required for deletion." },
          { status: 400 }
        );
      }

      await Model.findByIdAndDelete(docId);

      return NextResponse.json({
        success: true,
        message: "Document deleted successfully."
      });

    } else {
      return NextResponse.json(
        { success: false, error: `Invalid action "${action}". Use 'update', 'create', or 'delete'.` },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error("Database Editor API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
