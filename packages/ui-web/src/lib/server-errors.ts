import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

interface ServerFieldError {
  field: string;
  message: string;
}

function toCamelCase(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_match, char: string) =>
    char.toUpperCase(),
  );
}

/*
 * Reads the backend's ZodValidationPipe `{ message, errors: [{ field, message }] }` shape off a caught error and camelCases each field name, so both react-hook-form and plain useState forms can key their own field-error state the same way.
 * Read structurally rather than importing ApiError, to keep the transport layer out of this UI package.
 */
export function extractServerFieldErrors(
  error: unknown,
): Record<string, string> {
  const body = (error as { body?: { errors?: ServerFieldError[] } } | null)
    ?.body;
  const errors = body?.errors;
  if (!Array.isArray(errors)) return {};

  const result: Record<string, string> = {};
  for (const { field, message } of errors) {
    result[toCamelCase(field)] = message;
  }
  return result;
}

/*
 * Maps those same field errors onto a react-hook-form instance, so a 400 shows up under the right input instead of only as a top banner.
 * A backend field with no corresponding form input (a hidden config value, say) is silently skipped, and the top banner still carries its message.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>,
): boolean {
  const fieldErrors = extractServerFieldErrors(error);
  const knownFields = new Set(Object.keys(form.getValues() as object));
  let applied = false;

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (knownFields.has(field)) {
      form.setError(field as Path<T>, { type: "server", message });
      applied = true;
    }
  }

  return applied;
}
