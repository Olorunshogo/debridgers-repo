import { useState, useRef, useEffect } from "react";
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
import { BASE_BACKEND_URL } from "../../../utils/api";

export function meta() {
  return [{ title: "Settings | Debridgers" }];
}

const schema = z
  .object({
    userName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    currency: z.string().min(1, "Select a currency"),
    country: z.string().min(1, "Select a country"),
    deliveryAddress: z.string().min(5, "Enter your delivery address"),
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
  const [avatarPreview, setAvatarPreview] = useState(
    "/images/settings-avatar.jpg",
  );
  const [form, setForm] = useState<SettingsForm>({
    userName: "Abdul-Malik",
    email: "abdulmalik@example.com",
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
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

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
      // === PRODUCTION
      // const fd = new FormData();
      // Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      // const res = await fetch(`${BASE_BACKEND_URL}/buyer/settings`, {
      //   method: "POST",
      //   credentials: "include",
      //   body: fd,
      // });
      // if (!res.ok) throw new Error("Save failed");

      // === MOCK
      await new Promise<void>((r) => setTimeout(r, 900));
      setForm((p) => ({ ...p, oldPassword: "", newPassword: "" }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setErrors({ userName: "Failed to save. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto flex w-full max-w-[800px] flex-col gap-6"
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
      </AnimatePresence>

      {/* Account Information */}
      <Section title="Account Information">
        <div className="flex items-center gap-4">
          <img
            src={avatarPreview}
            alt="Avatar"
            className="h-16 w-16 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://ui-avatars.com/api/?name=Abdul+Malik&background=1e5925&color=fff";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="hover:bg-bg-light rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border-gray)",
              color: "var(--heading-colour)",
            }}
          >
            Change
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatar}
          />
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
              label="Delivery Address."
              placeholder="Enter your Address"
              value={form.deliveryAddress}
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
