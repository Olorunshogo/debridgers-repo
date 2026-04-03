const BASE = process.env.API_URL || "http://localhost:4000/api/v1";

describe("Contact", () => {
  it("POST /contact should save lead and return 201", async () => {
    const res = await fetch(`${BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Test User",
        email: `test+${Date.now()}@example.com`,
        message: "This is a test message from e2e",
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.statusCode).toBe(201);
    expect(data.data.id).toBeDefined();
  });

  it("POST /contact with invalid email should return 400", async () => {
    const res = await fetch(`${BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Bad",
        email: "notanemail",
        message: "hi",
      }),
    });
    expect(res.status).toBe(400);
  });
});

export {};
