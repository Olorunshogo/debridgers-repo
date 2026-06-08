import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import {
  DashTextInput,
  DashEmailInput,
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

// === Section
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-5 rounded-2xl border p-6"
      style={{
        borderColor: "var(--border-gray)",
        backgroundColor: "var(--white)",
      }}
    >
      <h3
        className="font-syne border-b pb-3 text-lg font-semibold"
        style={{
          borderColor: "var(--border-gray)",
          color: "var(--heading-colour)",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function BuyerSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState<SettingsForm>({
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
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await apiFetch<{
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
        delivery_address?: string | null;
        avatar_url?: string | null;
      }>("/buyer/me");
      setForm((p) => ({
        ...p,
        userName: `${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.email,
        deliveryAddress: profile.delivery_address ?? "",
      }));
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
        }),
      });
      setForm((p) => ({ ...p, oldPassword: "", newPassword: "" }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setApiError("Failed to save changes. Please try again.");
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
      {/* Success toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--status-delivered-bg)",
              color: "var(--status-delivered-text)",
            }}
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
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--status-cancelled-bg)",
              color: "var(--status-cancelled-text)",
            }}
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
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
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
              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-60"
              style={{
                borderColor: "var(--border-gray)",
                color: "var(--heading-colour)",
              }}
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
          <DashTextInput
            label="User Name"
            placeholder="Abdul-Malik"
            value={form.userName}
            onChange={handleText("userName")}
            error={errors.userName}
            required
          />
          <DashEmailInput
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleText("email")}
            error={errors.email}
            readOnly
            required
          />
        </div>
      </Section>

      {/* Preference */}
      <Section title="Preference">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <DashSelectInput
            label="Currency"
            options={currencyOptions}
            placeholder="Select currency"
            value={form.currency}
            onChange={handleSelect("currency")}
            error={errors.currency}
          />
          <DashSelectInput
            label="Country"
            options={countryOptions}
            placeholder="Select your country"
            value={form.country}
            onChange={handleSelect("country")}
            error={errors.country}
          />
          <div className="sm:col-span-2">
            <DashTextInput
              label="Delivery Address"
              placeholder="Enter your full delivery address"
              value={form.deliveryAddress ?? ""}
              onChange={handleText("deliveryAddress")}
              error={errors.deliveryAddress}
            />
          </div>
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DashPasswordInput
            label="Old Password"
            placeholder="Oldpassword"
            value={form.oldPassword ?? ""}
            onChange={handleText("oldPassword")}
            error={errors.oldPassword}
          />
          <DashPasswordInput
            label="New Password"
            placeholder="Newpassword"
            value={form.newPassword ?? ""}
            onChange={handleText("newPassword")}
            error={errors.newPassword}
          />
        </div>
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
            description="Receive update via email"
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

      {/* Submit Button */}
      <div className="flex justify-end">
        <SubmitButton
          loading={loading}
          loadingText="Saving..."
          className="w-auto rounded-full px-8"
        >
          Save Changes
        </SubmitButton>
      </div>
    </form>
  );
}
