
import { auth } from "../lib/firebase";

const API_URL = "/api/shipments";

export const SHIPMENT_STATUSES = [
  "Booked",
  "Picked up",
  "In transit",
  "Out for delivery",
  "Delivered",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export interface Shipment {
  id: string;
  trackingId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  origin: string;
  destination: string;
  weight: number;
  deliveryType: "Standard" | "Express";
  price: number;
  status: ShipmentStatus;
  estimated: string;
  progress: number;
  description?: string;
  createdAt?: string;
  events?: {
    status: string;
    location?: string;
    timestamp?: string;
    description?: string;
  }[];
}

export interface CreateShipmentInput {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  weight: number;
  deliveryType: "Standard" | "Express";
  origin?: string;
  destination?: string;
}

async function apiRequest<T>(
  url: string,
  options?: RequestInit,
  requiresAdmin = false
): Promise<T> {
  const headers = new Headers(options?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresAdmin) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in as an administrator.");
    }

    const token = await user.getIdToken(true);
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || result.error || `Request failed (${response.status})`
    );
  }

  return result as T;
}

function normalizeShipment(raw: any): Shipment {
  const statusMap: Record<string, ShipmentStatus> = {
    Booked: "Booked",
    "Picked Up": "Picked up",
    "Picked up": "Picked up",
    "In Transit": "In transit",
    "In transit": "In transit",
    "Out for Delivery": "Out for delivery",
    "Out for delivery": "Out for delivery",
    Delivered: "Delivered",
  };

  const status = statusMap[raw.status] ?? "Booked";

  const progressMap: Record<ShipmentStatus, number> = {
    Booked: 10,
    "Picked up": 25,
    "In transit": 60,
    "Out for delivery": 80,
    Delivered: 100,
  };

  return {
    ...raw,
    id: String(raw.id ?? raw.trackingId ?? raw.tracking_id ?? ""),
    trackingId: String(
      raw.trackingId ?? raw.tracking_id ?? raw.id ?? ""
    ),
    senderName: raw.senderName ?? raw.sender_name ?? "",
    senderPhone: raw.senderPhone ?? raw.sender_phone ?? "",
    senderAddress: raw.senderAddress ?? raw.sender_address ?? "",
    receiverName: raw.receiverName ?? raw.receiver_name ?? "",
    receiverPhone: raw.receiverPhone ?? raw.receiver_phone ?? "",
    receiverAddress: raw.receiverAddress ?? raw.receiver_address ?? "",
    origin: raw.origin ?? raw.senderAddress ?? raw.sender_address ?? "",
    destination:
      raw.destination ?? raw.receiverAddress ?? raw.receiver_address ?? "",
    weight: Number(raw.weight ?? 0),
    deliveryType: raw.deliveryType ?? raw.delivery_type ?? "Standard",
    price: Number(raw.price ?? 0),
    status,
    estimated:
      raw.estimated ??
      raw.estimatedDelivery ??
      raw.estimated_delivery ??
      "Pending",
    progress: Number(raw.progress ?? progressMap[status]),
    createdAt: raw.createdAt ?? raw.created_at,
    events: raw.events ?? [],
  };
}

export async function createShipment(
  data: CreateShipmentInput
): Promise<Shipment> {
  const result = await apiRequest<{ shipment: any } | any>(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return normalizeShipment(result.shipment ?? result);
}

export async function getShipmentByTrackingId(
  trackingId: string
): Promise<Shipment> {
  const result = await apiRequest<{ shipment: any } | any>(
    `${API_URL}/${encodeURIComponent(trackingId)}`
  );

  return normalizeShipment(result.shipment ?? result);
}

export async function listShipments(): Promise<Shipment[]> {
  const result = await apiRequest<{ shipments?: any[] } | any>(
    API_URL,
    undefined,
    true
  );

  const shipments = Array.isArray(result)
    ? result
    : result.shipments ?? [];

  return shipments.map(normalizeShipment);
}

export async function updateShipmentStatus(
  trackingId: string,
  status: ShipmentStatus
): Promise<Shipment> {
  const result = await apiRequest<{ shipment: any } | any>(
    `${API_URL}/${encodeURIComponent(trackingId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    true
  );

  return normalizeShipment(result.shipment ?? result);
}
