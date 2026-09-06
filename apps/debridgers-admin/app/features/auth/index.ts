/* Hooks live in @debridgers/ui-web so any app can use them. Re-exported here
   so app code keeps one import path and does not need to know where they moved.
   This app has no self-signup or email-verification flow (admins are
   invite-only), so useSignup/useEmailVerification are not re-exported here. */
export {
  useLogin,
  useForgotPassword,
  useResetPassword,
  type LoginVariant,
} from "@debridgers/ui-web";
