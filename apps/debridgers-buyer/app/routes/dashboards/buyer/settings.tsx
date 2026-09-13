import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Pencil } from "lucide-react";
import {
  TextInputField,
  SelectInputField,
  ToggleField,
  SubmitButton,
  TextareaField,
  useDialog,
  applyServerFieldErrors,
  extractServerFieldErrors,
  buyerSettingsSchema,
  type BuyerSettingsValues,
} from "@debridgers/ui-web";
import {
  apiFetch,
  ApiError,
  getAccessToken,
  BASE_BACKEND_URL,
} from "@debridgers/api-client";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Settings | Debridgers",
    description:
      "Manage your Debridgers buyer account settings including profile, notifications and security preferences.",
    path: "/settings",
    noIndex: true,
  });
}

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

const initialForm: BuyerSettingsValues = {
  userName: "",
  currency: "NGN",
  country: "NG",
  deliveryAddress: "",
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
    <div className="border-line flex flex-col gap-5 rounded-2xl border bg-white p-6">
      <h3 className="border-line font-syne text-heading border-b pb-3 text-lg font-semibold">
        {title}
      </h3>
      {children}
    </div>
  );
}

// === FieldRow
// Read-only display with a pen icon to enter edit mode.
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
          className={`text-sm ${value ? "text-heading" : "text-placeholder-text"}`}
        >
          {value || "Not set"}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-body cursor-pointer transition-opacity hover:opacity-60"
          aria-label={`Edit ${label}`}
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

// === ReadOnlyRow
// For fields that can never be edited (e.g. email).
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
  const { triggerDialog } = useDialog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<BuyerSettingsValues>({
    resolver: zodResolver(buyerSettingsSchema),
    mode: "onChange",
    defaultValues: initialForm,
  });
  const {
    register,
    control,
    formState: { errors, isDirty, isSubmitting: loading },
  } = form;
  const userName = form.watch("userName");
  const currency = form.watch("currency");
  const country = form.watch("country");
  const deliveryAddress = form.watch("deliveryAddress");
  const emailNotification = form.watch("emailNotification");
  const smsNotification = form.watch("smsNotification");
  const twoFactor = form.watch("twoFactor");

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
        sms_notifications?: boolean | null;
        two_factor_enabled?: boolean | null;
        currency?: string | null;
        country?: string | null;
      }>("/buyer/me");
      form.reset({
        userName: `${profile.first_name} ${profile.last_name}`.trim(),
        currency: profile.currency ?? initialForm.currency,
        country: profile.country ?? initialForm.country,
        deliveryAddress: profile.delivery_address ?? "",
        emailNotification: profile.email_notifications ?? true,
        smsNotification: profile.sms_notifications ?? false,
        twoFactor: profile.two_factor_enabled ?? false,
      });
      setEmail(profile.email);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      setApiError(null);
    } catch (err) {
      /* Silence here was actively unsafe: the form stays blank, so a save would submit empty values over the real profile. */
      setApiError(
        err instanceof ApiError
          ? err.message
          : "Could not load your settings. Reload the page before saving changes.",
      );
    }
  }, [form]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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

  const handleSubmit = form.handleSubmit(async (values) => {
    setSaved(false);
    setApiError(null);
    try {
      const [firstName, ...rest] = values.userName.trim().split(" ");
      await apiFetch("/buyer/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: rest.join(" ") || undefined,
          delivery_address: values.deliveryAddress.trim() || undefined,
          email_notifications: values.emailNotification,
          sms_notifications: values.smsNotification,
          two_factor_enabled: values.twoFactor,
          currency: values.currency,
          country: values.country,
        }),
      });

      form.reset(values);
      setEditing(new Set());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Failed to save changes. Please try again.",
      );

      /* firstName/lastName both come from the one userName field, so either backend field is shown there. */
      applyServerFieldErrors(err, form);
      const server = extractServerFieldErrors(err);
      if (server.firstName ?? server.lastName) {
        form.setError("userName", {
          type: "server",
          message: server.firstName ?? server.lastName,
        });
      }
    }
  });

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
            className="bg-status-delivered text-status-delivered-fg flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
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
            className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm"
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
              {userName
                ? userName
                    .trim()
                    .split(/\s+/)
                    .map((w) => w[0]?.toUpperCase() ?? "")
                    .slice(0, 2)
                    .join("")
                : "?"}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <SubmitButton
              variant="secondary"
              type="button"
              loading={avatarUploading}
              loadingText="Uploading..."
              onClick={() => fileRef.current?.click()}
            >
              Change Photo
            </SubmitButton>
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
            <TextInputField
              label="User Name"
              placeholder="Abdul-Malik"
              error={errors.userName?.message}
              required
              {...register("userName")}
            />
          ) : (
            <FieldRow
              label="User Name"
              value={userName}
              onEdit={() => startEdit("userName")}
            />
          )}
          <ReadOnlyRow label="Email" value={email} />
        </div>
      </Section>

      {/* Preference */}
      <Section title="Preference">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {editing.has("currency") ? (
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SelectInputField
                  label="Currency"
                  options={currencyOptions}
                  placeholder="Select currency"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    stopEdit("currency");
                  }}
                  error={errors.currency?.message}
                />
              )}
            />
          ) : (
            <FieldRow
              label="Currency"
              value={
                currencyOptions.find((o) => o.value === currency)?.label ??
                currency
              }
              onEdit={() => startEdit("currency")}
            />
          )}
          {editing.has("country") ? (
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <SelectInputField
                  label="Country"
                  options={countryOptions}
                  placeholder="Select your country"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    stopEdit("country");
                  }}
                  error={errors.country?.message}
                />
              )}
            />
          ) : (
            <FieldRow
              label="Country"
              value={
                countryOptions.find((o) => o.value === country)?.label ??
                country
              }
              onEdit={() => startEdit("country")}
            />
          )}
          <div className="sm:col-span-2">
            {editing.has("deliveryAddress") ? (
              <TextareaField
                label="Delivery Address"
                required
                rows={5}
                placeholder="Enter your full delivery address"
                error={errors.deliveryAddress?.message}
                {...register("deliveryAddress")}
              />
            ) : (
              <FieldRow
                label="Delivery Address"
                value={deliveryAddress}
                onEdit={() => startEdit("deliveryAddress")}
              />
            )}
          </div>
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        <button
          type="button"
          onClick={() => triggerDialog("CHANGE_PASSWORD", {})}
          className="text-primary w-fit cursor-pointer text-sm font-medium hover:underline"
        >
          Change password
        </button>
      </Section>

      {/* Notification Preference */}
      <Section title="Notification Preference">
        <div className="flex flex-col gap-5">
          <ToggleField
            label="Email Notification"
            description="Receive sign-in alerts and message confirmations. Account and security emails are always sent."
            checked={emailNotification}
            onCheckedChange={(checked) =>
              form.setValue("emailNotification", checked, {
                shouldDirty: true,
              })
            }
          />
          <ToggleField
            label="SMS Notification"
            description="Receive update via SMS"
            checked={smsNotification}
            onCheckedChange={(checked) =>
              form.setValue("smsNotification", checked, { shouldDirty: true })
            }
          />
          <ToggleField
            label="Two-factor Authentication"
            description="Add an extra layer of security to your account"
            checked={twoFactor}
            onCheckedChange={(checked) =>
              form.setValue("twoFactor", checked, { shouldDirty: true })
            }
          />
        </div>
      </Section>

      {/* Submit */}
      <div className="flex justify-end">
        <SubmitButton
          variant="block"
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
