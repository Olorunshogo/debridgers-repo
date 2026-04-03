import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ShoppingBag, Briefcase, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  AppLogo,
  DashTextInput,
  DashEmailInput,
  DashPasswordInput,
  SubmitButton,
} from "@debridgers/ui-web";
import type { UserRole } from "../../types/auth";

export function meta() {
  return [
    { title: "Create Account | Debridgers" },
    { name: "description", content: "Join Debridgers as a buyer or agent." },
  ];
}

const buyerSchema = z
  .object({
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const agentSchema = z
  .object({
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(10, "Phone must be at least 10 digits"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type BuyerForm = z.infer<typeof buyerSchema>;
type AgentForm = z.infer<typeof agentSchema>;
type FormErrors<T> = Partial<Record<keyof T, string>>;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

interface RoleCardProps {
  role: "buyer" | "agent";
  selected: boolean;
  onSelect: () => void;
}

function RoleCard({ role, selected, onSelect }: RoleCardProps) {
  const isBuyer = role === "buyer";
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex w-full flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all duration-200 focus-visible:outline-none"
      style={{
        borderColor: selected ? "var(--primary-color)" : "var(--border-gray)",
        backgroundColor: selected
          ? "var(--dash-quick-action-hover)"
          : "var(--input-bg)",
      }}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4"
        >
          <CheckCircle2 size={20} style={{ color: "var(--primary-color)" }} />
        </motion.span>
      )}
      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          backgroundColor: selected
            ? "var(--primary-color)"
            : "var(--bg-light)",
        }}
      >
        {isBuyer ? (
          <ShoppingBag
            size={22}
            color={selected ? "#fff" : "var(--primary-color)"}
          />
        ) : (
          <Briefcase
            size={22}
            color={selected ? "#fff" : "var(--primary-color)"}
          />
        )}
      </span>
      <div className="flex flex-col gap-1">
        <span
          className="text-base font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          {isBuyer ? "I am a Buyer" : "I am an Agent"}
        </span>
        <span className="text-sm" style={{ color: "var(--text-colour)" }}>
          {isBuyer
            ? "Order fresh foodstuff at market prices, delivered to your door."
            : "Source and deliver products for buyers. Earn 30% commission on every sale."}
        </span>
      </div>
    </motion.button>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState(1);
  const [role, setRole] = useState<"buyer" | "agent" | null>(null);

  const [buyerForm, setBuyerForm] = useState<BuyerForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [buyerErrors, setBuyerErrors] = useState<FormErrors<BuyerForm>>({});

  const [agentForm, setAgentForm] = useState<AgentForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [agentErrors, setAgentErrors] = useState<FormErrors<AgentForm>>({});

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function goToStep2() {
    if (!role) return;
    setDirection(1);
    setStep(2);
  }

  function goBack() {
    setDirection(-1);
    setStep(1);
    setApiError(null);
  }

  function handleBuyerChange(field: keyof BuyerForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setBuyerForm((p) => ({ ...p, [field]: e.target.value }));
      if (buyerErrors[field])
        setBuyerErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  function handleAgentChange(field: keyof AgentForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setAgentForm((p) => ({ ...p, [field]: e.target.value }));
      if (agentErrors[field])
        setAgentErrors((p) => ({ ...p, [field]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (role === "buyer") {
      const result = buyerSchema.safeParse(buyerForm);
      if (!result.success) {
        const errs: FormErrors<BuyerForm> = {};
        result.error.issues.forEach((i) => {
          errs[i.path[0] as keyof BuyerForm] = i.message;
        });
        setBuyerErrors(errs);
        return;
      }
    } else {
      const result = agentSchema.safeParse(agentForm);
      if (!result.success) {
        const errs: FormErrors<AgentForm> = {};
        result.error.issues.forEach((i) => {
          errs[i.path[0] as keyof AgentForm] = i.message;
        });
        setAgentErrors(errs);
        return;
      }
    }

    setLoading(true);
    try {
      // -- PRODUCTION --
      // const payload = role === "buyer"
      //   ? { ...buyerForm, role: "buyer" as UserRole }
      //   : { ...agentForm, role: "agent" as UserRole };
      // const res = await fetch(`${BASE_BACKEND_URL}/auth/register`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify(payload),
      // });
      // const json = await res.json();
      // if (!res.ok) { setApiError(json.message ?? "Registration failed"); return; }
      // navigate(role === "agent" ? "/agent-dashboard" : "/buyer-dashboard");

      // -- MOCK (remove when backend is live) --
      await new Promise<void>((res) => setTimeout(res, 1200));
      const mockRole: UserRole = role === "agent" ? "agent" : "buyer";
      navigate(mockRole === "agent" ? "/agent-dashboard" : "/buyer-dashboard");
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div
        className="hidden flex-col justify-between p-12 lg:flex lg:w-[45%]"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <AppLogo />

        <div className="flex flex-col gap-6">
          <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
            Fresh food,
            <br />
            fair prices,
            <br />
            <span style={{ color: "var(--secondary-color)" }}>delivered.</span>
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-white/80">
            Join thousands of buyers and agents building a better food supply
            chain across Kaduna.
          </p>
        </div>
        <div className="relative h-40 w-full overflow-hidden opacity-20">
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full border-24 border-white" />
          <div className="absolute -bottom-8 left-24 h-40 w-40 rounded-full border-16 border-white" />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <AppLogo />
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
                  style={{
                    backgroundColor:
                      step >= s ? "var(--primary-color)" : "var(--bg-light)",
                    color: step >= s ? "#fff" : "var(--text-colour)",
                  }}
                >
                  {step > s ? <CheckCircle2 size={14} /> : s}
                </div>
                {s < 2 && (
                  <div
                    className="h-px w-12 transition-all duration-500"
                    style={{
                      backgroundColor:
                        step > s
                          ? "var(--primary-color)"
                          : "var(--border-gray)",
                    }}
                  />
                )}
              </div>
            ))}
            <span
              className="ml-2 text-sm"
              style={{ color: "var(--text-colour)" }}
            >
              {step === 1 ? "Choose your role" : "Your details"}
            </span>
          </div>

          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 ? (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-1">
                    <h1
                      className="font-syne text-2xl font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      Create your account
                    </h1>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-colour)" }}
                    >
                      How will you be using Debridgers?
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <RoleCard
                      role="buyer"
                      selected={role === "buyer"}
                      onSelect={() => setRole("buyer")}
                    />
                    <RoleCard
                      role="agent"
                      selected={role === "agent"}
                      onSelect={() => setRole("agent")}
                    />
                  </div>

                  <motion.button
                    type="button"
                    onClick={goToStep2}
                    disabled={!role}
                    whileHover={role ? { scale: 1.01 } : {}}
                    whileTap={role ? { scale: 0.99 } : {}}
                    className="mt-2 w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: "var(--primary-color)" }}
                  >
                    Continue
                  </motion.button>

                  <p
                    className="text-center text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-semibold underline underline-offset-2"
                      style={{ color: "var(--primary-color)" }}
                    >
                      Sign in
                    </Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex flex-col gap-5"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={goBack}
                        className="mb-1 flex w-fit items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                        style={{ color: "var(--text-colour)" }}
                      >
                        <ArrowLeft size={15} />
                        Back
                      </button>
                      <h1
                        className="font-syne text-2xl font-bold"
                        style={{ color: "var(--heading-colour)" }}
                      >
                        {role === "agent" ? "Agent details" : "Your details"}
                      </h1>
                    </div>

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

                    {role === "buyer" ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <DashTextInput
                            label="First name"
                            placeholder="Fatima"
                            value={buyerForm.first_name}
                            onChange={handleBuyerChange("first_name")}
                            error={buyerErrors.first_name}
                            required
                          />
                          <DashTextInput
                            label="Last name"
                            placeholder="Bello"
                            value={buyerForm.last_name}
                            onChange={handleBuyerChange("last_name")}
                            error={buyerErrors.last_name}
                            required
                          />
                        </div>
                        <DashEmailInput
                          label="Email address"
                          placeholder="you@example.com"
                          value={buyerForm.email}
                          onChange={handleBuyerChange("email")}
                          error={buyerErrors.email}
                          required
                        />
                        <DashTextInput
                          label="Phone (optional)"
                          placeholder="08012345678"
                          value={buyerForm.phone ?? ""}
                          onChange={handleBuyerChange("phone")}
                          error={buyerErrors.phone}
                        />
                        <DashPasswordInput
                          label="Password"
                          placeholder="Min. 8 characters"
                          value={buyerForm.password}
                          onChange={handleBuyerChange("password")}
                          error={buyerErrors.password}
                          required
                        />
                        <DashPasswordInput
                          label="Confirm password"
                          placeholder="Repeat your password"
                          value={buyerForm.confirmPassword}
                          onChange={handleBuyerChange("confirmPassword")}
                          error={buyerErrors.confirmPassword}
                          required
                        />
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <DashTextInput
                            label="First name"
                            placeholder="Amina"
                            value={agentForm.first_name}
                            onChange={handleAgentChange("first_name")}
                            error={agentErrors.first_name}
                            required
                          />
                          <DashTextInput
                            label="Last name"
                            placeholder="Yusuf"
                            value={agentForm.last_name}
                            onChange={handleAgentChange("last_name")}
                            error={agentErrors.last_name}
                            required
                          />
                        </div>
                        <DashEmailInput
                          label="Email address"
                          placeholder="you@example.com"
                          value={agentForm.email}
                          onChange={handleAgentChange("email")}
                          error={agentErrors.email}
                          required
                        />
                        <DashTextInput
                          label="Phone number"
                          placeholder="08012345678"
                          value={agentForm.phone}
                          onChange={handleAgentChange("phone")}
                          error={agentErrors.phone}
                          required
                        />
                        <DashTextInput
                          label="Home address"
                          placeholder="12 Barnawa Road, Kaduna"
                          value={agentForm.address}
                          onChange={handleAgentChange("address")}
                          error={agentErrors.address}
                          required
                        />
                        <DashPasswordInput
                          label="Password"
                          placeholder="Min. 8 characters"
                          value={agentForm.password}
                          onChange={handleAgentChange("password")}
                          error={agentErrors.password}
                          required
                        />
                        <DashPasswordInput
                          label="Confirm password"
                          placeholder="Repeat your password"
                          value={agentForm.confirmPassword}
                          onChange={handleAgentChange("confirmPassword")}
                          error={agentErrors.confirmPassword}
                          required
                        />
                      </>
                    )}

                    <SubmitButton
                      loading={loading}
                      loadingText="Creating account..."
                      className="mt-1 rounded-full"
                    >
                      Create account
                    </SubmitButton>

                    <p
                      className="text-center text-sm"
                      style={{ color: "var(--text-colour)" }}
                    >
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="font-semibold underline underline-offset-2"
                        style={{ color: "var(--primary-color)" }}
                      >
                        Sign in
                      </Link>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
