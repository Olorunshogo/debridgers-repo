import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ShoppingBag, Briefcase, ArrowLeft, CheckCircle2 } from "lucide-react";
import ReactConfetti from "react-confetti";
import {
  AppLogo,
  DashTextInput,
  DashEmailInput,
  DashPasswordInput,
  DashSelect,
  SubmitButton,
} from "@debridgers/ui-web";
import { kadunaStateLgas } from "../../models/models";
// import { redirectAfterAuth } from "../../utils/auth-redirect";

export function meta() {
  return [
    { title: "Create Account | Debridgers" },
    { name: "description", content: "Join Debridgers as a buyer or agent." },
  ];
}

const UserRoleEnum = z.enum(["buyer", "agent"]);
type UserRole = z.infer<typeof UserRoleEnum>;

const buyerSchema = z
  .object({
    role: UserRoleEnum,
    first_name: z.string().min(3, "First name must be at least 3 characters"),
    last_name: z.string().optional().or(z.literal("")),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^\d+$/, "Phone number must contain only digits")
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
    role: UserRoleEnum,
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().optional().or(z.literal("")),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^\d+$/, "Phone number must contain only digits")
      .optional()
      .or(z.literal("")),
    lga: z.string().min(3, "Please select your Local Government Area"),
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
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="font-syne relative flex w-full cursor-pointer flex-col items-start gap-3 rounded-2xl border p-6 text-left transition-all duration-300 ease-in-out focus-visible:outline-none"
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
        <span className="text-heading text-lg font-semibold">
          {isBuyer ? "I am a Buyer" : "I am an Agent"}
        </span>
        <span className="text-text font-open-sans text-sm">
          {isBuyer
            ? "Order fresh foodstuff at market prices, delivered to your door."
            : "Source and deliver products for buyers. Earn 30% commission on every sale."}
        </span>
      </div>
    </motion.button>
  );
}

interface BuyerFormBlockProps {
  form: BuyerForm;
  errors: FormErrors<BuyerForm>;
  loading: boolean;
  apiError: string | null;
  onChange: (
    field: keyof BuyerForm,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function BuyerFormBlock({
  form,
  errors,
  loading,
  apiError,
  onChange,
  onBack,
  onSubmit,
}: BuyerFormBlockProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onBack}
          className="text-text flex w-fit cursor-pointer items-center gap-1.5 text-sm transition-all hover:opacity-70"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <h1 className="font-syne text-heading text-2xl font-bold">
          Your details
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashTextInput
          label="First name"
          placeholder="Fatima"
          value={form.first_name}
          onChange={onChange("first_name")}
          error={errors.first_name}
          required
        />
        <DashTextInput
          label="Last name"
          placeholder="Bello"
          value={form.last_name}
          onChange={onChange("last_name")}
          error={errors.last_name}
        />
      </div>
      <DashEmailInput
        label="Email address"
        placeholder="you@example.com"
        value={form.email}
        onChange={onChange("email")}
        error={errors.email}
        required
      />
      <DashTextInput
        label="Phone"
        placeholder="08012345678"
        value={form.phone ?? ""}
        onChange={onChange("phone")}
        error={errors.phone}
      />
      <DashPasswordInput
        label="Password"
        placeholder="Min. 8 characters"
        value={form.password}
        onChange={onChange("password")}
        error={errors.password}
        required
      />
      <DashPasswordInput
        label="Confirm password"
        placeholder="Repeat your password"
        value={form.confirmPassword}
        onChange={onChange("confirmPassword")}
        error={errors.confirmPassword}
        required
      />

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
          className="text-primary font-semibold underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

interface AgentFormBlockProps {
  form: AgentForm;
  errors: FormErrors<AgentForm>;
  loading: boolean;
  apiError: string | null;
  onChange: (
    field: keyof AgentForm,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLgaChange: (value: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function AgentFormBlock({
  form,
  errors,
  loading,
  apiError,
  onChange,
  onLgaChange,
  onBack,
  onSubmit,
}: AgentFormBlockProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onBack}
          className="text-text flex w-fit cursor-pointer items-center gap-1.5 text-sm transition-all hover:opacity-70"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <h1 className="font-syne text-heading text-2xl font-bold">
          Agent details
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashTextInput
          label="First name"
          placeholder="Amina"
          value={form.first_name}
          onChange={onChange("first_name")}
          error={errors.first_name}
          required
        />
        <DashTextInput
          label="Last name"
          placeholder="Yusuf"
          value={form.last_name}
          onChange={onChange("last_name")}
          error={errors.last_name}
        />
      </div>
      <DashEmailInput
        label="Email address"
        placeholder="you@example.com"
        value={form.email}
        onChange={onChange("email")}
        error={errors.email}
        required
      />
      <DashTextInput
        label="Phone number"
        placeholder="08012345678"
        value={form.phone ?? ""}
        onChange={onChange("phone")}
        error={errors.phone}
        required
      />
      <DashSelect
        label="Local Government Area"
        options={kadunaStateLgas}
        value={form.lga}
        onChange={onLgaChange}
        placeholder="Select LGA"
        required
        error={errors.lga}
      />
      <DashTextInput
        label="Home address"
        placeholder="12 Barnawa Road, Kaduna"
        value={form.address}
        onChange={onChange("address")}
        error={errors.address}
        required
      />
      <DashPasswordInput
        label="Password"
        placeholder="Min. 8 characters"
        value={form.password}
        onChange={onChange("password")}
        error={errors.password}
        required
      />
      <DashPasswordInput
        label="Confirm password"
        placeholder="Repeat your password"
        value={form.confirmPassword}
        onChange={onChange("confirmPassword")}
        error={errors.confirmPassword}
        required
      />

      <SubmitButton
        loading={loading}
        loadingText="Creating account..."
        className="mt-1 rounded-full"
      >
        Create account
      </SubmitButton>

      <p className="text-text text-center text-sm">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary font-semibold underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

interface SuccessModalProps {
  role: UserRole;
  onRedirect: () => void;
}

function SuccessModal({ role, onRedirect }: SuccessModalProps) {
  const isBuyer = role === "buyer";

  return (
    <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative z-50 mx-4 flex w-full max-w-[500px] flex-col items-center gap-6 rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
      >
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          <CheckCircle2 size={32} color="#fff" />
        </span>

        <div className="flex flex-col gap-2">
          <h2 className="font-syne text-heading text-2xl font-bold">
            {isBuyer ? "Welcome to Debridgers!" : "Application received!"}
          </h2>
          <p className="text-text font-open-sans text-sm leading-relaxed">
            {isBuyer
              ? "Congratulations! Your buyer account has been created. Fresh food at fair prices is just a few clicks away."
              : "Congratulations on applying as an agent! We'll review your application and get back to you shortly. We're excited to have you on board."}
          </p>
        </div>

        <p className="text-text text-xs opacity-60">
          You&apos;ll be redirected to the homepage in 4 seconds&hellip;
        </p>

        <SubmitButton
          type="button"
          onClick={onRedirect}
          className="bg-primary w-full rounded-full py-3 text-sm font-semibold text-white"
        >
          Click me
        </SubmitButton>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState(1);
  const [role, setRole] = useState<UserRole | null>(null);

  const [buyerForm, setBuyerForm] = useState<BuyerForm>({
    role: "buyer",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [buyerErrors, setBuyerErrors] = useState<FormErrors<BuyerForm>>({});

  const [agentForm, setAgentForm] = useState<AgentForm>({
    role: "agent",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    lga: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [agentErrors, setAgentErrors] = useState<FormErrors<AgentForm>>({});

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<UserRole | null>(null);

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  useEffect(() => {
    function onResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (successRole) {
      redirectTimer.current = setTimeout(() => navigate("/"), 4000);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [successRole, navigate]);

  function handleRedirectNow() {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    navigate("/");
  }

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

  async function handleBuyerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = buyerSchema.safeParse(buyerForm);
    if (!result.success) {
      const errs: FormErrors<BuyerForm> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof BuyerForm] = i.message;
      });
      setBuyerErrors(errs);
      return;
    }

    setLoading(true);
    try {
      // const payload = { ...result.data };
      // const res = await fetch(`${BASE_BACKEND_URL}/auth/register`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify(payload),
      // });
      // const json = await res.json();
      // if (!res.ok) { setApiError(json.message ?? "Registration failed"); return; }
      // redirectAfterAuth(navigate, "buyer");

      await new Promise<void>((res) => setTimeout(res, 1200));
      // redirectAfterAuth(navigate, "buyer");
      setSuccessRole("buyer");
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
      const errs: FormErrors<AgentForm> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof AgentForm] = i.message;
      });
      setAgentErrors(errs);
      return;
    }

    setLoading(true);
    try {
      // const payload = { ...result.data };
      // const res = await fetch(`${BASE_BACKEND_URL}/auth/register`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify(payload),
      // });
      // const json = await res.json();
      // if (!res.ok) { setApiError(json.message ?? "Registration failed"); return; }
      // redirectAfterAuth(navigate, "agent");

      await new Promise<void>((res) => setTimeout(res, 1200));
      // redirectAfterAuth(navigate, "agent");
      setSuccessRole("agent");
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {successRole && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={350}
          />
        </div>
      )}

      <AnimatePresence>
        {successRole && (
          <SuccessModal role={successRole} onRedirect={handleRedirectNow} />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen w-full">
        <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-[45%]">
          {/* Centered Space */}
          <div className="flex w-full flex-col justify-center gap-12">
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
                Join thousands of buyers and agents building a better food
                supply chain across Kaduna.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
          <div className="flex w-full max-w-[550px] flex-col gap-6">
            <div className="flex justify-center">
              <AppLogo />
            </div>

            <div className="font-syne flex items-center gap-3">
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
              <span className="text-text ml-2 text-sm">
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
                      <h1 className="font-syne text-heading text-2xl font-bold">
                        Apply as either a buyer or an agent
                      </h1>
                      <p className="text-text text-sm">
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

                    <SubmitButton
                      type="button"
                      onClick={goToStep2}
                      disabled={!role}
                      className="bg-primary mt-2 w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue
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
                    {role === "buyer" && (
                      <BuyerFormBlock
                        form={buyerForm}
                        errors={buyerErrors}
                        loading={loading}
                        apiError={apiError}
                        onChange={handleBuyerChange}
                        onBack={goBack}
                        onSubmit={handleBuyerSubmit}
                      />
                    )}

                    {role === "agent" && (
                      <AgentFormBlock
                        form={agentForm}
                        errors={agentErrors}
                        loading={loading}
                        apiError={apiError}
                        onChange={handleAgentChange}
                        onLgaChange={(value) => {
                          setAgentForm((p) => ({ ...p, lga: value }));
                          if (agentErrors.lga)
                            setAgentErrors((p) => ({ ...p, lga: undefined }));
                        }}
                        onBack={goBack}
                        onSubmit={handleAgentSubmit}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
