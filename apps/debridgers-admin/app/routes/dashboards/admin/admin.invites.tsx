import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch, apiMutate, ApiError } from "@debridgers/api-client";
import { Copy, Check, Plus, MailPlus, Ban } from "lucide-react";
import {
  AlertBanner,
  DataTable,
  EmailInputField,
  SelectField,
  SubmitButton,
  TableTextCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  useDialog,
  createAdminInviteSchema,
  type CreateAdminInviteValues,
  type AlertTone,
  type RowAction,
  type StatusTone,
  type TableColumn,
} from "@debridgers/ui-web";
import { AnimatePresence } from "framer-motion";

interface InviteMessage {
  tone: AlertTone;
  text: string;
}

interface AdminInvite {
  id: number;
  email: string;
  invite_code: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Admin Invitations | Debridgers",
    description: "Manage admin invitations and invite new admins",
    path: "/admin/invites",
    noIndex: true,
  });
}

type InviteState = "used" | "revoked" | "expired" | "pending";

const INVITE_STATE_TONE: Record<InviteState, StatusTone> = {
  used: "success",
  revoked: "danger",
  expired: "danger",
  pending: "info",
};

const INVITE_STATE_LABEL: Record<InviteState, string> = {
  used: "Used",
  revoked: "Revoked",
  expired: "Expired",
  pending: "Pending",
};

function inviteState(invite: AdminInvite): InviteState {
  if (invite.revoked_at !== null) return "revoked";
  if (invite.used_at !== null) return "used";
  if (new Date(invite.expires_at) < new Date()) return "expired";
  return "pending";
}

export default function AdminInvites() {
  const { triggerDialog } = useDialog();
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const {
    register,
    control,
    handleSubmit: handleFormSubmit,
    reset: resetForm,
    formState: { isSubmitting: sending },
  } = useForm<CreateAdminInviteValues>({
    resolver: zodResolver(createAdminInviteSchema),
    mode: "onChange",
    defaultValues: { email: "", desk: "buyer" },
  });
  const [revokingId, setRevokingId] = useState<number | null>(null);
  /* Carries its own tone: the same slot reports both a sent invite and a failed one, and they must not look alike. */
  const [message, setMessage] = useState<InviteMessage | null>(null);
  /* The list's own failure, kept apart from the invite form's message so a failed load cannot read as "no invitations yet". */
  const [loadError, setLoadError] = useState<string | null>(null);
  /* Which invite code was just copied, so that row can confirm it. Declared here because copyToClipboard set it without it ever existing. */
  const [copied, setCopied] = useState<string | null>(null);

  const loadInvites = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await apiFetch<AdminInvite[]>("/admin/invites");
      setInvites(data);
      setLoadError(null);
    } catch (error) {
      setInvites([]);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Could not load invitations. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const handleSendInvite = handleFormSubmit(async (values) => {
    try {
      await apiMutate("/admin/invites", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setMessage({
        tone: "success",
        text: `Invitation sent to ${values.email} (${values.desk} desk).`,
      });
      resetForm();
      await loadInvites();
    } catch (err) {
      setMessage({
        tone: "danger",
        text: err instanceof Error ? err.message : "Failed to send invitation.",
      });
    }
  });

  const handleRevoke = useCallback(
    async (id: number): Promise<void> => {
      setRevokingId(id);
      try {
        await apiMutate(`/admin/invites/${id}/revoke`, { method: "PATCH" });
        await loadInvites();
      } catch (error) {
        /* Throws so the confirm dialog reports it and stays open, instead of closing over an invite that was never revoked. */
        throw new Error(
          error instanceof ApiError
            ? error.message
            : "Could not revoke that invite. Please try again.",
        );
      } finally {
        setRevokingId(null);
      }
    },
    [loadInvites],
  );

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const columns = useMemo<TableColumn<AdminInvite>[]>(
    () => [
      {
        id: "email",
        header: "Email",
        priority: "primary",
        minWidth: "14rem",
        sortable: true,
        sortValue: (invite) => invite.email,
        searchValue: (invite) => `${invite.email} ${invite.invite_code}`,
        cell: (invite) => (
          <span className="text-heading font-medium">{invite.email}</span>
        ),
      },
      {
        id: "invite_code",
        header: "Invite Code",
        priority: "secondary",
        cell: (invite) => (
          <span className="flex items-center gap-2">
            <TableTextCell
              value={invite.invite_code}
              className="font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(invite.invite_code)}
              title="Copy code"
              aria-label={
                copied === invite.invite_code
                  ? "Invite code copied"
                  : "Copy invite code"
              }
              className="text-primary cursor-pointer rounded p-1 transition-all duration-300 ease-in-out hover:bg-black/5"
            >
              {copied === invite.invite_code ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        priority: "trailing",
        sortable: true,
        sortValue: (invite) => inviteState(invite),
        cell: (invite) => {
          const state = inviteState(invite);
          return (
            <TableStatusBadge
              label={INVITE_STATE_LABEL[state]}
              tone={INVITE_STATE_TONE[state]}
            />
          );
        },
      },
      {
        id: "expires_at",
        header: "Expires",
        priority: "detail",
        sortable: true,
        sortValue: (invite) => invite.expires_at,
        cell: (invite) => <TableDateCell value={invite.expires_at} withTime />,
      },
    ],
    [copied],
  );

  const rowActions = useMemo<RowAction<AdminInvite>[]>(
    () => [
      {
        id: "revoke",
        label: "Revoke",
        icon: Ban,
        tone: "danger",
        hidden: (invite) => inviteState(invite) !== "pending",
        isBusy: (invite) => revokingId === invite.id,
        onSelect: (invite) => handleRevoke(invite.id),
        confirm: {
          dialogKey: "CONFIRM",
          props: (invite) => ({
            title: `Revoke the invite for ${invite.email}?`,
            description:
              "The invite code stops working immediately. This cannot be undone.",
            confirmLabel: "Revoke invite",
            tone: "danger",
          }),
        },
      },
    ],
    [revokingId, handleRevoke],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="border-line rounded-2xl border bg-white p-6">
        <h2 className="font-syne text-heading mb-4 text-xl font-semibold">
          Invite New Admin
        </h2>
        <form
          onSubmit={handleSendInvite}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <EmailInputField
            label="Email address"
            placeholder="admin@example.com"
            className="flex-1"
            required
            {...register("email")}
          />
          <Controller
            control={control}
            name="desk"
            render={({ field }) => (
              <SelectField
                label="Desk"
                required
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "buyer", label: "Buyer desk" },
                  { value: "agent", label: "Agent desk" },
                  { value: "hr", label: "HR desk" },
                ]}
              />
            )}
          />
          <SubmitButton icon={Plus} loading={sending} loadingText="Sending...">
            Send Invite
          </SubmitButton>
        </form>

        <AnimatePresence>
          {message && (
            <AlertBanner
              tone={message.tone}
              title={message.text}
              onDismiss={() => setMessage(null)}
              className="mt-4"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-syne text-heading text-lg font-semibold">
          Active Invitations
        </h2>

        <DataTable
          rows={invites}
          columns={columns}
          actions={rowActions}
          caption="Admin invitations"
          showSearch
          searchPlaceholder="Search by email or invite code"
          loading={loading}
          error={loadError}
          onRetry={() => void loadInvites()}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <TableEmptyState
              icon={MailPlus}
              title="No invitations yet"
              description="Invitations you send will appear here."
            />
          }
        />
      </div>
    </div>
  );
}
