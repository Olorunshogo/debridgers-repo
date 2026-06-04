// === Models
import type { Object } from "@/types/modelTypes";

// ─── LGAs ─────────────────────────────────────────────────────────────────────

export const kadunaLgas: Object[] = [
  { value: "chikun", label: "Chikun" },
  { value: "kaduna-north", label: "Kaduna North" },
  { value: "kaduna-south", label: "Kaduna South" },
  { value: "igabi", label: "Igabi" },
  { value: "giwa", label: "Giwa" },
  { value: "zaria", label: "Zaria" },
  { value: "birnin-gwari", label: "Birnin Gwari" },
  { value: "ikara", label: "Ikara" },
  { value: "jaba", label: "Jaba" },
  { value: "jema-a", label: "Jema'a" },
  { value: "kachia", label: "Kachia" },
  { value: "kagarko", label: "Kagarko" },
  { value: "kajuru", label: "Kajuru" },
  { value: "kaura", label: "Kaura" },
  { value: "kauru", label: "Kauru" },
  { value: "kubau", label: "Kubau" },
  { value: "kudan", label: "Kudan" },
  { value: "lere", label: "Lere" },
  { value: "makarfi", label: "Makarfi" },
  { value: "sabon-gari", label: "Sabon Gari" },
  { value: "sanga", label: "Sanga" },
  { value: "soba", label: "Soba" },
  { value: "zangon-kataf", label: "Zangon Kataf" },
];

// ─── Areas by LGA ─────────────────────────────────────────────────────────────

export const kadunaAreasByLga: Record<string, Object[]> = {
  chikun: [
    { value: "kakuri", label: "Kakuri" },
    { value: "barnawa", label: "Barnawa" },
    { value: "narayi", label: "Narayi" },
    { value: "sabon-tasha", label: "Sabon Tasha" },
    { value: "sabo", label: "Sabo" },
    { value: "kamazou", label: "Kamazou" },
    { value: "television", label: "Television" },
    { value: "gonin-gora", label: "Gonin Gora" },
    { value: "kigo", label: "Kigo" },
    { value: "unguwan-dosa", label: "Unguwan Dosa" },
  ],
  "kaduna-north": [
    { value: "rigasa", label: "Rigasa" },
    { value: "badiko", label: "Badiko" },
    { value: "kabala", label: "Kabala" },
    { value: "unguwan-sarki", label: "Unguwan Sarki" },
    { value: "unguwan-rimi", label: "Unguwan Rimi" },
    { value: "sabo-north", label: "Sabo" },
    { value: "kawo", label: "Kawo" },
  ],
  "kaduna-south": [
    { value: "tudun-wada", label: "Tudun Wada" },
    { value: "katuru", label: "Katuru" },
    { value: "mando", label: "Mando" },
    { value: "makera", label: "Makera" },
    { value: "unguwan-shanu", label: "Unguwan Shanu" },
    { value: "romi", label: "Romi" },
  ],
  igabi: [
    { value: "afaka", label: "Afaka" },
    { value: "zaria-road", label: "Zaria Road" },
    { value: "igabi-town", label: "Igabi Town" },
    { value: "jagindi", label: "Jagindi" },
  ],
  giwa: [
    { value: "giwa-town", label: "Giwa Town" },
    { value: "garun-gwanki", label: "Garun Gwanki" },
    { value: "turunku", label: "Turunku" },
  ],
  zaria: [
    { value: "zaria-city", label: "Zaria City" },
    { value: "sabon-gari-zaria", label: "Sabon Gari" },
    { value: "tudun-wada-zaria", label: "Tudun Wada" },
    { value: "kwarbai", label: "Kwarbai" },
  ],
};

// Flat list of all areas (for components that need a simple list)
export const kadunaAreas: Object[] = Object.values(kadunaAreasByLga).flat();

// Legacy flat list used by agent signup and daily report selects
export const kadunaStateLgas: Object[] = [...kadunaLgas];

// ─── Unsold Reasons ───────────────────────────────────────────────────────────

export const unsoldReasons: Object[] = [
  { value: "no_customers", label: "No customers today" },
  { value: "price_too_high", label: "Price too high" },
  { value: "product_quality", label: "Product quality issue" },
  { value: "bad_weather", label: "Bad weather / flooding" },
  { value: "market_closed", label: "Market was closed" },
  { value: "personal_emergency", label: "Personal emergency" },
  { value: "stock_damaged", label: "Stock was damaged" },
  { value: "other", label: "Other" },
];
