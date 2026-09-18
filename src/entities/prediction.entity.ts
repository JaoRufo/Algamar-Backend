export type EnvironmentalFactors = {
  temperature_celsius: number | null;
  chlorophyll_mg_m3: number | null;
  salinity_psu: number | null;
};

export type EnrichedPoint = {
  id: string;
  latitude: number;
  longitude: number;
  region: string;
  year: number;
  month: number;
  probability: number;
  risk_level: string;
  environmental_factors: EnvironmentalFactors;
  model_version: string;
};
