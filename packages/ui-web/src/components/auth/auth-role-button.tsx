import type { LucideIcon } from "lucide-react";

/*
 * A role choice on a picker screen (marketing's login/signup) - not a plain
 * bordered box. Icon in a soft brand badge, label, description, and a hover
 * lift, so choosing an account type feels like a real decision rather than a
 * form field.
 */

export interface AuthRoleButtonProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
}

export function AuthRoleButton({
  icon: Icon,
  label,
  description,
  onClick,
}: AuthRoleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg"
    >
      <div className="bg-primary/10 text-primary group-hover:bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:text-white">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-syne text-heading text-lg font-semibold">
          {label}
        </span>
        <p className="text-body text-sm">{description}</p>
      </div>
    </button>
  );
}
