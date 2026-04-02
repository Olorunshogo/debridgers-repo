import "dotenv/config";

export default async function globalSetup() {
  // Ensure test env is set
  process.env.NODE_ENV = "test";
}
