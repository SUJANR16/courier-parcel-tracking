
import { useCallback, useEffect, useState } from "react";
import { Search, X, PackageSearch } from "lucide-react";
import {
  SHIPMENT_STATUSES,
  listShipments,
  updateShipmentStatus,
  type Shipment,
  type ShipmentStatus,
} from "./services/shipments";
import "./AdminDashboard.css";

type AdminDashboardProps = {
  onBack: () => void;
};

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setShipments(await listShipments());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load shipments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  async function changeStatus(
    shipment: Shipment,
    status: ShipmentStatus
  ) {
    try {
      await updateShipmentStatus(
        shipment.trackingId || shipment.id,
        status
      );
      await loadShipments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update status."
      );
    }
  }

  const query = search.trim().toLowerCase();

  const filtered = shipments.filter((shipment) => {
    return (
      (shipment.trackingId || shipment.id || "")
        .toLowerCase()
        .includes(query) ||
      (shipment.origin || "").toLowerCase().includes(query) ||
      (shipment.destination || "").toLowerCase().includes(query) ||
      (shipment.status || "").toLowerCase().includes(query) ||
      (shipment.senderName || "").toLowerCase().includes(query) ||
      (shipment.receiverName || "").toLowerCase().includes(query)
    );
  });

  return (
    <main className="admin-page admin-dashboard-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-icon">P</span>
          <div>
            <h1>ParcelTrack Pro</h1>
            <p>Shipment administration</p>
          </div>
        </div>

        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={onBack}
        >
          ← Home
        </button>
      </header>

      <section className="admin-dashboard-content">
        <div className="admin-heading-row">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION / OVERVIEW</p>
            <h2>Shipment dashboard</h2>
            <p className="admin-muted">
              Manage parcels and update delivery statuses.
            </p>
          </div>

          <button
            type="button"
            className="admin-button admin-button-primary"
            onClick={() => void loadShipments()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh shipments"}
          </button>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="admin-stats-grid">
          <StatCard label="Total shipments" value={shipments.length} />

          {SHIPMENT_STATUSES.map((status) => (
            <StatCard
              key={status}
              label={status}
              value={shipments.filter((s) => s.status === status).length}
            />
          ))}
        </div>

        <section className="admin-table-card">
          <div className="admin-table-heading">
            <div>
              <h3>All shipments</h3>
              <p className="admin-search-subtitle">
                Find and manage your parcels in one place.
              </p>
            </div>

            <span className="admin-results-count">
              {loading
                ? "Loading..."
                : `${filtered.length} of ${shipments.length} shipments`}
            </span>
          </div>

          <div className="admin-search-area">
            <div className="admin-search-box">
              <Search
                className="admin-search-icon"
                size={21}
                aria-hidden="true"
              />

              <input
                type="search"
                className="admin-search-input"
                placeholder="Search by tracking ID, location or name..."
                aria-label="Search shipments"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  className="admin-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="admin-search-hint">
              <PackageSearch size={16} aria-hidden="true" />
              <span>
                Search by tracking ID, sender, receiver, origin or status.
              </span>
            </div>
          </div>

          {loading ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">
                <PackageSearch size={28} />
              </div>
              <p>Loading shipments...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">
                <PackageSearch size={28} />
              </div>
              <h4>
                {search ? "No matching shipments" : "No shipments yet"}
              </h4>
              <p>
                {search
                  ? "Try a different tracking ID, name, location or status."
                  : "New parcel bookings will appear here."}
              </p>

              {search && (
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Weight</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Update status</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((shipment) => (
                    <tr key={shipment.id}>
                      <td>{shipment.trackingId || shipment.id}</td>
                      <td>{shipment.origin}</td>
                      <td>{shipment.destination}</td>
                      <td>{shipment.weight} kg</td>
                      <td>₹{Number(shipment.price).toFixed(2)}</td>
                      <td>{shipment.status}</td>
                      <td>
                        <select
                          aria-label={`Update status for ${shipment.id}`}
                          value={shipment.status}
                          onChange={(event) =>
                            void changeStatus(
                              shipment,
                              event.target.value as ShipmentStatus
                            )
                          }
                        >
                          {SHIPMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="admin-stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
