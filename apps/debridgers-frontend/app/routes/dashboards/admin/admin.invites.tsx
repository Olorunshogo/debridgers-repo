import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch, apiMutate, ApiError } from "@debridgers/api-client";
import { Copy, Check, Plus, MailPlus } from "lucide-react";
import {
  AlertBanner,
  DataTable,
  DashEmailInput,
  DashSubmitButton,
  TableTextCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  type AlertTone,
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
  created_at: string;
}

export function meta() {
  return [
    { title: "Admin Invitations | Debridgers" },
    {
      name: "description",
      content: "Manage admin invitations and invite new admins",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type InviteState = "used" | "expired" | "pending";

const INVITE_STATE_TONE: Record<InviteState, StatusTone> = {
  used: "success",
  expired: "danger",
  pending: "info",
};

const INVITE_STATE_LABEL: Record<InviteState, string> = {
  used: "Used",
  expired: "Expired",
  pending: "Pending",
};

function inviteState(invite: AdminInvite): InviteState {
  if (invite.used_at !== null) return "used";
  if (new Date(invite.expires_at) < new Date()) return "expired";
  return "pending";
}

export default function AdminInvites() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  /* Carries its own tone: the same slot reports both a sent invite and a
     failed one, and they must not look alike. */
  const [message, setMessage] = useState<InviteMessage | null>(null);
  /* The list's own failure, kept apart from the invite form's message so a
     failed load cannot read as "no invitations yet". */
  const [loadError, setLoadError] = useState<string | null>(null);
  /* Which invite code was just copied, so that row can confirm it. Declared
     here because copyToClipboard set it without it ever existing. */
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

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    try {
      await apiMutate("/admin/invites", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage({ tone: "success", text: `Invitation sent to ${email}.` });
      setEmail("");
      await loadInvites();
    } catch (err) {
      setMessage({
        tone: "danger",
        text: err instanceof Error ? err.message : "Failed to send invitation.",
      });
    } finally {
      setSending(false);
    }
  }

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
          <DashEmailInput
            label="Email address"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <DashSubmitButton
            icon={Plus}
            loading={sending}
            loadingText="Sending..."
          >
            Send Invite
          </DashSubmitButton>
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
