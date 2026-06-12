import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, CheckCircle } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Settings | Debridgers" },
    {
      name: "description",
      content:
        "Update your agent profile, contact details and account preferences.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface AgentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
}

export default function AgentSettingsPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSaved, setProfileSaved] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await apiFetch<AgentProfile>("/agent/me");
      setForm({
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone ?? "",
        address: p.address ?? "",
      });
    } catch {
      // silently fail - form stays blank
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      await apiFetch("/agent/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: form.firstName.trim() || undefined,
          last_name: form.lastName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(
        err instanceof ApiError
          ? err.message
          : "Failed to save. Please try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  const inputCls =
    "border-gray-border bg-bg-light text-heading rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <User size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">Settings</h2>
          <p className="text-text text-sm">Manage your profile and account</p>
        </div>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-gray-border rounded-2xl border bg-white p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <User size={18} className="text-primary" />
          <h3 className="font-syne text-heading font-semibold">
            Profile Information
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {profileSaved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-status-active-text flex items-center gap-2 text-sm font-medium"
            >
              <CheckCircle size={16} /> Profile updated successfully!
            </motion.div>
          ) : loadingProfile ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-bg-light h-10 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : (
            <form
              key="form"
              onSubmit={handleProfile}
              className="flex flex-col gap-4"
            >
              {profileError && (
                <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
                  {profileError}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  className={inputCls + " cursor-not-allowed opacity-60"}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Your business/delivery address"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-primary self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Password - coming soon */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-gray-border rounded-2xl border bg-white p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <h3 className="font-syne text-heading font-semibold">
            Change Password
          </h3>
        </div>
        <div className="flex flex-col gap-4">
          {["Current Password", "New Password", "Confirm New Password"].map(
            (label) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  {label}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  disabled
                  className={inputCls + " cursor-not-allowed opacity-50"}
                />
              </div>
            ),
          )}
          <button
            type="button"
            disabled
            className="bg-primary cursor-not-allowed self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white opacity-50"
          >
            Update Password (coming soon)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
