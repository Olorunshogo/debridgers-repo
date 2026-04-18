import { useState } from "react";
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

// === Schemas
const buyerSchema = z
  .object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
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
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    state: z.string().min(1, "State is required"),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .regex(/^\d+$/, "Digits only"),
    area: z.string().min(1, "Please select an area"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type BuyerFormData = z.infer<typeof buyerSchema>;
type AgentFormData = z.infer<typeof agentSchema>;
type Tab = "buyer" | "agent";
type FormErrors<T> = Partial<Record<keyof T, string>>;

// === Helpers
function splitFullName(fullName: string): {
  first_name: string;
  last_name: string;
} {
  const idx = fullName.indexOf(" ");
  if (idx === -1) return { first_name: fullName, last_name: "" };
  return {
    first_name: fullName.slice(0, idx),
    last_name: fullName.slice(idx + 1),
  };
}

// === Page
export default function SignupPage() {
  const [activeTab, setActiveTab] = useState<Tab>("buyer");

  // === Buyer form state
  const [buyerForm, setBuyerForm] = useState<BuyerFormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [buyerErrors, setBuyerErrors] = useState<FormErrors<BuyerFormData>>({});

  // Agent form state
  const [agentForm, setAgentForm] = useState<AgentFormData>({
    fullName: "",
    state: "",
    phone: "",
    area: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agentErrors, setAgentErrors] = useState<FormErrors<AgentFormData>>({});

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // === Derived validity
  const isBuyerValid = buyerSchema.safeParse(buyerForm).success;
  const isAgentValid = agentSchema.safeParse(agentForm).success;
  const isFormValid = activeTab === "buyer" ? isBuyerValid : isAgentValid;

  // === Tab switch
  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setApiError(null);
  }

  // === Buyer form field change
  function handleBuyerChange(field: keyof BuyerFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setBuyerForm((p) => ({ ...p, [field]: e.target.value }));
      if (buyerErrors[field])
        setBuyerErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  // === Agent form field change
  function handleAgentChange(field: keyof AgentFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setAgentForm((p) => ({ ...p, [field]: e.target.value }));
      if (agentErrors[field])
        setAgentErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  // === Form Submit handlers
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

    const { first_name, last_name } = splitFullName(result.data.fullName);
    const payload = {
      first_name,
      last_name,
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

    const { first_name, last_name } = splitFullName(result.data.fullName);
    const payload = {
      first_name,
      last_name,
      email: result.data.email,
      phone: result.data.phone,
      password: result.data.password,
      role: "agent",
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

  // === Pages
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
        <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-[45%]">
          <Link to="/" className="mb-12 flex items-center gap-2">
            <span className="font-syne text-xl font-bold text-white">
              Debridgers
            </span>
          </Link>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
              Fresh food,
              <br />
              fair prices,
              <br />
              <span className="text-secondary">delivered.</span>
            </h2>
            <p className="max-w-[500px] text-lg leading-relaxed text-white">
              Join thousands of buyers and agents building a better food supply
              chain across Kaduna.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
          <div className="flex w-full max-w-[480px] flex-col gap-6">
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
                    <DashTextInput
                      label="Full Name"
                      placeholder="Fatima Bello"
                      value={buyerForm.fullName}
                      onChange={handleBuyerChange("fullName")}
                      error={buyerErrors.fullName}
                      required
                    />
                    <DashEmailInput
                      label="Email"
                      placeholder="you@example.com"
                      value={buyerForm.email}
                      onChange={handleBuyerChange("email")}
                      error={buyerErrors.email}
                      required
                    />
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
                    <DashTextInput
                      label="Full Name"
                      placeholder="Amina Yusuf"
                      value={agentForm.fullName}
                      onChange={handleAgentChange("fullName")}
                      error={agentErrors.fullName}
                      required
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DashSelect
                        label="Area"
                        options={kadunaStateLgas}
                        value={agentForm.area}
                        onChange={(value) => {
                          setAgentForm((p) => ({ ...p, area: value }));
                          if (agentErrors.area)
                            setAgentErrors((p) => ({ ...p, area: undefined }));
                        }}
                        placeholder="Select area"
                        required
                        error={agentErrors.area}
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
                    <DashTextInput
                      label="State"
                      placeholder="Kaduna"
                      value={agentForm.state}
                      onChange={handleAgentChange("state")}
                      error={agentErrors.state}
                      required
                    />
                    <DashEmailInput
                      label="Email"
                      placeholder="you@example.com"
                      value={agentForm.email}
                      onChange={handleAgentChange("email")}
                      error={agentErrors.email}
                      required
                    />
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

            {/* Sign in link */}
            <p className="text-text text-center text-sm">
              You already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--primary-color)" }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
