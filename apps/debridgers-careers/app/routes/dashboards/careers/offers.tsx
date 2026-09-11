import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { PrimaryButton } from "@debridgers/ui-web";
import {
  acceptOffer,
  listMyOffers,
  rejectOffer,
  type HrApplication,
  type HrJob,
  type HrOffer,
} from "@debridgers/api-client";

export default function OffersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<
    { offer: HrOffer; application: HrApplication; job: HrJob }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    listMyOffers()
      .then(setRows)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  async function onAccept(offerId: number) {
    setBusyId(offerId);
    setError(null);
    setMessage(null);
    try {
      await acceptOffer(offerId);
      setMessage("Offer accepted. Your contract will appear on Contracts.");
      navigate("/careers-dashboard/contracts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(offerId: number) {
    setBusyId(offerId);
    setError(null);
    setMessage(null);
    try {
      await rejectOffer(offerId);
      setMessage("Offer rejected.");
      const next = await listMyOffers();
      setRows(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-open-sans text-body text-sm">
        Offers emailed by HR appear here. Accepting flips your account to
        employee and opens your contract slot.
      </p>
      {error && (
        <p className="font-open-sans text-error-red text-sm">{error}</p>
      )}
      {message && (
        <p className="font-open-sans text-primary text-sm">{message}</p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map(({ offer, job }) => (
          <li
            key={offer.id}
            className="border-line rounded-2xl border bg-white p-5"
          >
            <p className="font-syne text-heading font-semibold">
              {offer.position}
            </p>
            <p className="font-open-sans text-body text-xs">
              Job: {job.title} · status: {offer.status} · starts{" "}
              {String(offer.start_date).slice(0, 10)} · expires{" "}
              {String(offer.expires_at).slice(0, 10)}
            </p>
            {offer.status === "sent" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <PrimaryButton
                  type="button"
                  disabled={busyId === offer.id}
                  className="w-auto rounded-full px-4 py-2 text-sm"
                  onClick={() => onAccept(offer.id)}
                >
                  Accept offer
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  disabled={busyId === offer.id}
                  className="w-auto rounded-full bg-red-700 px-4 py-2 text-sm"
                  onClick={() => onReject(offer.id)}
                >
                  Reject
                </PrimaryButton>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && !error && (
          <li className="font-open-sans text-body text-sm">
            No offers yet. Watch your email after interviews.
          </li>
        )}
      </ul>
    </div>
  );
}
