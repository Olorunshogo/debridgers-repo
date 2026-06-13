import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { CheckCircle2, Pencil } from "lucide-react";
import {
  DashTextInput,
  DashPasswordInput,
  DashSelectInput,
  DashSwitchInput,
  SubmitButton,
} from "@debridgers/ui-web";
import {
  apiFetch,
  getAccessToken,
  BASE_BACKEND_URL,
} from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Settings | Debridgers" },
    {
      name: "description",
      content:
        "Manage your Debridgers buyer account settings including profile, notifications and security preferences.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

const schema = z
  .object({
    userName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    currency: z.string().min(1, "Select a currency"),
    country: z.string().min(1, "Select a country"),
    deliveryAddress: z.string().optional().or(z.literal("")),
    oldPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .optional()
      .or(z.literal("")),
    emailNotification: z.boolean(),
    smsNotification: z.boolean(),
    twoFactor: z.boolean(),
  })
  .refine(
    (d) => {
      if (d.newPassword && !d.oldPassword) return false;
      if (d.oldPassword && !d.newPassword) return false;
      return true;
    },
    {
      message: "Both old and new passwords are required",
      path: ["newPassword"],
    },
  );

type SettingsForm = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof SettingsForm, string>>;

const currencyOptions = [
  { value: "NGN", label: "Nigerian Naira (₦)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "British Pound (£)" },
];

const countryOptions = [
  { value: "NG", label: "Nigeria" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
];

const initialForm: SettingsForm = {
  userName: "",
  email: "",
  currency: "NGN",
  country: "NG",
  deliveryAddress: "",
  oldPassword: "",
  newPassword: "",
  emailNotification: true,
  smsNotification: false,
  twoFactor: false,
};

// === Section
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-gray-border flex flex-col gap-5 rounded-2xl border bg-white p-6">
      <h3 className="border-gray-border font-syne text-heading border-b pb-3 text-lg font-semibold">
        {title}
      </h3>
      {children}
    </div>
  );
}

// === FieldRow - read-only display with pen icon to enter edit mode
function FieldRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="font-syne flex flex-col gap-1.5">
      <span className="text-heading font-syne font-medium">{label}</span>
      <div className="bg-input-bg border-input-border flex h-11 items-center justify-between rounded-full border px-4">
        <span
          className={`text-sm ${value ? "text-heading" : "text-text-placeholder"}`}
        >
          {value || "Not set"}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-text cursor-pointer transition-opacity hover:opacity-60"
          aria-label={`Edit ${label}`}
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

// === ReadOnlyRow - for fields that can never be edited (e.g. email)
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="font-syne flex flex-col gap-1.5">
      <span className="text-heading font-syne font-medium">{label}</span>
      <div className="bg-input-bg border-input-border flex h-11 items-center rounded-full border px-4 opacity-60">
        <span className="text-heading text-sm">{value || "Not set"}</span>
      </div>
    </div>
  );
}

export default function BuyerSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [original, setOriginal] = useState<SettingsForm>(initialForm);
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function startEdit(field: string) {
    setEditing((prev) => new Set(prev).add(field));
  }

  function stopEdit(field: string) {
    setEditing((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  const isDirty = useMemo(() => {
    return (
      form.userName !== original.userName ||
      form.currency !== original.currency ||
      form.country !== original.country ||
      (form.deliveryAddress ?? "") !== (original.deliveryAddress ?? "") ||
      form.emailNotification !== original.emailNotification ||
      form.smsNotification !== original.smsNotification ||
      form.twoFactor !== original.twoFactor ||
      !!form.oldPassword ||
      !!form.newPassword
    );
  }, [form, original]);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await apiFetch<{
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
        delivery_address?: string | null;
        avatar_url?: string | null;
        email_notifications?: boolean | null;
      }>("/buyer/me");
      const loaded: SettingsForm = {
        ...initialForm,
        userName: `${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.email,
        deliveryAddress: profile.delivery_address ?? "",
        emailNotification: profile.email_notifications ?? true,
      };
      setForm(loaded);
      setOriginal(loaded);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
    } catch {
      // silently fail - form stays blank
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function handleText(field: keyof SettingsForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  function handleSelect(field: keyof SettingsForm) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  function handleSwitch(field: keyof SettingsForm) {
    return (checked: boolean) => setForm((p) => ({ ...p, [field]: checked }));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setApiError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getAccessToken();
      const res = await fetch(`${BASE_BACKEND_URL}/buyer/avatar`, {
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
      setApiError(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setApiError(null);

    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof FormErrors] = i.message;
      });
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const [firstName, ...rest] = result.data.userName.trim().split(" ");
      await apiFetch("/buyer/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: rest.join(" ") || undefined,
          delivery_address: result.data.deliveryAddress?.trim() || undefined,
          email_notifications: result.data.emailNotification,
        }),
      });

      if (result.data.oldPassword && result.data.newPassword) {
        await apiFetch("/buyer/password", {
          method: "PATCH",
          body: JSON.stringify({
            old_password: result.data.oldPassword,
            new_password: result.data.newPassword,
          }),
        });
      }

      const saved = result.data;
      setOriginal((p) => ({
        ...p,
        userName: saved.userName,
        currency: saved.currency,
        country: saved.country,
        deliveryAddress: saved.deliveryAddress ?? "",
        emailNotification: saved.emailNotification,
        smsNotification: saved.smsNotification,
        twoFactor: saved.twoFactor,
      }));
      setForm((p) => ({ ...p, oldPassword: "", newPassword: "" }));
      setEditing(new Set());
      setPasswordOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save changes. Please try again.";
      setApiError(
        msg.includes("incorrect") ? "Current password is incorrect." : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto flex w-full flex-col gap-6"
    >
      {/* Success / error toasts */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-status-delivered-bg text-status-delivered-text flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          >
            <CheckCircle2 size={16} />
            Settings saved successfully.
          </motion.div>
        )}
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm"
          >
            {apiError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Information */}
      <Section title="Account Information">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="bg-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white">
              {form.userName
                ? form.userName
                    .trim()
                    .split(/\s+/)
                    .map((w) => w[0]?.toUpperCase() ?? "")
                    .slice(0, 2)
                    .join("")
                : "?"}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="border-gray-border text-heading cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {avatarUploading ? "Uploading..." : "Change Photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {editing.has("userName") ? (
            <DashTextInput
              label="User Name"
              placeholder="Abdul-Malik"
              value={form.userName}
              onChange={handleText("userName")}
              error={errors.userName}
              required
            />
          ) : (
            <FieldRow
              label="User Name"
              value={form.userName}
              onEdit={() => startEdit("userName")}
            />
          )}
          <ReadOnlyRow label="Email" value={form.email} />
        </div>
      </Section>

      {/* Preference */}
      <Section title="Preference">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {editing.has("currency") ? (
            <DashSelectInput
              label="Currency"
              options={currencyOptions}
              placeholder="Select currency"
              value={form.currency}
              onChange={(e) => {
                handleSelect("currency")(e);
                stopEdit("currency");
              }}
              error={errors.currency}
            />
          ) : (
            <FieldRow
              label="Currency"
              value={
                currencyOptions.find((o) => o.value === form.currency)?.label ??
                form.currency
              }
              onEdit={() => startEdit("currency")}
            />
          )}
          {editing.has("country") ? (
            <DashSelectInput
              label="Country"
              options={countryOptions}
              placeholder="Select your country"
              value={form.country}
              onChange={(e) => {
                handleSelect("country")(e);
                stopEdit("country");
              }}
              error={errors.country}
            />
          ) : (
            <FieldRow
              label="Country"
              value={
                countryOptions.find((o) => o.value === form.country)?.label ??
                form.country
              }
              onEdit={() => startEdit("country")}
            />
          )}
          <div className="sm:col-span-2">
            {editing.has("deliveryAddress") ? (
              <div className="font-syne flex flex-col gap-1.5">
                <span className="text-heading font-syne font-medium">
                  Delivery Address
                </span>
                <textarea
                  rows={5}
                  placeholder="Enter your full delivery address"
                  value={form.deliveryAddress ?? ""}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, deliveryAddress: e.target.value }));
                    if (errors.deliveryAddress)
                      setErrors((p) => ({
                        ...p,
                        deliveryAddress: undefined,
                      }));
                  }}
                  className="bg-input-bg border-input-border text-heading placeholder:text-text-placeholder w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none"
                />
                {errors.deliveryAddress && (
                  <span className="text-error-red text-xs">
                    {errors.deliveryAddress}
                  </span>
                )}
              </div>
            ) : (
              <FieldRow
                label="Delivery Address"
                value={form.deliveryAddress ?? ""}
                onEdit={() => startEdit("deliveryAddress")}
              />
            )}
          </div>
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        {passwordOpen ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DashPasswordInput
              label="Old Password"
              placeholder="Current password"
              value={form.oldPassword ?? ""}
              onChange={handleText("oldPassword")}
              error={errors.oldPassword}
            />
            <DashPasswordInput
              label="New Password"
              placeholder="New password"
              value={form.newPassword ?? ""}
              onChange={handleText("newPassword")}
              error={errors.newPassword}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="text-primary w-fit cursor-pointer text-sm font-medium hover:underline"
          >
            Change password
          </button>
        )}
      </Section>

      {/* Notification Preference */}
      <Section title="Notification Preference">
        <div className="flex flex-col gap-5">
          <DashSwitchInput
            label="Email Notification"
            description="Receive update via email"
            checked={form.emailNotification}
            onCheckedChange={handleSwitch("emailNotification")}
          />
          <DashSwitchInput
            label="SMS Notification"
            description="Receive update via SMS"
            checked={form.smsNotification}
            onCheckedChange={handleSwitch("smsNotification")}
          />
          <DashSwitchInput
            label="Two-factor Authentication"
            description="Add an extra layer of security to your account"
            checked={form.twoFactor}
            onCheckedChange={handleSwitch("twoFactor")}
          />
        </div>
      </Section>

      {/* Submit */}
      <div className="flex justify-end">
        <SubmitButton
          loading={loading}
          loadingText="Saving..."
          disabled={!isDirty}
          className="w-auto rounded-full px-8"
        >
          Save Changes
        </SubmitButton>
      </div>
    </form>
  );
}
