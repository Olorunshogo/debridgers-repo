import { motion, AnimatePresence } from "framer-motion";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { AuthField, type AuthFieldDescriptor } from "./auth-field";
import { SubmitButton } from "../submit-button";
import {
  swappedContentVariants,
  swappedContentTransition,
} from "../../lib/motion/variants";

/*
 * Role-agnostic signup form.
 *
 * Knows nothing about buyers, agents, or farmers. It renders whatever roles it
 * is handed as tabs, and whatever fields the active role declares. A consumer
 * with three roles, or with roles this package has never heard of, passes a
 * different `roles` array and nothing here changes.
 *
 * Returns the form only - no page chrome, no routing, no submission logic. Wrap
 * it in AuthFormShell (or anything else) in the consuming app.
 */

export interface AuthSignupRoleTab {
  /** Stable key used for selection, typically the role name. */
  value: string;
  label: string;
  fields: readonly AuthFieldDescriptor[];
  /*
   * A role that exists but is not open yet. Rendered muted and unselectable
   * rather than hidden, so the role is still advertised and reopening it is one
   * flag rather than restoring deleted markup.
   */
  disabled?: boolean;
  /** Why the tab is disabled, shown beneath the row. */
  disabledNote?: string;
}

export interface AuthSignupFormProps<T extends FieldValues> {
  roles: readonly AuthSignupRoleTab[];
  activeRole: string;
  onRoleChange: (role: string) => void;
  form: UseFormReturn<T>;
  onSubmit: (event?: React.BaseSyntheticEvent) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

export function AuthSignupForm<T extends FieldValues>({
  roles,
  activeRole,
  onRoleChange,
  form,
  onSubmit,
  isSubmitting,
  submitLabel = "Create account",
  submittingLabel = "Creating account...",
}: AuthSignupFormProps<T>) {
  /*
   * A disabled tab can never be the active one, however the caller was
   * initialised, so a role closed after someone opened the page does not leave
   * them filling in a form that will be refused.
   */
  const selectable = roles.filter((role) => !role.disabled);
  const requested = roles.find((role) => role.value === activeRole);
  const active =
    requested && !requested.disabled ? requested : (selectable[0] ?? roles[0]);
  const disabledNote = roles.find(
    (role) => role.disabled && role.disabledNote,
  )?.disabledNote;
  const { register, control, formState } = form;

  return (
    <div className="flex flex-col gap-6">
      {/* Role tabs - only rendered when there is a real choice to make */}
      {roles.length > 1 && (
        <div
          role="tablist"
          aria-label="Account type"
          className="flex gap-2 overflow-x-auto"
        >
          {roles.map((role) => {
            const isActive = role.value === active.value;
            const isDisabled = Boolean(role.disabled);
            return (
              <button
                key={role.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={isDisabled || undefined}
                disabled={isDisabled}
                title={isDisabled ? role.disabledNote : undefined}
                onClick={() => {
                  if (isDisabled) return;
                  onRoleChange(role.value);
                }}
                /*
                 * Active tab gets cursor-default: clicking the already-active
                 * option does nothing, so its cursor should not imply it does.
                 */
                className={`font-syne rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isDisabled
                    ? "text-body/50 cursor-not-allowed bg-gray-100"
                    : isActive
                      ? "bg-primary cursor-default text-white"
                      : "text-body cursor-pointer bg-gray-100"
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>
      )}

      {disabledNote && (
        <p className="text-body -mt-4 text-xs">{disabledNote}</p>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.value}
            variants={swappedContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={swappedContentTransition}
            className="flex flex-col gap-5"
          >
            {active.fields.map((field) => (
              <AuthField<T>
                key={field.name}
                field={field}
                register={register}
                errors={formState.errors}
                control={control}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        <SubmitButton
          variant="block"
          loading={isSubmitting}
          loadingText={submittingLabel}
          /*
           * mode: "onChange" on the form (see use-signup.ts) keeps isValid
           * accurate from the first keystroke, not just after a submit
           * attempt - so this can gate the button from the start rather than
           * only preventing a resubmit once something is already wrong.
           */
          disabled={!formState.isValid}
          className="mt-4 rounded-full"
        >
          {submitLabel}
        </SubmitButton>
      </form>
    </div>
  );
}
