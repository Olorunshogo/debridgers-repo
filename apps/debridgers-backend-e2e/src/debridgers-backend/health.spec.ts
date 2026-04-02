const BASE_URL = process.env.API_URL || "http://localhost:4000/api/v1";

describe("Health Check", () => {
  it("GET /health should return 200 with status ok", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.status).toBe("ok");
  });
});

export {};
