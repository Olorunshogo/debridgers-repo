import { useState } from "react";
import type React from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import {
  AppLogo,
  DashTextInput,
  DashEmailInput,
  DashPasswordInput,
  DashSelect,
  SubmitButton,
} from "@debridgers/ui-web";
import AuthSuccessModal from "../../components/auth/AuthSuccessModal";
import { FileUploadField } from "../../components/FileUploadField";
import { BASE_BACKEND_URL } from "../../utils/api";
import { storeTokens } from "../../lib/auth";
import { kadunaStateLgas } from "../../models/models";

export function meta() {
  return [
    { title: "Create Account | Debridgers" },
    {
      name: "description",
      content:
        "Create a Debridgers account as a buyer to order fresh foodstuff at market prices, or sign up as an agent to start earning commissions.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// === Brand panel content per tab
const brandContent: Record<Tab, { heading: React.ReactNode; sub: string }> = {
  buyer: {
    heading: (
      <>
        Fresh food,
        <br />
        fair prices,
        <br />
        <span className="text-secondary">delivered.</span>
      </>
    ),
    sub: "Join thousands of buyers and agents building a better food supply chain across Kaduna.",
  },
  agent: {
    heading: (
      <>
        Earn more,
        <br />
        grow faster,
        <br />
        <span className="text-secondary">together.</span>
      </>
    ),
    sub: "Join our network of agents and start earning commissions delivering fresh produce across Kaduna.",
  },
};

// === Schemas
const buyerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .regex(/^\d+$/, "Digits only"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const agentSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string(),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .regex(/^\d+$/, "Digits only"),
    lga: z.string().min(1, "Please select an LGA"),
    address: z.string().min(1, "Address is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    referredByAgentCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type BuyerFormData = z.infer<typeof buyerSchema>;
type AgentFormData = z.infer<typeof agentSchema>;
type Tab = "buyer" | "agent";
type FormErrors<T> = Partial<Record<keyof T, string>>;

// === Page
export default function SignupPage() {
  const [activeTab, setActiveTab] = useState<Tab>("buyer");

  // === Buyer form state
  const [buyerForm, setBuyerForm] = useState<BuyerFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [buyerErrors, setBuyerErrors] = useState<FormErrors<BuyerFormData>>({});

  // === Agent form state
  const [agentForm, setAgentForm] = useState<AgentFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    lga: "",
    address: "",
    password: "",
    confirmPassword: "",
    referredByAgentCode: "",
  });
  const [agentErrors, setAgentErrors] = useState<FormErrors<AgentFormData>>({});
  const [agentCv, setAgentCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // === Derived validity
  const isBuyerValid = buyerSchema.safeParse(buyerForm).success;
  const isAgentValid =
    agentSchema.safeParse(agentForm).success && agentCv !== null;
  const isFormValid = activeTab === "buyer" ? isBuyerValid : isAgentValid;

  // === Tab switch
  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setApiError(null);
  }

  // === Buyer field change
  function handleBuyerChange(field: keyof BuyerFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setBuyerForm((p) => ({ ...p, [field]: e.target.value }));
      if (buyerErrors[field])
        setBuyerErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  // === Agent field change
  function handleAgentChange(field: keyof AgentFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setAgentForm((p) => ({ ...p, [field]: e.target.value }));
      if (agentErrors[field])
        setAgentErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  // === Submit handlers
  async function handleBuyerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = buyerSchema.safeParse(buyerForm);
    if (!result.success) {
      const errs: FormErrors<BuyerFormData> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof BuyerFormData] = i.message;
      });
      setBuyerErrors(errs);
      return;
    }

    const payload = {
      first_name: result.data.firstName,
      last_name: result.data.lastName,
      phone: result.data.phone,
      email: result.data.email,
      password: result.data.password,
      role: "buyer",
    };

    setLoading(true);
    try {
      const res = await fetch(`${BASE_BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.status === 409) {
        setApiError("This email is already registered.");
        return;
      }
      if (res.status === 400) {
        const errs: FormErrors<BuyerFormData> = {};
        (json.errors ?? []).forEach(
          (err: { field: string; message: string }) => {
            errs[err.field as keyof BuyerFormData] = err.message;
          },
        );
        setBuyerErrors(errs);
        return;
      }
      if (!res.ok) {
        setApiError(json.message ?? "Registration failed.");
        return;
      }

      storeTokens(json.data?.accessToken ?? "", json.data?.refreshToken ?? "");
      setShowSuccess(true);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAgentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = agentSchema.safeParse(agentForm);
    if (!result.success) {
      const errs: FormErrors<AgentFormData> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof AgentFormData] = i.message;
      });
      setAgentErrors(errs);
      return;
    }

    if (!agentCv) {
      setCvError("Please upload your CV");
      return;
    }

    // Build FormData for multipart/form-data (required for file upload)
    const fd = new FormData();
    fd.append("first_name", result.data.firstName);
    fd.append("last_name", result.data.lastName ?? "");
    fd.append("email", result.data.email);
    fd.append("phone", result.data.phone);
    fd.append("lga", result.data.lga);
    fd.append("address", result.data.address);
    fd.append("password", result.data.password);
    fd.append("cv", agentCv);
    if (result.data.referredByAgentCode) {
      fd.append("referred_by_agent_code", result.data.referredByAgentCode);
    }

    setLoading(true);
    try {
      // No Content-Type header — browser sets multipart/form-data with boundary
      const res = await fetch(`${BASE_BACKEND_URL}/auth/apply`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();

      if (res.status === 409) {
        setApiError("This email is already registered.");
        return;
      }
      if (res.status === 400) {
        const errs: FormErrors<AgentFormData> = {};
        (json.errors ?? []).forEach(
          (err: { field: string; message: string }) => {
            errs[err.field as keyof AgentFormData] = err.message;
          },
        );
        setAgentErrors(errs);
        return;
      }
      if (!res.ok) {
        setApiError(json.message ?? "Registration failed.");
        return;
      }

      storeTokens(json.data?.accessToken ?? "", json.data?.refreshToken ?? "");
      setShowSuccess(true);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // === Render
  return (
    <>
      <AnimatePresence>
        {showSuccess && (
          <AuthSuccessModal
            title="Account Created"
            description="Check your email for the verification code."
            submitButtonText="Verify Email"
            redirectUrl="/verify-email"
          />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen w-full">
        {/* Left brand panel */}
        <div className="bg-primary sticky top-0 hidden h-screen flex-col justify-center p-12 lg:flex lg:w-[45%]">
          <Link to="/" className="mb-12 flex items-center gap-2">
            <span className="font-syne text-xl font-bold text-white">
              Debridgers
            </span>
          </Link>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
                  {brandContent[activeTab].heading}
                </h2>
                <p className="max-w-prose text-lg leading-relaxed text-white">
                  {brandContent[activeTab].sub}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12 lg:px-16">
          <div className="flex w-full max-w-[480px] flex-col gap-6" bg-red-900>
            {/* Logo */}
            <Link to="/" className="flex justify-center">
              <AppLogo />
            </Link>

            {/* Heading */}
            <h1 className="font-syne text-heading text-center text-2xl font-bold">
              Sign Up
            </h1>

            {/* Tab switcher */}
            <div
              className="flex border-b"
              style={{ borderColor: "var(--border-gray)" }}
            >
              {(["buyer", "agent"] as Tab[]).map((tab) => {
                const isActive = activeTab === tab;
                const label =
                  tab === "buyer" ? "Buyer Sign Up" : "Agent Sign Up";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabChange(tab)}
                    className="flex-1 cursor-pointer pb-2 text-sm font-semibold transition-all duration-300 ease-in-out"
                    style={{
                      color: isActive
                        ? "var(--primary-color)"
                        : "var(--text-colour)",
                      borderBottom: isActive
                        ? "2px solid var(--primary-color)"
                        : "2px solid transparent",
                      marginBottom: "-1px",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* API error */}
            <AnimatePresence>
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

            {/* Form */}
            <form
              onSubmit={
                activeTab === "buyer" ? handleBuyerSubmit : handleAgentSubmit
              }
              noValidate
              className="flex flex-col gap-4"
            >
              <AnimatePresence mode="wait">
                {activeTab === "buyer" ? (
                  <motion.div
                    key="buyer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    {/* First and Last Name */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <DashTextInput
                        label="First Name"
                        placeholder="Fatima"
                        value={buyerForm.firstName}
                        onChange={handleBuyerChange("firstName")}
                        error={buyerErrors.firstName}
                        required
                      />
                      <DashTextInput
                        label="Last Name"
                        placeholder="Bello"
                        value={buyerForm.lastName}
                        onChange={handleBuyerChange("lastName")}
                        error={buyerErrors.lastName}
                        required
                      />
                    </div>

                    {/* Email and Phone Number */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <DashEmailInput
                        label="Email"
                        placeholder="you@example.com"
                        value={buyerForm.email}
                        onChange={handleBuyerChange("email")}
                        error={buyerErrors.email}
                        required
                      />
                      <DashTextInput
                        label="Phone Number"
                        placeholder="09012288798"
                        value={buyerForm.phone}
                        onChange={handleBuyerChange("phone")}
                        error={buyerErrors.phone}
                        required
                      />
                    </div>

                    {/* Password */}
                    <DashPasswordInput
                      label="Create Password"
                      placeholder="Min. 8 characters"
                      value={buyerForm.password}
                      onChange={handleBuyerChange("password")}
                      error={buyerErrors.password}
                      required
                    />
                    <DashPasswordInput
                      label="Confirm Password"
                      placeholder="Repeat your password"
                      value={buyerForm.confirmPassword}
                      onChange={handleBuyerChange("confirmPassword")}
                      error={buyerErrors.confirmPassword}
                      required
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="agent"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    {/* First and Last Name */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DashTextInput
                        label="First Name"
                        placeholder="Amina"
                        value={agentForm.firstName}
                        onChange={handleAgentChange("firstName")}
                        error={agentErrors.firstName}
                        required
                      />
                      <DashTextInput
                        label="Last Name"
                        placeholder="Yusuf"
                        value={agentForm.lastName}
                        onChange={handleAgentChange("lastName")}
                        error={agentErrors.lastName}
                      />
                    </div>

                    {/* LGA and Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DashSelect
                        label="LGA"
                        options={kadunaStateLgas}
                        value={agentForm.lga}
                        onChange={(value) => {
                          setAgentForm((p) => ({ ...p, lga: value }));
                          if (agentErrors.lga)
                            setAgentErrors((p) => ({ ...p, lga: undefined }));
                        }}
                        placeholder="Select LGA"
                        required
                        error={agentErrors.lga}
                      />
                      <DashTextInput
                        label="Phone No"
                        placeholder="08012345678"
                        value={agentForm.phone}
                        onChange={handleAgentChange("phone")}
                        error={agentErrors.phone}
                        required
                      />
                    </div>

                    {/* Address */}
                    <DashTextInput
                      label="Address"
                      placeholder="12 Market Road, Kaduna"
                      value={agentForm.address}
                      onChange={handleAgentChange("address")}
                      error={agentErrors.address}
                      required
                    />

                    {/* Email */}
                    <DashEmailInput
                      label="Email"
                      placeholder="you@example.com"
                      value={agentForm.email}
                      onChange={handleAgentChange("email")}
                      error={agentErrors.email}
                      required
                    />

                    {/* Passwords */}
                    <DashPasswordInput
                      label="Create Password"
                      placeholder="Min. 8 characters"
                      value={agentForm.password}
                      onChange={handleAgentChange("password")}
                      error={agentErrors.password}
                      required
                    />
                    <DashPasswordInput
                      label="Confirm Password"
                      placeholder="Repeat your password"
                      value={agentForm.confirmPassword}
                      onChange={handleAgentChange("confirmPassword")}
                      error={agentErrors.confirmPassword}
                      required
                    />

                    {/* Agent referral code (optional) */}
                    <DashTextInput
                      label="Agent Referral Code"
                      placeholder="e.g. AGT-00123"
                      value={agentForm.referredByAgentCode ?? ""}
                      onChange={handleAgentChange("referredByAgentCode")}
                      error={agentErrors.referredByAgentCode}
                    />

                    {/* CV upload (optional) */}
                    <FileUploadField
                      label="CV"
                      accept=".pdf,.doc,.docx"
                      maxSizeMB={5}
                      required
                      error={cvError ?? undefined}
                      onFileChange={(f) => {
                        setAgentCv(f);
                        if (f) setCvError(null);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <SubmitButton
                loading={loading}
                loadingText="Creating account..."
                disabled={!isFormValid}
                className="mt-2 w-full rounded-full"
              >
                Sign Up
              </SubmitButton>
            </form>

            {/* Log in link */}
            <p className="text-text text-center text-sm">
              You already have an account?{" "}
              <Link
                to="/login"
                className="text-primary font-semibold underline underline-offset-2"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
