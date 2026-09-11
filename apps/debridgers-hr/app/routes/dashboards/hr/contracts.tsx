import { useEffect, useState } from "react";
import {
  getMyEmployeeProfile,
  listMySignRequests,
  type HrEmployeeProfile,
  type HrSignRequest,
} from "@debridgers/api-client";

export default function ContractsPage() {
  const [employee, setEmployee] = useState<HrEmployeeProfile | null>(null);
  const [signs, setSigns] = useState<HrSignRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMyEmployeeProfile().catch(() => null),
      listMySignRequests().catch(() => [] as HrSignRequest[]),
    ])
      .then(([row, signRows]) => {
        setEmployee(row?.employee ?? null);
        setSigns(
          signRows.filter((s) => s.kind === "contract" || s.kind === "offer"),
        );
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <p className="font-open-sans text-body text-sm">
        After you accept an offer, your employment contract lands here. HR may
        attach a file or a Jotform Sign link.
      </p>

      {error && (
        <p className="font-open-sans text-error-red text-sm">{error}</p>
      )}

      <div className="border-line rounded-2xl border bg-white p-5">
        <h2 className="font-syne text-heading font-semibold">Employment</h2>
        {employee ? (
          <div className="font-open-sans text-body mt-2 text-sm">
            <p>
              {employee.job_title} · {employee.department} · {employee.status}
            </p>
            {employee.contract_url ? (
              <a
                href={employee.contract_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary mt-3 inline-block font-semibold"
              >
                Open contract document →
              </a>
            ) : (
              <p className="mt-2 text-xs">
                No signed contract file on your record yet.
              </p>
            )}
          </div>
        ) : (
          <p className="font-open-sans text-body mt-2 text-sm">
            Accept an offer first to create your employee record.
          </p>
        )}
      </div>

      <div className="border-line rounded-2xl border bg-white p-5">
        <h2 className="font-syne text-heading font-semibold">Sign requests</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {signs.map((s) => (
            <li key={s.id} className="font-open-sans text-body text-sm">
              {s.title} · {s.status}
              {s.sign_url && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={s.sign_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold"
                  >
                    Open signing link
                  </a>
                </>
              )}
              {s.signed_document_url && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={s.signed_document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold"
                  >
                    Signed file
                  </a>
                </>
              )}
            </li>
          ))}
          {signs.length === 0 && (
            <li className="font-open-sans text-body text-sm">
              No contract sign requests yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
