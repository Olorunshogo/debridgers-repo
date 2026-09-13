import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  SelectInputField,
  TextInputField,
  EmailInputField,
  SubmitButton,
  defaultStateName,
  stateSelectOptions,
  lgaSelectOptions,
  useDialog,
  applyServerFieldErrors,
  agentProfileSchema,
  type AgentProfileValues,
  submitKycSchema,
  KYC_ID_TYPES,
  type SubmitKycValues,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Settings | Debridgers",
    description:
      "Update your agent profile, contact details and account preferences.",
    path: "/settings",
    noIndex: true,
  });
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
  bank_code: string | null;
  bank_account_name: string | null;
}

const kycStatusMap: Record<
  string,
  { bgClass: string; textClass: string; label: string }
> = {
  approved: {
    bgClass: "bg-status-delivered",
    textClass: "text-status-delivered-fg",
    label: "Approved",
  },
  submitted: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Submitted - Under Review",
  },
  rejected: {
    bgClass: "bg-status-cancelled",
    textClass: "text-status-cancelled-fg",
    label: "Rejected",
  },
  pending: {
    bgClass: "bg-status-pending",
    textClass: "text-status-pending-fg",
    label: "Not Submitted",
  },
};

// === Page
export default function AgentSettingsPage() {
  const { triggerDialog } = useDialog();

  // === Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // === Profile state
  const [email, setEmail] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSaved, setProfileSaved] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  /* Kaduna is the launch state, so it is the sensible default until the agent picks otherwise. */
  const profileForm = useForm<AgentProfileValues>({
    resolver: zodResolver(agentProfileSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      state: defaultStateName,
      lga: "",
    },
  });
  const {
    register: registerProfile,
    control: profileControl,
    formState: { errors: profileFieldErrors, isSubmitting: savingProfile },
  } = profileForm;
  const profileState = profileForm.watch("state");
  const profileFirstName = profileForm.watch("firstName");

  // === KYC state
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const kycForm = useForm<SubmitKycValues>({
    resolver: zodResolver(submitKycSchema),
    mode: "onChange",
    defaultValues: {
      idType: "NIN",
      bankName: "",
      bankCode: "",
      bankAccountNumber: "",
      bankAccountName: "",
    },
  });
  const {
    register: registerKyc,
    control: kycControl,
    formState: { errors: kycFieldErrors, isSubmitting: kycSaving },
  } = kycForm;
  const [banks, setBanks] = useState<{ bankCode: string; name: string }[]>([]);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idSelfieRef = useRef<HTMLInputElement>(null);
  const [kycSaved, setKycSaved] = useState<boolean>(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const p = await apiFetch<AgentProfile & { avatar_url?: string | null }>(
        "/agent/me",
      );
      profileForm.reset({
        firstName: p.first_name,
        lastName: p.last_name,
        phone: p.phone ?? "",
        address: p.address ?? "",
        state: p.state ?? defaultStateName,
        lga: p.lga ?? "",
      });
      setEmail(p.email);
      if (p.avatar_url) setAvatarUrl(p.avatar_url);
      setProfileError(null);
    } catch (err) {
      /* Without this the form renders blank and a save would wipe the profile. */
      setProfileError(
        err instanceof ApiError
          ? err.message
          : "Could not load your profile. Reload the page before editing.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  /*
   * Bank list for the picker.
   * Failing to load leaves the select empty rather than blocking the rest of the KYC form, which does not depend on it.
   */
  const loadBanks = useCallback(async () => {
    try {
      const rows =
        await apiFetch<{ bankCode: string; name: string }[]>("/agent/banks");
      setBanks(rows);
    } catch (err) {
      setKycError(
        err instanceof ApiError
          ? err.message
          : "Could not load the bank list. Reload the page to pick your bank.",
      );
    }
  }, []);

  const loadKyc = useCallback(async () => {
    try {
      const data = await apiFetch<KycStatus>("/agent/kyc");
      setKyc(data);
      if (data.id_type) {
        kycForm.reset({
          idType: data.id_type as SubmitKycValues["idType"],
          bankName: data.bank_name ?? "",
          bankCode: data.bank_code ?? "",
          bankAccountNumber: "",
          bankAccountName: data.bank_account_name ?? "",
        });
      }
    } catch {
      setKyc({
        kyc_status: null,
        kyc_rejection_reason: null,
        id_type: null,
        bank_name: null,
        bank_code: null,
        bank_account_name: null,
      });
    } finally {
      setLoadingKyc(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadKyc();
    void loadBanks();
  }, [loadProfile, loadKyc, loadBanks]);

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

  const handleProfile = profileForm.handleSubmit(async (values) => {
    setProfileError(null);
    try {
      /* Setting the LGA re-resolves the agent's delivery zone server-side. */
      await apiFetch("/agent/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          phone: values.phone.trim() || undefined,
          address: values.address.trim() || undefined,
          state: values.state.trim() || undefined,
          lga: values.lga.trim() || undefined,
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
      applyServerFieldErrors(err, profileForm);
    }
  });

  const handleKycSubmit = kycForm.handleSubmit(async (values) => {
    setKycError(null);
    try {
      const fd = new FormData();
      fd.append("id_type", values.idType);
      fd.append("bank_name", values.bankName.trim());
      fd.append("bank_code", values.bankCode);
      fd.append("bank_account_number", values.bankAccountNumber.trim());
      fd.append("bank_account_name", values.bankAccountName.trim());
      fd.append("id_front", values.idFront);
      fd.append("id_selfie", values.idSelfie);

      const token = getAccessToken();
      const res = await fetch(`${BASE_BACKEND_URL}/agent/kyc`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      const json = (await res.json()) as { message?: string };
      /* Thrown as ApiError, not a plain Error, so applyServerFieldErrors below can read the field-level `errors` the ZodValidationPipe put on the response body. */
      if (!res.ok)
        throw new ApiError(
          res.status,
          json.message ?? "Submission failed.",
          json,
        );

      setKycSaved(true);
      setTimeout(() => setKycSaved(false), 4000);
      kycForm.setValue("idFront", undefined as unknown as File);
      kycForm.setValue("idSelfie", undefined as unknown as File);
      if (idFrontRef.current) idFrontRef.current.value = "";
      if (idSelfieRef.current) idSelfieRef.current.value = "";
      await loadKyc();
    } catch (err) {
      setKycError(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.",
      );
      applyServerFieldErrors(err, kycForm);
    }
  });

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
          <p className="text-body text-sm">Manage your profile and account</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-line rounded-2xl border bg-white p-5"
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
            ) : profileFirstName ? (
              profileFirstName[0]?.toUpperCase()
            ) : (
              "?"
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="border-line bg-light-bg hover:border-primary flex cursor-pointer items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-medium transition-colors">
              <Upload size={14} className="text-body" />
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
              <p className="text-status-cancelled-fg text-xs">{avatarError}</p>
            )}
            <p className="text-body text-xs">JPG, PNG or WebP. Max 5MB.</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="border-line rounded-2xl border bg-white p-5"
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
              className="text-status-active-fg flex items-center gap-2 text-sm font-medium"
            >
              <CheckCircle size={16} /> Profile updated successfully!
            </motion.div>
          ) : loadingProfile ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-light-bg h-10 animate-pulse rounded-xl"
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
                <p className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
                  {profileError}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInputField
                  label="First Name"
                  error={profileFieldErrors.firstName?.message}
                  required
                  {...registerProfile("firstName")}
                />
                <TextInputField
                  label="Last Name"
                  error={profileFieldErrors.lastName?.message}
                  required
                  {...registerProfile("lastName")}
                />
              </div>
              {/* Read-only: the email is the login identity and is changed via support. */}
              <EmailInputField
                label="Email"
                value={email}
                readOnly
                required
                className="opacity-60"
              />
              <TextInputField
                label="Phone Number"
                type="tel"
                inputMode="tel"
                error={profileFieldErrors.phone?.message}
                placeholder="+234 801 234 4567"
                {...registerProfile("phone")}
              />
              <TextInputField
                label="Home Address"
                error={profileFieldErrors.address?.message}
                placeholder="Your business/delivery address"
                {...registerProfile("address")}
              />
              {/* LGAs are state-specific, so a stale one must not survive a state change. */}
              <Controller
                control={profileControl}
                name="state"
                render={({ field }) => (
                  <SelectInputField
                    label="State"
                    options={stateSelectOptions()}
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      profileForm.setValue("lga", "");
                    }}
                  />
                )}
              />
              <Controller
                control={profileControl}
                name="lga"
                render={({ field }) => (
                  <SelectInputField
                    label="LGA"
                    options={lgaSelectOptions(profileState)}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <SubmitButton
                loading={savingProfile}
                loadingText="Saving..."
                className="self-start"
              >
                Save Changes
              </SubmitButton>
            </form>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="border-line rounded-2xl border bg-white p-5"
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
                className="bg-light-bg h-10 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : kycIsApproved ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-status-delivered-fg" />
            <p className="text-status-delivered-fg font-medium">
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
                className="text-status-active-fg flex items-center gap-2 text-sm font-medium"
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
                  <div className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
                    <span className="font-semibold">Rejection reason: </span>
                    {kyc.kyc_rejection_reason}
                  </div>
                )}

                {kycIsSubmitted && (
                  <p className="text-body rounded-xl bg-amber-50 px-4 py-3 text-sm">
                    Your KYC documents are under review. You can resubmit below
                    if you need to make changes.
                  </p>
                )}

                {kycError && (
                  <p className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
                    {kycError}
                  </p>
                )}

                <Controller
                  control={kycControl}
                  name="idType"
                  render={({ field }) => (
                    <SelectInputField
                      label="ID Type"
                      value={field.value}
                      options={KYC_ID_TYPES.map((t) => ({
                        value: t,
                        label: t,
                      }))}
                      onChange={field.onChange}
                    />
                  )}
                />

                {/* Bank is picked from the payable-banks list rather than typed: a payout transfer needs the numeric bank code, and free text only ever produced a name, which left agents unpayable. */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    control={kycControl}
                    name="bankCode"
                    render={({ field }) => (
                      <SelectInputField
                        label="Bank"
                        isBank
                        placeholder="Select your bank"
                        options={banks.map((b) => ({
                          value: b.bankCode,
                          label: b.name,
                        }))}
                        value={field.value}
                        error={kycFieldErrors.bankCode?.message}
                        onSelectOption={(option) => {
                          field.onChange(option.value);
                          kycForm.setValue("bankName", option.label);
                        }}
                        required
                      />
                    )}
                  />
                  <Controller
                    control={kycControl}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <TextInputField
                        label="Account Number"
                        placeholder="10-digit account number"
                        inputMode="numeric"
                        maxLength={10}
                        value={field.value}
                        error={kycFieldErrors.bankAccountNumber?.message}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        required
                      />
                    )}
                  />
                </div>
                <TextInputField
                  label="Account Name"
                  placeholder="Name on your bank account"
                  error={kycFieldErrors.bankAccountName?.message}
                  required
                  {...registerKyc("bankAccountName")}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    control={kycControl}
                    name="idFront"
                    render={({ field: { value, onChange } }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-heading text-sm font-medium">
                          ID Front Photo
                        </label>
                        <label className="border-line bg-light-bg hover:border-primary flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors">
                          <Upload size={16} className="text-body shrink-0" />
                          <span
                            className={value ? "text-heading" : "text-body"}
                          >
                            {value ? value.name : "Choose file"}
                          </span>
                          <input
                            ref={idFrontRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onChange(e.target.files?.[0])}
                          />
                        </label>
                        {kycFieldErrors.idFront && (
                          <p className="text-status-cancelled-fg text-xs">
                            {kycFieldErrors.idFront.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                  <Controller
                    control={kycControl}
                    name="idSelfie"
                    render={({ field: { value, onChange } }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-heading text-sm font-medium">
                          Selfie with ID
                        </label>
                        <label className="border-line bg-light-bg hover:border-primary flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors">
                          <Upload size={16} className="text-body shrink-0" />
                          <span
                            className={value ? "text-heading" : "text-body"}
                          >
                            {value ? value.name : "Choose file"}
                          </span>
                          <input
                            ref={idSelfieRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onChange(e.target.files?.[0])}
                          />
                        </label>
                        {kycFieldErrors.idSelfie && (
                          <p className="text-status-cancelled-fg text-xs">
                            {kycFieldErrors.idSelfie.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <SubmitButton
                  loading={kycSaving}
                  loadingText="Submitting..."
                  className="self-start"
                >
                  Submit KYC
                </SubmitButton>
              </motion.form>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-line rounded-2xl border bg-white p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <h3 className="font-syne text-heading font-semibold">
            Change Password
          </h3>
        </div>
        <button
          type="button"
          onClick={() => triggerDialog("CHANGE_PASSWORD", {})}
          className="bg-primary cursor-pointer self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Update password
        </button>
      </motion.div>
    </div>
  );
}
