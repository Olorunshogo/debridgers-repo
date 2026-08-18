export default async function globalTeardown(): Promise<void> {
  const server = global.__BACKEND_PROCESS__;
  if (server) {
    server.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      server.on("exit", () => resolve());
      setTimeout(resolve, 3000); // force-resolve after 3s
    });
    console.log("\n✓ Backend process stopped after e2e tests\n");
  }
}
