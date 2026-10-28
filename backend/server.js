
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Database
const db = new Database("courier-tracking.db");

// Create shipments table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id TEXT UNIQUE NOT NULL,
    sender_name TEXT NOT NULL,
    sender_phone TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    receiver_address TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    weight REAL NOT NULL,
    delivery_type TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT NOT NULL,
    estimated TEXT NOT NULL,
    progress INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// Format shipment for the frontend
function formatShipment(row) {
  if (!row) return null;

  return {
    id: row.tracking_id,
    trackingId: row.tracking_id,
    status: row.status,
    origin: row.origin,
    destination: row.destination,
    estimated: row.estimated,
    progress: row.progress,
    description: row.description,
    weight: row.weight,
    price: row.price,
    deliveryType: row.delivery_type,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    senderAddress: row.sender_address,
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone,
    receiverAddress: row.receiver_address,
    createdAt: row.created_at,
  };
}

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "ParcelTrack Pro backend is running!",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// GET ALL SHIPMENTS - Admin Dashboard
app.get("/api/shipments", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT *
      FROM shipments
      ORDER BY id DESC
    `).all();

    res.json(rows.map(formatShipment));
  } catch (error) {
    console.error("List shipments error:", error);

    res.status(500).json({
      message: "Unable to load shipments.",
    });
  }
});

// CREATE A PARCEL BOOKING
app.post("/api/shipments", (req, res) => {
  try {
    const {
      senderName,
      senderPhone,
      senderAddress,
      receiverName,
      receiverPhone,
      receiverAddress,
      origin,
      destination,
      weight,
      deliveryType,
    } = req.body;

    if (
      !senderName?.trim() ||
      !senderPhone?.trim() ||
      !senderAddress?.trim() ||
      !receiverName?.trim() ||
      !receiverPhone?.trim() ||
      !receiverAddress?.trim()
    ) {
      return res.status(400).json({
        message: "Please provide all sender and receiver details.",
      });
    }

    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0.1 ||
      weight > 100
    ) {
      return res.status(400).json({
        message: "Weight must be between 0.1 kg and 100 kg.",
      });
    }

    if (!["Standard", "Express"].includes(deliveryType)) {
      return res.status(400).json({
        message: "Invalid delivery type.",
      });
    }

    const price = Math.max(
      60,
      weight * (deliveryType === "Express" ? 120 : 60)
    );

    let trackingId;

    // Generate a unique tracking ID
    do {
      trackingId =
        "PTR" +
        Date.now().toString().slice(-8) +
        Math.floor(Math.random() * 90 + 10);
    } while (
      db.prepare(
        "SELECT tracking_id FROM shipments WHERE tracking_id = ?"
      ).get(trackingId)
    );

    const estimatedDate = new Date();

    estimatedDate.setDate(
      estimatedDate.getDate() +
        (deliveryType === "Express" ? 1 : 3)
    );

    const estimated = estimatedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const statement = db.prepare(`
      INSERT INTO shipments (
        tracking_id,
        sender_name,
        sender_phone,
        sender_address,
        receiver_name,
        receiver_phone,
        receiver_address,
        origin,
        destination,
        weight,
        delivery_type,
        price,
        status,
        estimated,
        progress,
        description,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      trackingId,
      senderName.trim(),
      senderPhone.trim(),
      senderAddress.trim(),
      receiverName.trim(),
      receiverPhone.trim(),
      receiverAddress.trim(),
      (typeof origin === "string" && origin.trim())
        ? origin.trim()
        : senderAddress.trim(),
      (typeof destination === "string" && destination.trim())
        ? destination.trim()
        : receiverAddress.trim(),
      weight,
      deliveryType,
      price,
      "Booked",
      estimated,
      10,
      "Your shipment booking has been confirmed.",
      new Date().toISOString()
    );

    res.status(201).json({
      trackingId,
      price,
      message: "Booking created successfully.",
    });
  } catch (error) {
    console.error("Booking error:", error);

    res.status(500).json({
      message: "Unable to create booking.",
    });
  }
});

// GET ONE SHIPMENT BY TRACKING ID
app.get("/api/shipments/:trackingId", (req, res) => {
  try {
    const trackingId = req.params.trackingId.trim().toUpperCase();

    const row = db.prepare(`
      SELECT *
      FROM shipments
      WHERE tracking_id = ?
    `).get(trackingId);

    if (!row) {
      return res.status(404).json({
        message: "Shipment not found.",
      });
    }

    res.json(formatShipment(row));
  } catch (error) {
    console.error("Get shipment error:", error);

    res.status(500).json({
      message: "Unable to retrieve shipment.",
    });
  }
});

// UPDATE SHIPMENT STATUS
app.patch("/api/shipments/:trackingId/status", (req, res) => {
  try {
    const allowedStatuses = [
      "Booked",
      "Picked up",
      "In transit",
      "Out for delivery",
      "Delivered",
    ];

    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid shipment status.",
      });
    }

    const progressByStatus = {
      "Booked": 10,
      "Picked up": 30,
      "In transit": 60,
      "Out for delivery": 85,
      "Delivered": 100,
    };

    const descriptionByStatus = {
      "Booked": "Your shipment booking has been confirmed.",
      "Picked up": "Your parcel has been picked up by the courier.",
      "In transit": "Your parcel is travelling to its destination.",
      "Out for delivery": "Your parcel is with the local delivery team.",
      "Delivered": "Your parcel has been delivered.",
    };

    const trackingId = req.params.trackingId.trim().toUpperCase();

    const result = db.prepare(`
      UPDATE shipments
      SET status = ?, progress = ?, description = ?
      WHERE tracking_id = ?
    `).run(
      status,
      progressByStatus[status],
      descriptionByStatus[status],
      trackingId
    );

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Shipment not found.",
      });
    }

    const updatedRow = db.prepare(`
      SELECT *
      FROM shipments
      WHERE tracking_id = ?
    `).get(trackingId);

    res.json(formatShipment(updatedRow));
  } catch (error) {
    console.error("Update shipment status error:", error);

    res.status(500).json({
      message: "Unable to update shipment status.",
    });
  }
});

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `ParcelTrack Pro backend running at http://localhost:${PORT}`
  );
});
