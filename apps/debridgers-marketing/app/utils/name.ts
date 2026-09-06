export function splitFullName(fullName: string): {
  first_name: string;
  last_name: string;
} {
  const idx = fullName.indexOf(" ");
  if (idx === -1) return { first_name: fullName, last_name: "" };
  return {
    first_name: fullName.slice(0, idx),
    last_name: fullName.slice(idx + 1),
  };
}
