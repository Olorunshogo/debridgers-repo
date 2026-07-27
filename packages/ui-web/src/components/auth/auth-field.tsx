import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { DashTextInput } from "../dash-text-input";
import { DashEmailInput } from "../dash-email-input";
import { DashPasswordInput } from "../dash-password-input";
import { DashSelect } from "../dash-select";

/*
 * Descriptor-driven field rendering.
 *
 * A consumer describes the fields it wants as data and this renders them. That
 * is what makes an auth form reusable across any set of roles: an app with
 * three roles, or roles this package has never heard of, supplies its own
 * descriptor list and needs no change here.
 *
 * The descriptor deliberately carries no role concept. Which fields a role
 * needs is app policy and belongs in the consuming app's role config.
 */

// === Types

export type AuthFieldType = "text" | "email" | "tel" | "password" | "select";

export interface AuthFieldDescriptor {
  /** Must match a key in the form's values type. */
  name: string;
  label: string;
  type: AuthFieldType;
  placeholder?: string;
  /** Options for `type: "select"`, ignored otherwise. */
  options?: readonly string[];
  optional?: boolean;
  autoComplete?: string;
}

export interface AuthFieldProps<T extends FieldValues> {
  field: AuthFieldDescriptor;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  control: Control<T>;
}

// === Renderer

export function AuthField<T extends FieldValues>({
  field,
  register,
  errors,
  control,
}: AuthFieldProps<T>) {
  const name = field.name as Path<T>;
  const error = errors[field.name]?.message as string | undefined;
  const required = !field.optional;

  /*
   * DashSelect is a custom controlled component with an
   * `onChange(value: string)` signature, so it needs Controller. Plain inputs
   * use register() - same split as the rest of the codebase.
   */
  if (field.type === "select") {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: controlled }) => (
          <DashSelect
            label={field.label}
            placeholder={field.placeholder}
            options={(field.options ?? []).map((option) => ({
              value: option,
              label: option,
            }))}
            value={(controlled.value as string) ?? ""}
            onChange={controlled.onChange}
            error={error}
            required={required}
          />
        )}
      />
    );
  }

  const shared = {
    label: field.label,
    placeholder: field.placeholder,
    error,
    required,
    autoComplete: field.autoComplete,
  };

  if (field.type === "email") {
    return <DashEmailInput {...shared} {...register(name)} />;
  }

  if (field.type === "password") {
    return <DashPasswordInput {...shared} {...register(name)} />;
  }

  return (
    <DashTextInput
      {...shared}
      type={field.type === "tel" ? "tel" : "text"}
      {...register(name)}
    />
  );
}
