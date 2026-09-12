import type {
  WithdrawalStatus,
  CommissionStatus,
} from "@debridgers/domain-status";

export interface ApiWallet {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
}

export interface ApiCommission {
  id: number;
  type: string;
  amount_kobo: number;
  status: CommissionStatus;
  created_at: string;
}

export interface CommissionRow {
  id: string;
  description: string;
  amount: number;
  status: CommissionStatus;
  date: string;
  isPaid: boolean;
}

const COMMISSION_TYPE_LABEL: Record<string, string> = {
  direct: "Sales report commission",
  buyer_referral: "Buyer referral commission",
  agent_override: "Recruit override commission",
  state_manager_override: "State manager override commission",
};

export function mapCommission(c: ApiCommission): CommissionRow {
  return {
    id: String(c.id),
    description: COMMISSION_TYPE_LABEL[c.type] ?? c.type,
    amount: c.amount_kobo,
    status: c.status,
    date: c.created_at,
    isPaid: c.status === "paid",
  };
}

export interface ApiWithdrawal {
  id: number;
  amount: number;
  status: WithdrawalStatus;
  rejection_reason: string | null;
  error_message: string | null;
  payout_reference: string | null;
  created_at: string;
}

export interface WithdrawalRow {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  errorMessage: string | null;
  reference: string | null;
  date: string;
}

export function mapWithdrawal(w: ApiWithdrawal): WithdrawalRow {
  return {
    id: String(w.id),
    amount: w.amount,
    status: w.status,
    rejectionReason: w.rejection_reason,
    errorMessage: w.error_message,
    reference: w.payout_reference,
    date: w.created_at,
  };
}
