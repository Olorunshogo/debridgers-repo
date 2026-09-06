// === Role configuration (app policy - which roles exist and what they collect)
export * from "./config/roles";

/* Hooks now live in @debridgers/ui-web so any app can use them. Re-exported here
   so app code keeps one import path and does not need to know where they moved. */
export {
  useLogin,
  useSignup,
  useForgotPassword,
  useResetPassword,
  useEmailVerification,
  type LoginVariant,
} from "@debridgers/ui-web";
