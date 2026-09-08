import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AuthFormShell,
  AuthCredentialsForm,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { getStagedCart } from "@debridgers/api-client";
import { useLogin, type LoginVariant } from "../../features/auth";
import { useCart, type CartItem } from "../../features/cart";
import { AUTH_IMAGES } from "../../features/auth/auth-image";

import { buildPageMeta } from "../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Log In | Debridgers",
    description:
      "Log in to your Debridgers account to manage orders, track deliveries and access your dashboard.",
    path: "/login",
    noIndex: true,
  });
}

const LOGIN_FIELDS: readonly AuthFieldDescriptor[] = [
  {
    name: "email",
    label: "Email address",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Your password",
    autoComplete: "current-password",
  },
];

interface LoginPageProps {
  variant?: LoginVariant;
}

export default function LoginPage({ variant = "public" }: LoginPageProps) {
  const { form, submit, apiError, isSubmitting } = useLogin({ variant });
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, replaceItems } = useCart();
  /* One-shot: the staged token is single-use, so a re-render must not re-fetch. */
  const stagedCartConsumedRef = useRef<boolean>(false);

  useEffect(() => {
    const token: string | null = searchParams.get("cartToken");
    if (!token || stagedCartConsumedRef.current) return;
    stagedCartConsumedRef.current = true;

    let cancelled = false;
    void getStagedCart(token).then((staged) => {
      if (cancelled) return;
      if (staged.length > 0) {
        /* Union with any cart already on this device, higher quantity wins per line, matching the server-side merge the buyer hits after login. */
        const merged: CartItem[] = items.map((existing) => ({ ...existing }));
        for (const line of staged) {
          const match = merged.find((existing) => existing.id === line.id);
          if (match) {
            match.qty = Math.max(match.qty, line.qty);
          } else {
            merged.push({
              id: line.id,
              name: line.name,
              price: line.price,
              unit: line.unit,
              image_url: line.image_url,
              qty: line.qty,
            });
          }
        }
        replaceItems(merged);
      }
      /* Strip the now-consumed token so a refresh does not re-request it. */
      const next = new URLSearchParams(searchParams);
      next.delete("cartToken");
      setSearchParams(next, { replace: true });
    });

    return () => {
      cancelled = true;
    };
    /* Runs once for the token present on mount; items/setters are stable enough and re-running on cart edits would fight the single-use token. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthFormShell
      heading="Log in to your account"
      images={AUTH_IMAGES}
      apiError={apiError}
      subheading={
        <>
          No account?{" "}
          <Link
            to="/signup"
            className="text-primary font-semibold underline underline-offset-2"
          >
            Sign up
          </Link>
        </>
      }
    >
      <AuthCredentialsForm
        fields={LOGIN_FIELDS}
        form={form}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        submitLabel="Log In"
        submittingLabel="Logging in..."
        footer={
          <Link
            to="/forgot-password"
            className="text-primary self-end text-xs font-medium underline underline-offset-2"
          >
            Forgot password?
          </Link>
        }
      />
    </AuthFormShell>
  );
}
