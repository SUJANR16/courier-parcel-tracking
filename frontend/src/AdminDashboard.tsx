
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  Search,
  X,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";

import { auth } from "./lib/firebase";
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

export default function AdminDashboard({
  onBack,
}: AdminDashboardProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Authentication state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check whether the signed-in user has the admin claim.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCheckingAuth(true);
      setIsAdmin(false);
      setAuthError("");

      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult(true);
        setIsAdmin(tokenResult.claims.admin === true);
      } catch {
        setAuthError("Unable to verify administrator access.");
      } finally {
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, []);

  // Sign in using Firebase Email/Password authentication.
  async function handleSignIn(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Force-refresh the token so the latest admin claim is checked.
      const tokenResult =
        await credential.user.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        await signOut(auth);
        setIsAdmin(false);
        setAuthError(
          "This account does not have administrator access."
        );
      } else {
        setIsAdmin(true);
        setPassword("");
      }
    } catch {
      setAuthError(
        "Sign-in failed. Check your email and password, and try again."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  // Load shipments only after admin access has been verified.
  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await listShipments();
      setShipments(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load shipments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadShipments();
    }
  }, [isAdmin, loadShipments]);

  // Update a shipment's delivery status.
  async function changeStatus(
    shipment: Shipment,
    status: ShipmentStatus
  ) {
    setError("");

    try {
      await updateShipmentStatus(
        shipment.trackingId || shipment.id,
        status
      );

      await loadShipments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update shipment status."
      );
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      setShipments([]);
      setSearch("");
      onBack();
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  // Authentication loading screen.
  if (checkingAuth) {
    return (
      <main className="admin-page admin-auth-page">
        <section className="admin-login-card">
          <ShieldCheck size={40} />
          <h1>Checking administrator access</h1>
          <p>Please wait...</p>
        </section>
      </main>
    );
  }

  // Show the login form to signed-out or non-admin users.
  if (!auth.currentUser || !isAdmin) {
    return (
      <main className="admin-page admin-auth-page">
        <section className="admin-login-card">
          <div className="admin-login-brand">
            <span className="admin-brand-icon">P</span>
          </div>

          <p className="admin-eyebrow">PARCELTRACK PRO</p>
          <h1>Admin sign in</h1>
          <p className="admin-login-description">
            Sign in with your authorized administrator account
            to manage parcel deliveries.
          </p>

          <form
            onSubmit={handleSignIn}
            className="admin-login-form"
          >
            <label htmlFor="admin-email">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="Enter your admin email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            {authError && (
              <div
                className="admin-login-error"
                role="alert"
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={authLoading}
            >
              {authLoading ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={onBack}
            >
              Back to home
            </button>
          </form>

          <p className="admin-login-security">
            <ShieldCheck size={16} />
            Administrator access is verified securely.
          </p>
        </section>
      </main>
    );
  }

  // Search shipments by tracking ID, locations, status, or names.
  const query = search.trim().toLowerCase();

  const filtered = shipments.filter((shipment) => {
    return (
      (shipment.trackingId || shipment.id || "")
        .toLowerCase()
        .includes(query) ||
      (shipment.origin || "")
        .toLowerCase()
        .includes(query) ||
      (shipment.destination || "")
        .toLowerCase()
        .includes(query) ||
      (shipment.status || "")
        .toLowerCase()
        .includes(query) ||
      (shipment.senderName || "")
        .toLowerCase()
        .includes(query) ||
      (shipment.receiverName || "")
        .toLowerCase()
        .includes(query)
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

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={onBack}
          >
            ← Home
          </button>

          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="admin-dashboard-content">
        <div className="admin-heading-row">
          <div>
            <p className="admin-eyebrow">
              ADMINISTRATION / OVERVIEW
            </p>
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
            {loading
              ? "Refreshing..."
              : "Refresh shipments"}
          </button>
        </div>

        {error && (
          <div
            className="admin-alert admin-alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="admin-stats-grid">
          <StatCard
            label="Total shipments"
            value={shipments.length}
          />

          {SHIPMENT_STATUSES.map((status) => (
            <StatCard
              key={status}
              label={status}
              value={
                shipments.filter(
                  (shipment) => shipment.status === status
                ).length
              }
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
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
              <PackageSearch
                size={16}
                aria-hidden="true"
              />
              <span>
                Search by tracking ID, sender, receiver,
                origin or status.
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
                {search
                  ? "No matching shipments"
                  : "No shipments yet"}
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
                      <td>
                        {shipment.trackingId || shipment.id}
                      </td>
                      <td>{shipment.origin}</td>
                      <td>{shipment.destination}</td>
                      <td>{shipment.weight} kg</td>
                      <td>
                        ₹{Number(shipment.price).toFixed(2)}
                      </td>
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
                            <option
                              key={status}
                              value={status}
                            >
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
