import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { BASE_BACKEND_URL } from "@debridgers/api-client";
import { isAuthActionError, useAuthActions } from "../../hooks/useAuthActions";
import { kadunaStateLgas } from "../../models/models";
import { splitFullName } from "../../utils/name";

export function meta() {
  return [
    { title: "Create Account | Debridgers" },
    {
      name: "description",
      content:
        "Create your Debridgers account. Sign up as a buyer to order fresh foodstuff at market prices, or as an agent to earn commission.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// === Schemas
const buyerSchema = z
  .object({
    role: z.literal("buyer"),
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .regex(/^\d+$/, "Digits only")
      .optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    referred_by_agent_code: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const agentSchema = z
  .object({
    role: z.literal("agent"),
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .regex(/^\d+$/, "Digits only"),
    area: z.string().min(1, "Please select an area"),
    address: z.string().min(5, "Enter your home address"),
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

// === Page
export default function SignupPage() {
  const navigate = useNavigate();
  const { registerBuyer } = useAuthActions();
  const [activeTab, setActiveTab] = useState<Tab>("buyer");

  // === Buyer form state
  const [buyerForm, setBuyerForm] = useState<BuyerFormData>({
    role: "buyer",
    fullName: "",
    email: "",
    phone: undefined,
    password: "",
    confirmPassword: "",
    referred_by_agent_code: "",
  });
  const [buyerErrors, setBuyerErrors] = useState<FormErrors<BuyerFormData>>({});

  // Agent form state
  const [agentForm, setAgentForm] = useState<AgentFormData>({
    role: "agent",
    fullName: "",
    phone: "",
    area: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agentErrors, setAgentErrors] = useState<FormErrors<AgentFormData>>({});

  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

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

    setLoading(true);
    try {
      const signupResult = await registerBuyer({
        fullName: result.data.fullName,
        email: result.data.email,
        password: result.data.password,
        phone: result.data.phone,
        referredByAgentCode: result.data.referred_by_agent_code,
      });

      if (!signupResult.requiresEmailVerification) {
        navigate("/buyer-dashboard");
        return;
      }

      setRegisteredEmail(result.data.email);
      setShowSuccess(true);
    } catch (error) {
      if (isAuthActionError(error)) {
        if (error.status === 409) {
          if (error.code === "UNVERIFIED_EMAIL") {
            navigate("/verify-email", {
              state: { email: result.data.email, role: "buyer" },
            });
            return;
          }
          setApiError("This email is already registered.");
          return;
        }

        if (error.status === 400 && error.fields) {
          const errs: FormErrors<BuyerFormData> = {};
          error.fields.forEach((fieldError) => {
            errs[fieldError.field as keyof BuyerFormData] = fieldError.message;
          });
          setBuyerErrors(errs);
          return;
        }

        setApiError(error.message);
        return;
      }

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
    const formData = new FormData();
    formData.append("first_name", first_name);
    if (last_name) formData.append("last_name", last_name);
    formData.append("email", result.data.email);
    formData.append("phone", result.data.phone);
    formData.append("lga", result.data.area);
    formData.append("address", result.data.address);
    formData.append("password", result.data.password);
    formData.append("confirm_password", result.data.confirmPassword);

    setLoading(true);
    try {
      const res = await fetch(`${BASE_BACKEND_URL}/agent/apply`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json();

      if (res.status === 409) {
        if (json.code === "UNVERIFIED_EMAIL") {
          navigate("/verify-email", {
            state: { email: result.data.email, role: "agent" },
          });
          return;
        }
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
        setApiError(json.message ?? "Application failed. Please try again.");
        return;
      }

      setRegisteredEmail(result.data.email);
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
            title={
              activeTab === "agent"
                ? "Application Submitted"
                : "Account Created"
            }
            description={
              activeTab === "agent"
                ? "Check your email for a verification code. We'll review your application within 48 hours."
                : "Check your email for the verification code."
            }
            submitButtonText="Verify Email"
            redirectUrl="/verify-email"
            navigateState={{ email: registeredEmail, role: activeTab }}
          />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen w-full">
        {/* Left brand panel */}
        <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-100">
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
            <p className="max-w-125 text-lg leading-relaxed text-white">
              Join thousands of buyers and agents building a better food supply
              chain across Kaduna.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex min-h-screen flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12 lg:px-16">
          <div className="flex w-full max-w-120 flex-col gap-6">
            {/* Logo */}
            <Link to="/" className="flex justify-center">
              <AppLogo />
            </Link>

            {/* Heading */}
            <h1 className="font-syne text-heading text-center text-2xl font-bold">
              Sign Up
            </h1>

            {/* Tab switcher */}
            <div className="border-gray-border flex border-b">
              {(["buyer", "agent"] as Tab[]).map((tab) => {
                const isActive = activeTab === tab;
                const label =
                  tab === "buyer" ? "Buyer Sign Up" : "Agent Sign Up";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabChange(tab)}
                    className={`flex-1 cursor-pointer pb-2 text-sm font-semibold transition-all duration-300 ease-in-out ${
                      isActive
                        ? "text-primary border-primary"
                        : "text-text border-transparent"
                    } -mb-px border-b-2`}
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
                  className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm"
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
                      label="Home Address"
                      placeholder="No. 12 Kaura Street, Kaduna"
                      value={agentForm.address}
                      onChange={handleAgentChange("address")}
                      error={agentErrors.address}
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
                className="text-primary font-semibold underline underline-offset-2"
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
