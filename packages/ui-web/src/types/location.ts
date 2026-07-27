// === Location types

/* Shared shapes for Nigerian administrative geography. Consumed by the
   nigerian-states dataset and by any form that needs a state, LGA, or area
   selector. */

export interface NigerianLga {
  name: string;
  /** Named areas/wards within the LGA. Only populated where we have the detail. */
  areas?: readonly string[];
}

export interface NigerianState {
  name: string;
  capital: string;
  /** kebab-case, URL/param safe, derived from name. */
  slug: string;
  lgas: readonly NigerianLga[];
}

/* Mirrors the local `Option` shape in components/dash-select.tsx so select
   options built from this data drop straight into the existing inputs. */
export interface SelectOption {
  value: string;
  label: string;
}
