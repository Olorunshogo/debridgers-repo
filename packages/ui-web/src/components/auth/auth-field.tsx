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

export type AuthFieldType =
  | "text"
  | "email"
  | "tel"
  | "password"
  | "select"
  | "file";

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
  /** Accept attribute for `type: "file"`, ignored otherwise. */
  accept?: string;
  /** Help text under the control, for anything the label cannot carry. */
  hint?: string;
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

  /*
   * A file input cannot be controlled by value, so it registers its onChange
   * and hands the form the File itself rather than a FileList. Everything
   * downstream then sees one shape whether the field came from a text box or a
   * file picker.
   */
  if (field.type === "file") {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: controlled }) => (
          <div className="flex flex-col gap-1">
            <label className="text-heading text-sm font-medium">
              {field.label}
              {!required && (
                <span className="text-body font-normal"> (optional)</span>
              )}
            </label>
            <input
              type="file"
              accept={field.accept}
              onChange={(event) =>
                controlled.onChange(event.target.files?.[0] ?? undefined)
              }
              className="border-line text-body file:bg-line file:text-heading w-full rounded-xl border px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-sm"
            />
            {field.hint && <p className="text-body text-xs">{field.hint}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
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
