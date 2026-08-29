import { z } from "zod";
import {
  createEmailSchema,
  createNameSchema,
  createPasswordSchema,
  createConfirmPasswordSchema,
  createPhoneSchema,
  passwordsMatch,
  PASSWORDS_MATCH_ERROR,
} from "../generics";

/*
 * The base signup shape, identical for every role.
 *
 * Role-specific fields are deliberately absent. An agent's area/address and
 * anything a farmer will need are collected later, in KYC or that role's
 * profile settings page, so that one register endpoint serves every role and
 * adding a role needs no new signup form. Extend this with .extend() from a
 * role config rather than declaring a second signup schema.
 */
export const baseSignupFields = {
  fullName: createNameSchema(),
  email: createEmailSchema(),
  phone: createPhoneSchema(),
  password: createPasswordSchema(),
  confirmPassword: createConfirmPasswordSchema(),
};

export const baseSignupObject = z.object(baseSignupFields);

export const signupSchema = baseSignupObject.refine(
  passwordsMatch,
  PASSWORDS_MATCH_ERROR,
);

export type SignupValues = z.infer<typeof baseSignupObject>;

/**
 * Builds a role's signup schema from the base fields plus that role's extras.
 * Pass an empty object for roles that need nothing beyond the base.
 */
export function createRoleSignupSchema<T extends z.ZodRawShape>(extension: T) {
  return baseSignupObject
    .extend(extension)
    .refine(passwordsMatch, PASSWORDS_MATCH_ERROR);
}

// === Optional fields a role config may add

/** Buyers may arrive through an agent's referral link. */
export const referralCodeField = z.string().trim().optional();

/** Local government area, for roles that operate in a named area. */
export const lgaField = z.string().trim().min(1, "Select your LGA");

/** Home or business address, matching the API's own minimum. */
export const addressField = z
  .string()
  .trim()
  .min(5, "Enter your address, at least 5 characters");

/*
 * A CV, optional. Constrained here as well as on the server because a rejected
 * 5MB upload is a wasted round trip on a phone connection.
 */
export const MAX_CV_BYTES = 5 * 1024 * 1024;

export const cvField = z
  .instanceof(File, { message: "Attach a file" })
  .refine((file) => file.size <= MAX_CV_BYTES, "CV must be 5MB or smaller")
  .optional();
