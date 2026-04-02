const BASE = process.env.API_URL || "http://localhost:4000/api/v1";

let accessToken: string;
const testEmail = `agent+${Date.now()}@test.com`;

describe("Auth", () => {
  it("POST /auth/register should create a new agent", async () => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: "Test",
        last_name: "Agent",
        email: testEmail,
        password: "Password@123",
        role: "agent",
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.data.user.email).toBe(testEmail);
    expect(data.data.accessToken).toBeDefined();
  });

  it("POST /auth/login should return tokens", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "Password@123" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.accessToken).toBeDefined();
    accessToken = data.data.accessToken;
  });

  it("POST /auth/login with wrong password should return 401", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
  });
});

export { accessToken };
