// Curated list of countries where immunization microplanning is most relevant.
// Each entry is ISO-3166 alpha-3 + display name + region tag.
// `liveTenantCode` (optional) is set client-side by joining against
// /api/public/tenants — it's not part of this list.

export interface Country {
  code: string;
  name: string;
  region: "Africa" | "Asia" | "Pacific" | "Americas" | "Europe";
}

export const COUNTRIES: Country[] = [
  // ───── Africa ─────
  { code: "AGO", name: "Angola", region: "Africa" },
  { code: "BEN", name: "Benin", region: "Africa" },
  { code: "BFA", name: "Burkina Faso", region: "Africa" },
  { code: "BDI", name: "Burundi", region: "Africa" },
  { code: "CMR", name: "Cameroon", region: "Africa" },
  { code: "CAF", name: "Central African Republic", region: "Africa" },
  { code: "TCD", name: "Chad", region: "Africa" },
  { code: "COM", name: "Comoros", region: "Africa" },
  { code: "COG", name: "Congo (Republic)", region: "Africa" },
  { code: "COD", name: "Democratic Republic of the Congo", region: "Africa" },
  { code: "CIV", name: "Côte d'Ivoire", region: "Africa" },
  { code: "DJI", name: "Djibouti", region: "Africa" },
  { code: "EGY", name: "Egypt", region: "Africa" },
  { code: "ERI", name: "Eritrea", region: "Africa" },
  { code: "SWZ", name: "Eswatini", region: "Africa" },
  { code: "ETH", name: "Ethiopia", region: "Africa" },
  { code: "GAB", name: "Gabon", region: "Africa" },
  { code: "GMB", name: "Gambia", region: "Africa" },
  { code: "GHA", name: "Ghana", region: "Africa" },
  { code: "GIN", name: "Guinea", region: "Africa" },
  { code: "GNB", name: "Guinea-Bissau", region: "Africa" },
  { code: "KEN", name: "Kenya", region: "Africa" },
  { code: "LSO", name: "Lesotho", region: "Africa" },
  { code: "LBR", name: "Liberia", region: "Africa" },
  { code: "MDG", name: "Madagascar", region: "Africa" },
  { code: "MWI", name: "Malawi", region: "Africa" },
  { code: "MLI", name: "Mali", region: "Africa" },
  { code: "MRT", name: "Mauritania", region: "Africa" },
  { code: "MOZ", name: "Mozambique", region: "Africa" },
  { code: "NAM", name: "Namibia", region: "Africa" },
  { code: "NER", name: "Niger", region: "Africa" },
  { code: "NGA", name: "Nigeria", region: "Africa" },
  { code: "RWA", name: "Rwanda", region: "Africa" },
  { code: "STP", name: "São Tomé and Príncipe", region: "Africa" },
  { code: "SEN", name: "Senegal", region: "Africa" },
  { code: "SLE", name: "Sierra Leone", region: "Africa" },
  { code: "SOM", name: "Somalia", region: "Africa" },
  { code: "ZAF", name: "South Africa", region: "Africa" },
  { code: "SSD", name: "South Sudan", region: "Africa" },
  { code: "SDN", name: "Sudan", region: "Africa" },
  { code: "TZA", name: "Tanzania", region: "Africa" },
  { code: "TGO", name: "Togo", region: "Africa" },
  { code: "UGA", name: "Uganda", region: "Africa" },
  { code: "ZMB", name: "Zambia", region: "Africa" },
  { code: "ZWE", name: "Zimbabwe", region: "Africa" },

  // ───── Asia ─────
  { code: "AFG", name: "Afghanistan", region: "Asia" },
  { code: "BGD", name: "Bangladesh", region: "Asia" },
  { code: "BTN", name: "Bhutan", region: "Asia" },
  { code: "KHM", name: "Cambodia", region: "Asia" },
  { code: "IND", name: "India", region: "Asia" },
  { code: "IDN", name: "Indonesia", region: "Asia" },
  { code: "LAO", name: "Laos", region: "Asia" },
  { code: "MMR", name: "Myanmar", region: "Asia" },
  { code: "NPL", name: "Nepal", region: "Asia" },
  { code: "PAK", name: "Pakistan", region: "Asia" },
  { code: "PHL", name: "Philippines", region: "Asia" },
  { code: "LKA", name: "Sri Lanka", region: "Asia" },
  { code: "TLS", name: "Timor-Leste", region: "Asia" },
  { code: "VNM", name: "Vietnam", region: "Asia" },
  { code: "YEM", name: "Yemen", region: "Asia" },

  // ───── Pacific ─────
  { code: "FJI", name: "Fiji", region: "Pacific" },
  { code: "KIR", name: "Kiribati", region: "Pacific" },
  { code: "MHL", name: "Marshall Islands", region: "Pacific" },
  { code: "FSM", name: "Micronesia", region: "Pacific" },
  { code: "NRU", name: "Nauru", region: "Pacific" },
  { code: "PNG", name: "Papua New Guinea", region: "Pacific" },
  { code: "WSM", name: "Samoa", region: "Pacific" },
  { code: "SLB", name: "Solomon Islands", region: "Pacific" },
  { code: "TON", name: "Tonga", region: "Pacific" },
  { code: "TUV", name: "Tuvalu", region: "Pacific" },
  { code: "VUT", name: "Vanuatu", region: "Pacific" },

  // ───── Americas ─────
  { code: "BOL", name: "Bolivia", region: "Americas" },
  { code: "GTM", name: "Guatemala", region: "Americas" },
  { code: "HTI", name: "Haiti", region: "Americas" },
  { code: "HND", name: "Honduras", region: "Americas" },
  { code: "NIC", name: "Nicaragua", region: "Americas" },
  { code: "PER", name: "Peru", region: "Americas" },
  { code: "VEN", name: "Venezuela", region: "Americas" },
];

export const COUNTRIES_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);
