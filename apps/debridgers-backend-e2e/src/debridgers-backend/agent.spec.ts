const BASE = process.env.API_URL || "http://localhost:4000/api/v1";

describe("Agent", () => {
  it("POST /agent/apply should submit application", async () => {
    const formData = new FormData();
    formData.append("first_name", "Jane");
    formData.append("last_name", "Doe");
    formData.append("email", `agent+${Date.now()}@test.com`);
    formData.append("phone", "08012345678");
    formData.append("address", "12 Barnawa Market Road, Kaduna");

    const res = await fetch(`${BASE}/agent/apply`, {
      method: "POST",
      body: formData,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.data.id).toBeDefined();
  });
});

export {};
