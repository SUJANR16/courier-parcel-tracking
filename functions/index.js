
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

setGlobalOptions({ maxInstances: 10 });

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const shipments = db.collection("shipments");

const STATUSES = {
  "Booked": {
    progress: 10,
    description: "Your shipment booking has been confirmed.",
  },
  "Picked up": {
    progress: 30,
    description: "Your parcel has been picked up by the courier.",
  },
  "In transit": {
    progress: 60,
    description: "Your parcel is travelling to its destination.",
  },
  "Out for delivery": {
    progress: 85,
    description: "Your parcel is with the local delivery team.",
  },
  "Delivered": {
    progress: 100,
    description: "Your parcel has been delivered.",
  },
};

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function publicShipment(data) {
  return {
    id: data.trackingId,
    trackingId: data.trackingId,
    status: data.status,
    origin: data.origin,
    destination: data.destination,
    estimated: data.estimated,
    progress: data.progress,
    description: data.description,
    weight: data.weight,
    price: data.price,
    deliveryType: data.deliveryType,
    createdAt: data.createdAt,
    events: data.events || [],
  };
}

async function requireAdmin(req, res) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);

  if (!match) {
    sendError(res, 401, "Administrator sign-in is required.");
    return false;
  }

  try {
    const decoded = await getAuth().verifyIdToken(match[1]);

    if (decoded.admin !== true) {
      sendError(res, 403, "Administrator permission is required.");
      return false;
    }

    return true;
  } catch (error) {
    sendError(res, 401, "Your sign-in token is invalid or expired.");
    return false;
  }
}

exports.api = onRequest(
  { cors: true },
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    const path = req.path.replace(/\/+$/, "") || "/";
    const method = req.method.toUpperCase();

    try {
      if (method === "GET" && path === "/api/health") {
        return res.json({ status: "OK" });
      }

      if (method === "POST" && path === "/api/shipments") {
        const body = req.body || {};

        const senderName = normalizeText(body.senderName);
        const senderPhone = normalizeText(body.senderPhone);
        const senderAddress = normalizeText(body.senderAddress);
        const receiverName = normalizeText(body.receiverName);
        const receiverPhone = normalizeText(body.receiverPhone);
        const receiverAddress = normalizeText(body.receiverAddress);
        const origin = normalizeText(body.origin);
        const destination = normalizeText(body.destination);
        const weight = Number(body.weight);
        const deliveryType = body.deliveryType;

        if (
          !senderName ||
          !senderPhone ||
          !senderAddress ||
          !receiverName ||
          !receiverPhone ||
          !receiverAddress ||
          !origin ||
          !destination
        ) {
          return sendError(
            res,
            400,
            "Please provide all sender, receiver, origin and destination details."
          );
        }

        if (
          !Number.isFinite(weight) ||
          weight < 0.1 ||
          weight > 100
        ) {
          return sendError(
            res,
            400,
            "Parcel weight must be between 0.1 kg and 100 kg."
          );
        }

        if (!["Standard", "Express"].includes(deliveryType)) {
          return sendError(res, 400, "Invalid delivery type.");
        }

        const price = Math.max(
          60,
          weight * (deliveryType === "Express" ? 120 : 60)
        );

        const estimatedDate = new Date();
        estimatedDate.setDate(
          estimatedDate.getDate() +
            (deliveryType === "Express" ? 1 : 3)
        );

        const estimated = estimatedDate.toLocaleDateString("en-IN");
        let trackingId;
        let reference;

        // Generate a unique tracking ID.
        for (let attempt = 0; attempt < 5; attempt++) {
          trackingId =
            "PTR" +
            Date.now().toString().slice(-8) +
            Math.floor(Math.random() * 90 + 10);

          reference = shipments.doc(trackingId);
          const existing = await reference.get();

          if (!existing.exists) break;

          trackingId = null;
        }

        if (!trackingId) {
          return sendError(
            res,
            503,
            "Unable to generate a tracking ID. Please try again."
          );
        }

        const initialStatus = STATUSES.Booked;
        const createdAt = new Date().toISOString();

        const shipment = {
          trackingId,
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
          price,
          status: "Booked",
          estimated,
          progress: initialStatus.progress,
          description: initialStatus.description,
          createdAt,
          events: [
            {
              status: "Booked",
              location: origin,
              timestamp: createdAt,
              description: initialStatus.description,
            },
          ],
          updatedAt: FieldValue.serverTimestamp(),
        };

        await reference.create(shipment);

        return res.status(201).json({
          trackingId,
          price,
          message: "Booking created successfully.",
        });
      }

      const trackingMatch = path.match(
        /^\/api\/shipments\/([^/]+)$/
      );

      if (method === "GET" && trackingMatch) {
        const trackingId = decodeURIComponent(trackingMatch[1])
          .trim()
          .toUpperCase();

        const snapshot = await shipments.doc(trackingId).get();

        if (!snapshot.exists) {
          return sendError(res, 404, "Shipment not found.");
        }

        return res.json(publicShipment(snapshot.data()));
      }

      if (method === "GET" && path === "/api/shipments") {
        if (!(await requireAdmin(req, res))) return;

        const snapshot = await shipments
          .orderBy("createdAt", "desc")
          .limit(500)
          .get();

        const results = snapshot.docs.map((doc) => ({
          ...doc.data(),
        }));

        return res.json(results);
      }

      const statusMatch = path.match(
        /^\/api\/shipments\/([^/]+)\/status$/
      );

      if (method === "PATCH" && statusMatch) {
        if (!(await requireAdmin(req, res))) return;

        const trackingId = decodeURIComponent(statusMatch[1])
          .trim()
          .toUpperCase();

        const status = normalizeText(req.body?.status);

        if (!Object.prototype.hasOwnProperty.call(STATUSES, status)) {
          return sendError(res, 400, "Invalid shipment status.");
        }

        const reference = shipments.doc(trackingId);

        const result = await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(reference);

          if (!snapshot.exists) return null;

          const current = snapshot.data();
          const details = STATUSES[status];
          const timestamp = new Date().toISOString();

          const event = {
            status,
            location:
              status === "Delivered"
                ? current.destination
                : current.origin,
            timestamp,
            description: details.description,
          };

          transaction.update(reference, {
            status,
            progress: details.progress,
            description: details.description,
            events: [...(current.events || []), event],
            updatedAt: FieldValue.serverTimestamp(),
          });

          return {
            ...current,
            status,
            progress: details.progress,
            description: details.description,
            events: [...(current.events || []), event],
          };
        });

        if (!result) {
          return sendError(res, 404, "Shipment not found.");
        }

        return res.json(result);
      }

      return sendError(res, 404, "API endpoint not found.");
    } catch (error) {
      console.error("Shipment API error:", error);
      return sendError(res, 500, "An internal server error occurred.");
    }
  }
);
