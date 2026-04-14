import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, CheckCircle } from "lucide-react";

export function meta() {
  return [{ title: "Settings | Debridgers" }];
}

export default function AgentSettingsPage() {
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  return (
    <div className="py-section-px flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <User size={24} style={{ color: "var(--primary-color)" }} />
        <div>
          <h2
            className="font-syne text-xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Settings
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Manage your profile and account
          </p>
        </div>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <User size={18} style={{ color: "var(--primary-color)" }} />
          <h3
            className="font-syne font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Profile Information
          </h3>
        </div>
        {profileSaved ? (
          <div
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--status-active-text)" }}
          >
            <CheckCircle size={16} /> Profile updated successfully!
          </div>
        ) : (
          <form onSubmit={handleProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: "First Name", placeholder: "Amina" },
                { label: "Last Name", placeholder: "Yusuf" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {f.label}
                  </label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    className="rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{
                      borderColor: "var(--border-gray)",
                      backgroundColor: "var(--bg-light)",
                      color: "var(--heading-colour)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="amina@example.com"
                className="rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--bg-light)",
                  color: "var(--heading-colour)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+234 800 000 0000"
                className="rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--bg-light)",
                  color: "var(--heading-colour)",
                }}
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}
            >
              Save Changes
            </button>
          </form>
        )}
      </motion.div>

      {/* Password */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock size={18} style={{ color: "var(--primary-color)" }} />
          <h3
            className="font-syne font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Change Password
          </h3>
        </div>
        {passwordSaved ? (
          <div
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--status-active-text)" }}
          >
            <CheckCircle size={16} /> Password updated successfully!
          </div>
        ) : (
          <form onSubmit={handlePassword} className="flex flex-col gap-4">
            {["Current Password", "New Password", "Confirm New Password"].map(
              (label) => (
                <div key={label} className="flex flex-col gap-1">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {label}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{
                      borderColor: "var(--border-gray)",
                      backgroundColor: "var(--bg-light)",
                      color: "var(--heading-colour)",
                    }}
                  />
                </div>
              ),
            )}
            <button
              type="submit"
              className="self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}
            >
              Update Password
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
