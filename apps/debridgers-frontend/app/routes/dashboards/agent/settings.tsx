import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  ShieldCheck,
  CheckCircle,
  Upload,
  Camera,
} from "lucide-react";
import {
  apiFetch,
  ApiError,
  BASE_BACKEND_URL,
  getAccessToken,
} from "@debridgers/api-client";
import {
  DashSelectInput,
  defaultStateName,
  stateSelectOptions,
  lgaSelectOptions,
} from "@debridgers/ui-web";

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

// === Types
interface AgentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
}

interface KycStatus {
  kyc_status: "pending" | "submitted" | "approved" | "rejected" | null;
  kyc_rejection_reason: string | null;
  id_type: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
}

const kycStatusMap: Record<
  string,
  { bgClass: string; textClass: string; label: string }
> = {
  approved: {
    bgClass: "bg-status-delivered-bg",
    textClass: "text-status-delivered-text",
    label: "Approved",
  },
  submitted: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Submitted - Under Review",
  },
  rejected: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "Rejected",
  },
  pending: {
    bgClass: "bg-status-pending-bg",
    textClass: "text-status-pending-text",
    label: "Not Submitted",
  },
};

const ID_TYPES = ["NIN", "Passport", "Drivers License"] as const;

// === Page
export default function AgentSettingsPage() {
  // === Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // === Profile state
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    /* Kaduna is the launch state, so it is the sensible default until the
       agent picks otherwise. */
    state: defaultStateName,
    lga: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSaved, setProfileSaved] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // === KYC state
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [kycForm, setKycForm] = useState({
    id_type: "NIN" as (typeof ID_TYPES)[number],
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idSelfie, setIdSelfie] = useState<File | null>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idSelfieRef = useRef<HTMLInputElement>(null);
  const [kycSaving, setKycSaving] = useState<boolean>(false);
  const [kycSaved, setKycSaved] = useState<boolean>(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const inputCls =
    "border-gray-border bg-bg-light text-heading rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors";

  const loadProfile = useCallback(async () => {
    try {
      const p = await apiFetch<AgentProfile & { avatar_url?: string | null }>(
        "/agent/me",
      );
      setForm({
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone ?? "",
        address: p.address ?? "",
        state: p.state ?? defaultStateName,
        lga: p.lga ?? "",
      });
      if (p.avatar_url) setAvatarUrl(p.avatar_url);
    } catch {
      // silently fail
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadKyc = useCallback(async () => {
    try {
      const data = await apiFetch<KycStatus>("/agent/kyc");
      setKyc(data);
      if (data.id_type) {
        setKycForm((p) => ({
          ...p,
          id_type: data.id_type as (typeof ID_TYPES)[number],
          bank_name: data.bank_name ?? "",
          bank_account_name: data.bank_account_name ?? "",
        }));
      }
    } catch {
      setKyc({
        kyc_status: null,
        kyc_rejection_reason: null,
        id_type: null,
        bank_name: null,
        bank_account_name: null,
      });
    } finally {
      setLoadingKyc(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadKyc();
  }, [loadProfile, loadKyc]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getAccessToken();
      const res = await fetch(`${BASE_BACKEND_URL}/agent/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      const json = (await res.json()) as {
        data?: { url?: string };
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "Upload failed");
      if (json.data?.url) setAvatarUrl(json.data.url);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  }

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
          state: form.state.trim() || undefined,
          /* Setting the LGA re-resolves the agent's delivery zone server-side. */
          lga: form.lga.trim() || undefined,
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

  async function handleKycSubmit(e: React.FormEvent) {
    e.preventDefault();
    setKycError(null);

    if (!idFront) {
      setKycError("Please upload a photo of your ID (front side).");
      return;
    }
    if (!idSelfie) {
      setKycError("Please upload a selfie holding your ID.");
      return;
    }

    setKycSaving(true);
    try {
      const fd = new FormData();
      fd.append("id_type", kycForm.id_type);
      fd.append("bank_name", kycForm.bank_name.trim());
      fd.append("bank_account_number", kycForm.bank_account_number.trim());
      fd.append("bank_account_name", kycForm.bank_account_name.trim());
      fd.append("id_front", idFront);
      fd.append("id_selfie", idSelfie);

      const token = getAccessToken();
      const res = await fetch(`${BASE_BACKEND_URL}/agent/kyc`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Submission failed.");

      setKycSaved(true);
      setTimeout(() => setKycSaved(false), 4000);
      setIdFront(null);
      setIdSelfie(null);
      if (idFrontRef.current) idFrontRef.current.value = "";
      if (idSelfieRef.current) idSelfieRef.current.value = "";
      await loadKyc();
    } catch (err) {
      setKycError(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.",
      );
    } finally {
      setKycSaving(false);
    }
  }

  const kycStatusInfo =
    kycStatusMap[kyc?.kyc_status ?? "pending"] ?? kycStatusMap.pending;
  const kycIsApproved = kyc?.kyc_status === "approved";
  const kycIsSubmitted = kyc?.kyc_status === "submitted";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <User size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">Settings</h2>
          <p className="text-text text-sm">Manage your profile and account</p>
        </div>
      </div>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-gray-border rounded-2xl border bg-white p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Camera size={18} className="text-primary" />
          <h3 className="font-syne text-heading font-semibold">
            Profile Photo
          </h3>
        </div>
        <div className="flex items-center gap-5">
          <div className="bg-primary relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : form.firstName ? (
              form.firstName[0]?.toUpperCase()
            ) : (
              "?"
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="border-gray-border bg-bg-light hover:border-primary flex cursor-pointer items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-medium transition-colors">
              <Upload size={14} className="text-text" />
              <span className="text-heading">
                {avatarUploading ? "Uploading..." : "Upload photo"}
              </span>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </label>
            {avatarError && (
              <p className="text-status-cancelled-text text-xs">
                {avatarError}
              </p>
            )}
            <p className="text-text text-xs">JPG, PNG or WebP. Max 5MB.</p>
          </div>
        </div>
      </motion.div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
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
                  Home Address
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
              <DashSelectInput
                label="State"
                value={form.state}
                options={stateSelectOptions()}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    state: e.target.value,
                    /* LGAs are state-specific, so a stale one must not survive
                       a state change. */
                    lga: "",
                  }))
                }
              />
              <DashSelectInput
                label="LGA"
                value={form.lga}
                options={lgaSelectOptions(form.state)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lga: e.target.value }))
                }
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-primary cursor-pointer self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* KYC Verification */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="border-gray-border rounded-2xl border bg-white p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <h3 className="font-syne text-heading font-semibold">
              KYC Verification
            </h3>
          </div>
          {!loadingKyc && kyc?.kyc_status && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${kycStatusInfo.bgClass} ${kycStatusInfo.textClass}`}
            >
              {kycStatusInfo.label}
            </span>
          )}
        </div>

        {loadingKyc ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-bg-light h-10 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : kycIsApproved ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-status-delivered-text" />
            <p className="text-status-delivered-text font-medium">
              Your KYC is verified. No further action needed.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {kycSaved ? (
              <motion.div
                key="kyc-saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-status-active-text flex items-center gap-2 text-sm font-medium"
              >
                <CheckCircle size={16} /> KYC submitted! We will review and get
                back to you.
              </motion.div>
            ) : (
              <motion.form
                key="kyc-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleKycSubmit}
                className="flex flex-col gap-4"
              >
                {kyc?.kyc_rejection_reason && (
                  <div className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
                    <span className="font-semibold">Rejection reason: </span>
                    {kyc.kyc_rejection_reason}
                  </div>
                )}

                {kycIsSubmitted && (
                  <p className="text-text rounded-xl bg-amber-50 px-4 py-3 text-sm">
                    Your KYC documents are under review. You can resubmit below
                    if you need to make changes.
                  </p>
                )}

                {kycError && (
                  <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
                    {kycError}
                  </p>
                )}

                {/* ID Type */}
                <DashSelectInput
                  label="ID Type"
                  value={kycForm.id_type}
                  options={ID_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(e) =>
                    setKycForm((p) => ({
                      ...p,
                      id_type: e.target.value as (typeof ID_TYPES)[number],
                    }))
                  }
                />

                {/* Bank details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-heading text-sm font-medium">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={kycForm.bank_name}
                      onChange={(e) =>
                        setKycForm((p) => ({
                          ...p,
                          bank_name: e.target.value,
                        }))
                      }
                      placeholder="e.g. GTBank"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-heading text-sm font-medium">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={kycForm.bank_account_number}
                      onChange={(e) =>
                        setKycForm((p) => ({
                          ...p,
                          bank_account_number: e.target.value,
                        }))
                      }
                      placeholder="10-digit account number"
                      maxLength={10}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={kycForm.bank_account_name}
                    onChange={(e) =>
                      setKycForm((p) => ({
                        ...p,
                        bank_account_name: e.target.value,
                      }))
                    }
                    placeholder="Name on your bank account"
                    className={inputCls}
                    required
                  />
                </div>

                {/* File uploads */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-heading text-sm font-medium">
                      ID Front Photo
                    </label>
                    <label className="border-gray-border bg-bg-light hover:border-primary flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors">
                      <Upload size={16} className="text-text shrink-0" />
                      <span className={idFront ? "text-heading" : "text-text"}>
                        {idFront ? idFront.name : "Choose file"}
                      </span>
                      <input
                        ref={idFrontRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setIdFront(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-heading text-sm font-medium">
                      Selfie with ID
                    </label>
                    <label className="border-gray-border bg-bg-light hover:border-primary flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors">
                      <Upload size={16} className="text-text shrink-0" />
                      <span className={idSelfie ? "text-heading" : "text-text"}>
                        {idSelfie ? idSelfie.name : "Choose file"}
                      </span>
                      <input
                        ref={idSelfieRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setIdSelfie(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={kycSaving}
                  className="bg-primary cursor-pointer self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {kycSaving ? "Submitting..." : "Submit KYC"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        )}
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
