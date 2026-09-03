import { apiFetch, JSON_HEADERS, authHeaders } from "./api-client";
import { postWebhook, readPaystackSecret } from "./paystack-webhook";
import { seedPendingDeposit } from "./wallet-seed";
import { TERMS_CONSENT } from "./terms-consent";

// === Types

interface RegisterResponse {
  data?: { accessToken?: string };
}

interface LoginResponse {
  data?: { accessToken?: string };
}

interface ZoneListResponse {
  data?: { id: number; delivery_fee: number }[];
}

interface ProductListResponse {
  data?: { id: number; price_kobo: number }[];
}

interface BuyerFixture {
  email: string;
  token: string;
}

// === Buyers

/*
 * NODE_ENV=test auto-verifies email on registration, so a single register +
 * login round trip is enough to get a usable buyer token.
 */
export async function registerBuyer(
  base: string,
  emailPrefix: string,
): Promise<BuyerFixture> {
  const email = `${emailPrefix}+${Date.now()}+${Math.floor(Math.random() * 1e6)}@test.com`;
  const password = "Password@123";

  const regRes = await apiFetch<RegisterResponse>(`${base}/auth/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      first_name: "E2E",
      last_name: "Buyer",
      email,
      password,
      ...TERMS_CONSENT,
    }),
  });

  if (regRes.status !== 201) {
    throw new Error(`registerBuyer failed: ${JSON.stringify(regRes.body)}`);
  }

  const loginRes = await apiFetch<LoginResponse>(`${base}/auth/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });

  const token = loginRes.body.data?.accessToken;
  if (!token) {
    throw new Error(
      `registerBuyer login failed: ${JSON.stringify(loginRes.body)}`,
    );
  }

  return { email, token };
}

export async function loginAdmin(
  base: string,
  adminEmail: string,
  adminPassword: string,
): Promise<string> {
  const res = await apiFetch<LoginResponse>(`${base}/auth/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  const token = res.body.data?.accessToken;
  if (!token) {
    throw new Error(`loginAdmin failed: ${JSON.stringify(res.body)}`);
  }

  return token;
}

// === Catalogue

/* A freshly registered buyer has no zone_id, so checkout needs one from here. */
export async function getFirstZoneId(base: string): Promise<number> {
  const res = await apiFetch<ZoneListResponse>(`${base}/zones`);
  const zoneId = res.body.data?.[0]?.id;
  if (!zoneId) throw new Error("No zones seeded");
  return zoneId;
}

export async function getCheapestProductId(base: string): Promise<number> {
  const res = await apiFetch<ProductListResponse>(`${base}/products`);
  const products = res.body.data ?? [];
  if (products.length === 0) throw new Error("No products seeded");
  const cheapest = products.reduce((min, p) =>
    p.price_kobo < min.price_kobo ? p : min,
  );
  return cheapest.id;
}

// === Wallet funding

/*
 * Funds a buyer's wallet without a real card charge and without an outbound
 * Paystack call: seeds a pending deposit row, then forges a correctly signed
 * charge.success webhook for that reference. The webhook trusts its own event
 * data and does not call back to Paystack, so this drives the genuine
 * confirmTransaction crediting path end to end.
 */
export async function fundWalletViaWebhook(
  base: string,
  buyerToken: string,
  buyerEmail: string,
  amountKobo: number,
): Promise<string> {
  // Reading the wallet is what creates it for a buyer who has never had one.
  const walletRes = await apiFetch(`${base}/buyer/wallet`, {
    headers: authHeaders(buyerToken),
  });
  if (walletRes.status !== 200) {
    throw new Error(
      `fundWalletViaWebhook wallet read failed: ${JSON.stringify(walletRes.body)}`,
    );
  }

  const reference = await seedPendingDeposit(buyerEmail, amountKobo);

  const secret = readPaystackSecret();
  const webhookRes = await postWebhook(base, secret, {
    event: "charge.success",
    data: {
      reference,
      amount: amountKobo,
      customer: { email: buyerEmail, first_name: "E2E" },
    },
  });

  if (webhookRes.status !== 200) {
    throw new Error(
      `fundWalletViaWebhook webhook failed: ${JSON.stringify(webhookRes.body)}`,
    );
  }

  return reference;
}
