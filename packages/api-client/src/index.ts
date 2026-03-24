const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4000';

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}
