import { useState, useEffect } from "react";
import { apiFetch, apiMutate } from "@debridgers/api-client";
import { Copy, Plus } from "lucide-react";

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

export default function AdminInvites() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    try {
      const data = await apiFetch<AdminInvite[]>("/admin/invites");
      setInvites(data);
    } catch (_error) {
      setMessage("Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    try {
      await apiMutate("/admin/invites", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(`Invitation sent to ${email}`);
      setEmail("");
      await loadInvites();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send invitation";
      setMessage(errorMessage);
    } finally {
      setSending(false);
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  function isUsed(usedAt: string | null) {
    return usedAt !== null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-gray-border rounded-2xl border bg-white p-6">
        <h2 className="font-syne text-heading mb-4 text-xl font-semibold">
          Invite New Admin
        </h2>
        <form onSubmit={handleSendInvite} className="flex gap-3">
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-gray-border flex-1 rounded-lg border px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="bg-primary hover:bg-primary-dark rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus className="mr-1 inline" size={16} />
            Send Invite
          </button>
        </form>
        {message && <p className="text-primary mt-2 text-sm">{message}</p>}
      </div>

      <div className="border-gray-border rounded-2xl border bg-white">
        <div className="border-gray-border border-b px-6 py-4">
          <h2 className="font-syne text-heading text-lg font-semibold">
            Active Invitations
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Loading invitations...
          </div>
        ) : invites.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No invitations yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-gray-border border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Invite Code
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr
                    key={invite.id}
                    className="border-gray-border border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">{invite.email}</td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {invite.invite_code}
                    </td>
                    <td className="px-6 py-4">
                      {isUsed(invite.used_at) ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Used
                        </span>
                      ) : isExpired(invite.expires_at) ? (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          Expired
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(invite.expires_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(invite.invite_code)}
                          className="text-primary hover:text-primary-dark"
                          title="Copy code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
