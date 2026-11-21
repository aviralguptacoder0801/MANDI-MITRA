export type CropId = 'aloo' | 'gehu' | 'dhaan' | 'pyaz' | 'sarson';
export type DistrictId =
  | 'barabanki'
  | 'agra'
  | 'lucknow'
  | 'kanpur'
  | 'kannauj'
  | 'farrukhabad'
  | 'varanasi'
  | 'prayagraj';

export type VehicleTypeId = 'tractor_trolley' | 'bolero_pickup' | 'tata_ace' | 'mini_truck_6t';
export type SizeGrade = 'bold' | 'medium' | 'small';
export type GradeTier = 'premium' | 'faq' | 'commercial';
export type LanguageCode = 'hi' | 'awadhi' | 'bhojpuri' | 'en';

export interface CropQualityInput {
  moisturePercent: number; // e.g., 12% for wheat/potato surface, 18% wet
  damagePercent: number; // bruised, sprouted, broken, discolored %
  foreignMatterPercent: number; // soil, chaff, inert matter %
  sizeGrade: SizeGrade;
  gradeTier: GradeTier;
  varietyNote: string;
}

export interface CropSpec {
  id: CropId;
  nameEn: string;
  nameHi: string;
  localLabel: string;
  unitLabel: string;
  sampleImage: string;
  sampleVarieties: string[];
  /** Ideal FAQ moisture threshold (%) above which buyers apply weight/price cuts */
  idealMoistureMax: number;
  moistureMin: number;
  moistureMax: number;
  /** Default starting quality profile */
  defaultQuality: CropQualityInput;
  /** Daily storage fee (₹/qtl/day) for Cold Store or PACS/Farm Godown */
  coldStoragePerQtlDay: number;
  godownPerQtlDay: number;
  /** Daily shrinkage/spoilage % under normal weather */
  dailyShrinkagePct: number;
  /** UP Government MSP / Market Intervention details */
  msp: {
    hasOfficialMsp: boolean;
    ratePerQtl: number; // 0 if MIS-only
    schemeName: string;
    schemeNameHi: string;
    procurementWindow: string;
    portalNote: string;
    faqRule: string;
  };
  /** 15-day relative price index curve (Day 0 = 1.00) derived from seasonal UP arrival trends */
  forecastIndex15d: number[];
  forecastDrivers: string[];
  weatherRisk: {
    severity: 'low' | 'moderate' | 'high';
    summary: string;
    impactNote: string;
    extraSpoilagePctPerDay: number;
  };
}

export interface MandiRecord {
  id: string;
  name: string;
  nameHi: string;
  district: DistrictId;
  districtLabel: string;
  /** Live Agmarknet-modeled FAQ modal price (₹/qtl) by crop */
  modalPrices: Record<CropId, number>;
  /** Mandi Samiti fee + Arhatiya commission % */
  commissionPct: number;
  /** Loading/unloading/weighing (palledari) ₹ per quintal */
  handlingPerQtl: number;
  /** Daily arrival tonnage vs yard capacity */
  dailyCapacityTonnes: number;
  todayArrivalTonnes: number;
  avgWaitHours: number;
  /** Price impact % due to live oversupply or undersupply */
  congestionPriceShiftPct: number;
  coldStorageNearby: boolean;
  mspCenterActive: boolean;
}

export interface VehicleOption {
  id: VehicleTypeId;
  label: string;
  labelHi: string;
  capacityQtl: number;
  baseHireRs: number;
  fuelPerKmRs: number;
  tollPer50KmRs: number;
}

export interface TransportPool {
  id: string;
  cropId: CropId;
  originDistrict: DistrictId;
  destinationMandiId: string;
  vehicleLabel: string;
  totalCapacityQtl: number;
  bookedQtl: number;
  farmersJoined: number;
  departureDate: string;
  departureTime: string;
  totalTruckCostRs: number;
  leadFarmerName: string;
  leadVillage: string;
  verifiedFpo: boolean;
  joinedByUser?: boolean;
  userBookedQtl?: number;
}

export type ForumCategory =
  | 'Market Rates'
  | 'Crop Care'
  | 'Storage & Cold Store'
  | 'MSP & Schemes'
  | 'Transport';

export interface ForumComment {
  id: string;
  authorName: string;
  district: string;
  createdAt: string;
  body: string;
  hidden?: boolean;
  reportedCount?: number;
  reportReason?: string;
}

export interface ForumPost {
  id: string;
  title: string;
  body: string;
  category: ForumCategory;
  cropTag: CropId | 'general';
  authorName: string;
  district: string;
  createdAt: string;
  helpfulCount: number;
  upvotedByUser?: boolean;
  pinned?: boolean;
  locked?: boolean;
  hidden?: boolean;
  reportedCount: number;
  reportReasons: string[];
  autoFlagged?: boolean;
  autoFlagReason?: string;
  comments: ForumComment[];
}

export const UP_DISTRICTS: { id: DistrictId; label: string; labelHi: string; weatherTempC: number; weatherCondition: string }[] = [
  { id: 'barabanki', label: 'Barabanki', labelHi: 'बाराबंकी', weatherTempC: 24, weatherCondition: 'Clear, Light Morning Fog' },
  { id: 'agra', label: 'Agra', labelHi: 'आगरा', weatherTempC: 25, weatherCondition: 'Dry Sunny, Low Humidity' },
  { id: 'lucknow', label: 'Lucknow', labelHi: 'लखनऊ', weatherTempC: 24, weatherCondition: 'Partly Cloudy' },
  { id: 'kanpur', label: 'Kanpur Dehat', labelHi: 'कानपुर देहात', weatherTempC: 25, weatherCondition: 'Clear Skies' },
  { id: 'kannauj', label: 'Kannauj', labelHi: 'कन्नौज', weatherTempC: 23, weatherCondition: 'Mild Fog, 15% Rain Risk Day 4' },
  { id: 'farrukhabad', label: 'Farrukhabad', labelHi: 'फर्रुखाबाद', weatherTempC: 23, weatherCondition: 'Cool Morning, Clear' },
  { id: 'varanasi', label: 'Varanasi', labelHi: 'वाराणसी', weatherTempC: 26, weatherCondition: 'Humid, Shower Alert Day 5' },
  { id: 'prayagraj', label: 'Prayagraj', labelHi: 'प्रयागराज', weatherTempC: 26, weatherCondition: 'Warm & Breezy' },
];

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: 'tractor_trolley',
    label: 'Tractor Trolley (30 Qtl)',
    labelHi: 'ट्रैक्टर ट्रॉली (30 क्विंटल)',
    capacityQtl: 30,
    baseHireRs: 650,
    fuelPerKmRs: 22,
    tollPer50KmRs: 0,
  },
  {
    id: 'tata_ace',
    label: 'Tata Ace / Chota Hathi (12 Qtl)',
    labelHi: 'टाटा एस / छोटा हाथी (12 क्विंटल)',
    capacityQtl: 12,
    baseHireRs: 500,
    fuelPerKmRs: 16,
    tollPer50KmRs: 75,
  },
  {
    id: 'bolero_pickup',
    label: 'Bolero Pickup (22 Qtl)',
    labelHi: 'बोलेरो पिकअप (22 क्विंटल)',
    capacityQtl: 22,
    baseHireRs: 800,
    fuelPerKmRs: 19,
    tollPer50KmRs: 95,
  },
  {
    id: 'mini_truck_6t',
    label: 'Eicher 6-Ton Truck (60 Qtl)',
    labelHi: 'आयशर 6-टन ट्रक (60 क्विंटल)',
    capacityQtl: 60,
    baseHireRs: 1850,
    fuelPerKmRs: 31,
    tollPer50KmRs: 180,
  },
];

export const CROPS: Record<CropId, CropSpec> = {
  aloo: {
    id: 'aloo',
    nameEn: 'Potato (Aloo)',
    nameHi: 'आलू',
    localLabel: 'Aloo · आलू',
    unitLabel: 'Quintal',
    sampleImage: '/src/assets/images/crop_sample_aloo_1795188419051.jpg',
    sampleVarieties: ['Kufri Bahar (3797)', 'Kufri Chipsona-1', 'Kufri Pukhraj', 'Kufri Jyoti'],
    idealMoistureMax: 14,
    moistureMin: 8,
    moistureMax: 28,
    defaultQuality: {
      moisturePercent: 13,
      damagePercent: 2.5,
      foreignMatterPercent: 1.0,
      sizeGrade: 'bold',
      gradeTier: 'faq',
      varietyNote: 'Kufri Bahar (3797)',
    },
    coldStoragePerQtlDay: 2.4,
    godownPerQtlDay: 1.1,
    dailyShrinkagePct: 0.22,
    msp: {
      hasOfficialMsp: false,
      ratePerQtl: 1150,
      schemeName: 'UP Potato Market Intervention Scheme (MIS) & Cold Store Subsidy',
      schemeNameHi: 'यूपी आलू बाजार हस्तक्षेप योजना (MIS) व कोल्ड स्टोर अनुदान',
      procurementWindow: 'Active Monitoring · Nov 2026 – Mar 2027',
      portalNote: 'UP Horticulture Dept MIS Floor Support activates when modal price dips below ₹1,150/qtl; FPO cold-store freight subsidy available.',
      faqRule: 'Tuber size > 45mm, dry skin, zero greening, damage under 3%.',
    },
    forecastIndex15d: [
      1.0, 1.01, 1.03, 1.05, 1.06, 1.08, 1.1, 1.12, 1.13, 1.14, 1.15, 1.14, 1.13, 1.12, 1.11,
    ],
    forecastDrivers: [
      'Early kharif harvest arrivals in Farrukhabad & Kannauj are tapering off over the next 8–10 days.',
      'Delhi-NCR and Bihar wholesale buyers are increasing bids for bold 3797 lots.',
      'Cold-storage discharge inventory is down 11% YoY in Agra belt.',
    ],
    weatherRisk: {
      severity: 'low',
      summary: 'Dry daytime temperatures (23–25°C) across Central & Western UP',
      impactNote: 'Safe curing & short-term holding window for next 10 days; keep sacks off damp floor.',
      extraSpoilagePctPerDay: 0.04,
    },
  },
  gehu: {
    id: 'gehu',
    nameEn: 'Wheat (Gehu)',
    nameHi: 'गेहूं',
    localLabel: 'Gehu · गेहूं',
    unitLabel: 'Quintal',
    sampleImage: '/src/assets/images/crop_sample_gehu_1795188505409.jpg',
    sampleVarieties: ['HD-2967', 'HD-3086 (Pusa Gautami)', 'Sharbati UP', 'DBW-187'],
    idealMoistureMax: 12,
    moistureMin: 8,
    moistureMax: 22,
    defaultQuality: {
      moisturePercent: 11.5,
      damagePercent: 1.5,
      foreignMatterPercent: 0.8,
      sizeGrade: 'bold',
      gradeTier: 'faq',
      varietyNote: 'HD-2967',
    },
    coldStoragePerQtlDay: 1.2,
    godownPerQtlDay: 0.55,
    dailyShrinkagePct: 0.05,
    msp: {
      hasOfficialMsp: true,
      ratePerQtl: 2425,
      schemeName: 'Rabi MSP Procurement — UP FCS e-Kharid Portal',
      schemeNameHi: 'रबी न्यूनतम समर्थन मूल्य (MSP) — यूपी खाद्य एवं रसद e-खरीद',
      procurementWindow: 'Registration Open · Direct DBT within 48 hrs',
      portalNote: 'Register on fcs.up.gov.in with Khatauni & Aadhaar-linked bank account for guaranteed ₹2,425/qtl MSP.',
      faqRule: 'Moisture max 12%, foreign matter max 0.75%, damaged grains max 2%, shriveled max 6%.',
    },
    forecastIndex15d: [
      1.0, 1.005, 1.01, 1.015, 1.02, 1.022, 1.025, 1.03, 1.035, 1.04, 1.042, 1.045, 1.048, 1.05, 1.052,
    ],
    forecastDrivers: [
      'Flour mills in Kanpur and Lucknow are actively replenishing stocks.',
      'Government OMSS auctions cap sharp upward spikes beyond 5%.',
      'Dry lots below 12% moisture earn ₹50–₹90/qtl mill premium over FAQ.',
    ],
    weatherRisk: {
      severity: 'low',
      summary: 'Low humidity across Gangetic plains; minimal weevil risk in sealed PACS godowns',
      impactNote: 'Dry grain can be safely stored in hermetic bags or PACS warehouse.',
      extraSpoilagePctPerDay: 0.01,
    },
  },
  dhaan: {
    id: 'dhaan',
    nameEn: 'Paddy (Dhaan)',
    nameHi: 'धान',
    localLabel: 'Dhaan · धान',
    unitLabel: 'Quintal',
    sampleImage: '/src/assets/images/crop_sample_gehu_1795188505409.jpg',
    sampleVarieties: ['Common Paddy (Grade A)', 'Pusa Basmati 1509', 'Sarju-52', 'Sambha Mahsuri'],
    idealMoistureMax: 17,
    moistureMin: 11,
    moistureMax: 26,
    defaultQuality: {
      moisturePercent: 16.5,
      damagePercent: 2.0,
      foreignMatterPercent: 1.2,
      sizeGrade: 'medium',
      gradeTier: 'faq',
      varietyNote: 'Common Paddy (Grade A)',
    },
    coldStoragePerQtlDay: 1.3,
    godownPerQtlDay: 0.65,
    dailyShrinkagePct: 0.14,
    msp: {
      hasOfficialMsp: true,
      ratePerQtl: 2320,
      schemeName: 'Kharif Paddy MSP (Grade A ₹2,320 / Common ₹2,300) — UP e-Kharid',
      schemeNameHi: 'खरीफ धान MSP (ग्रेड-A ₹2,320 / कॉमन ₹2,300) — यूपी क्रय केंद्र',
      procurementWindow: 'Active Procurement · Nov 1 – Feb 28',
      portalNote: 'UP Paddy Purchase Centers open across all districts; moisture above 17% triggers rejection at govt centers—sun-dry for 1 day first.',
      faqRule: 'Moisture strictly <= 17%, immature/shriveled <= 3%, inorganic foreign matter <= 1%.',
    },
    forecastIndex15d: [
      1.0, 0.99, 0.98, 0.97, 0.96, 0.96, 0.97, 0.975, 0.98, 0.99, 1.0, 1.01, 1.015, 1.02, 1.02,
    ],
    forecastDrivers: [
      'Peak November paddy arrivals in Eastern & Central UP are pressuring open mandi bids this week.',
      'Government MSP procurement centers offer ₹120–₹210/qtl above congested private yards.',
      'Humid showers forecast in Varanasi–Prayagraj belt on Day 5 threaten un-dried paddy.',
    ],
    weatherRisk: {
      severity: 'high',
      summary: 'Light unseasonal shower alert in Eastern UP around Day 5–6',
      impactNote: 'High moisture lots (>18%) risk fungal discoloration if held in open farm sheds; sell at MSP center or dry immediately.',
      extraSpoilagePctPerDay: 0.25,
    },
  },
  pyaz: {
    id: 'pyaz',
    nameEn: 'Onion (Pyaz)',
    nameHi: 'प्याज',
    localLabel: 'Pyaz · प्याज',
    unitLabel: 'Quintal',
    sampleImage: '/src/assets/images/crop_sample_pyaz_1795188507368.jpg',
    sampleVarieties: ['Nashik Red (N-53)', 'Bhima Super', 'Agrifound Light Red', 'Local UP Red'],
    idealMoistureMax: 15,
    moistureMin: 9,
    moistureMax: 26,
    defaultQuality: {
      moisturePercent: 14.5,
      damagePercent: 3.0,
      foreignMatterPercent: 1.0,
      sizeGrade: 'medium',
      gradeTier: 'faq',
      varietyNote: 'Bhima Super',
    },
    coldStoragePerQtlDay: 2.8,
    godownPerQtlDay: 1.25,
    dailyShrinkagePct: 0.34,
    msp: {
      hasOfficialMsp: false,
      ratePerQtl: 0,
      schemeName: 'NCCF / NAFED Price Stabilisation Buffer Procurement',
      schemeNameHi: 'NCCF / NAFED बफर स्टॉक खरीद योजना',
      procurementWindow: 'Spot Procurement via FPOs when arrivals spike',
      portalNote: 'No statutory MSP for onion; FPO members can sell cured Grade-A bulbs directly to NAFED regional collection hubs.',
      faqRule: 'Well-cured dry neck, diameter 45–65mm, zero sprouting or double bulbs.',
    },
    forecastIndex15d: [
      1.0, 1.02, 1.04, 1.07, 1.09, 1.11, 1.13, 1.15, 1.16, 1.17, 1.16, 1.15, 1.13, 1.11, 1.1,
    ],
    forecastDrivers: [
      'Delayed Maharashtra & MP late-kharif supply is lifting Lucknow and Varanasi wholesale onion rates.',
      'Well-cured red bulbs with dry papery necks command 8–12% premium over moist lots.',
      'Peak wholesale rally projected around Day 8–10 before fresh Gujarat arrivals enter.',
    ],
    weatherRisk: {
      severity: 'moderate',
      summary: 'Morning dew & patchy humidity in Eastern UP',
      impactNote: 'Store only in ventilated onion chawl/shed; avoid sealed plastic bags to prevent neck rot.',
      extraSpoilagePctPerDay: 0.14,
    },
  },
  sarson: {
    id: 'sarson',
    nameEn: 'Mustard (Sarson)',
    nameHi: 'सरसों',
    localLabel: 'Sarson · सरसों',
    unitLabel: 'Quintal',
    sampleImage: '/src/assets/images/crop_sample_gehu_1795188505409.jpg',
    sampleVarieties: ['Pusa Bold', 'RH-749', 'Giriraj (DRMRIJ-31)', 'Yellow Sarson'],
    idealMoistureMax: 8,
    moistureMin: 5,
    moistureMax: 16,
    defaultQuality: {
      moisturePercent: 7.8,
      damagePercent: 1.5,
      foreignMatterPercent: 1.0,
      sizeGrade: 'bold',
      gradeTier: 'faq',
      varietyNote: 'Pusa Bold',
    },
    coldStoragePerQtlDay: 1.5,
    godownPerQtlDay: 0.7,
    dailyShrinkagePct: 0.04,
    msp: {
      hasOfficialMsp: true,
      ratePerQtl: 5950,
      schemeName: 'NAFED PSS Oilseed MSP — ₹5,950/qtl (42% Oil Basis)',
      schemeNameHi: 'नाफेड तिलहन MSP — ₹5,950/क्विंटल (42% तेल मानक)',
      procurementWindow: 'PSS Window · Active via UP PCF / NAFED',
      portalNote: 'Higher oil-content bold seeds (42%+) attract oil-mill premiums in Agra & Kanpur crushers.',
      faqRule: 'Moisture strictly <= 8%, foreign matter <= 2%, oil content benchmark 42%.',
    },
    forecastIndex15d: [
      1.0, 1.01, 1.015, 1.02, 1.03, 1.04, 1.045, 1.055, 1.06, 1.065, 1.07, 1.072, 1.075, 1.07, 1.065,
    ],
    forecastDrivers: [
      'Agra & Bharatpur oil mills are aggressively bidding for bold, low-moisture mustard.',
      'Edible oil import parity supports firm spot rates over the next 2 weeks.',
      'Low shrinkage makes short 10-day storage financially rewarding.',
    ],
    weatherRisk: {
      severity: 'low',
      summary: 'Cool dry air ideal for oilseed preservation',
      impactNote: 'Minimal storage risk when moisture is kept below 8%.',
      extraSpoilagePctPerDay: 0.01,
    },
  },
};

export const UP_MANDIS: MandiRecord[] = [
  {
    id: 'barabanki_nawabganj',
    name: 'Nawabganj Mandi, Barabanki',
    nameHi: 'नवाबगंज मंडी, बाराबंकी',
    district: 'barabanki',
    districtLabel: 'Barabanki',
    modalPrices: { aloo: 1410, gehu: 2440, dhaan: 2180, pyaz: 2480, sarson: 5960 },
    commissionPct: 2.5,
    handlingPerQtl: 18,
    dailyCapacityTonnes: 650,
    todayArrivalTonnes: 615, // 95% -> Overcrowded
    avgWaitHours: 4.5,
    congestionPriceShiftPct: -3.2,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
  {
    id: 'lucknow_dubagga',
    name: 'Dubagga Mandi, Lucknow',
    nameHi: 'दुबग्गा मंडी, लखनऊ',
    district: 'lucknow',
    districtLabel: 'Lucknow',
    modalPrices: { aloo: 1620, gehu: 2515, dhaan: 2295, pyaz: 2790, sarson: 6120 },
    commissionPct: 2.0,
    handlingPerQtl: 22,
    dailyCapacityTonnes: 1200,
    todayArrivalTonnes: 640, // 53% -> Undersupplied Premium
    avgWaitHours: 1.2,
    congestionPriceShiftPct: 2.4,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
  {
    id: 'kanpur_naubasta',
    name: 'Naubasta Mandi, Kanpur',
    nameHi: 'नौबस्ता मंडी, कानपुर',
    district: 'kanpur',
    districtLabel: 'Kanpur',
    modalPrices: { aloo: 1580, gehu: 2560, dhaan: 2260, pyaz: 2720, sarson: 6210 },
    commissionPct: 2.2,
    handlingPerQtl: 20,
    dailyCapacityTonnes: 1100,
    todayArrivalTonnes: 720, // 65% -> Balanced
    avgWaitHours: 1.8,
    congestionPriceShiftPct: 0.8,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
  {
    id: 'agra_sikandra',
    name: 'Sikandra Mandi, Agra',
    nameHi: 'सिकंदरा मंडी, आगरा',
    district: 'agra',
    districtLabel: 'Agra',
    modalPrices: { aloo: 1685, gehu: 2540, dhaan: 2240, pyaz: 2660, sarson: 6290 },
    commissionPct: 1.8,
    handlingPerQtl: 19,
    dailyCapacityTonnes: 1500,
    todayArrivalTonnes: 810, // 54% -> Undersupplied Premium
    avgWaitHours: 1.4,
    congestionPriceShiftPct: 2.1,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
  {
    id: 'kannauj_chhibramau',
    name: 'Chhibramau Mandi, Kannauj',
    nameHi: 'छिबरामऊ मंडी, कन्नौज',
    district: 'kannauj',
    districtLabel: 'Kannauj',
    modalPrices: { aloo: 1460, gehu: 2455, dhaan: 2210, pyaz: 2510, sarson: 6040 },
    commissionPct: 2.5,
    handlingPerQtl: 16,
    dailyCapacityTonnes: 800,
    todayArrivalTonnes: 730, // 91% -> Overcrowded
    avgWaitHours: 3.8,
    congestionPriceShiftPct: -2.8,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
  {
    id: 'farrukhabad_satanpur',
    name: 'Satanpur Mandi, Farrukhabad',
    nameHi: 'सातनपुर मंडी, फर्रुखाबाद',
    district: 'farrukhabad',
    districtLabel: 'Farrukhabad',
    modalPrices: { aloo: 1435, gehu: 2445, dhaan: 2195, pyaz: 2470, sarson: 6010 },
    commissionPct: 2.4,
    handlingPerQtl: 15,
    dailyCapacityTonnes: 950,
    todayArrivalTonnes: 860, // 91% -> Overcrowded
    avgWaitHours: 4.1,
    congestionPriceShiftPct: -2.6,
    coldStorageNearby: true,
    mspCenterActive: false,
  },
  {
    id: 'prayagraj_mundera',
    name: 'Mundera Mandi, Prayagraj',
    nameHi: 'मुंडेरा मंडी, प्रयागराज',
    district: 'prayagraj',
    districtLabel: 'Prayagraj',
    modalPrices: { aloo: 1640, gehu: 2495, dhaan: 2310, pyaz: 2810, sarson: 6140 },
    commissionPct: 2.1,
    handlingPerQtl: 21,
    dailyCapacityTonnes: 900,
    todayArrivalTonnes: 505, // 56% -> Undersupplied Premium
    avgWaitHours: 1.5,
    congestionPriceShiftPct: 1.9,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
  {
    id: 'varanasi_paharia',
    name: 'Paharia Mandi, Varanasi',
    nameHi: 'पहाड़िया मंडी, वाराणसी',
    district: 'varanasi',
    districtLabel: 'Varanasi',
    modalPrices: { aloo: 1670, gehu: 2510, dhaan: 2335, pyaz: 2860, sarson: 6160 },
    commissionPct: 2.0,
    handlingPerQtl: 22,
    dailyCapacityTonnes: 1050,
    todayArrivalTonnes: 610, // 58% -> Undersupplied Premium
    avgWaitHours: 1.6,
    congestionPriceShiftPct: 2.2,
    coldStorageNearby: true,
    mspCenterActive: true,
  },
];

/** Approximate road distances (km) between UP origin districts and destination mandi districts */
export const DISTRICT_DISTANCE_KM: Record<DistrictId, Record<DistrictId, number>> = {
  barabanki: { barabanki: 10, lucknow: 34, kanpur: 112, kannauj: 156, farrukhabad: 192, prayagraj: 215, agra: 356, varanasi: 295 },
  lucknow: { barabanki: 34, lucknow: 12, kanpur: 84, kannauj: 128, farrukhabad: 168, prayagraj: 202, agra: 332, varanasi: 312 },
  kanpur: { barabanki: 112, lucknow: 84, kanpur: 14, kannauj: 86, farrukhabad: 138, prayagraj: 208, agra: 274, varanasi: 330 },
  kannauj: { barabanki: 156, lucknow: 128, kanpur: 86, kannauj: 11, farrukhabad: 58, prayagraj: 288, agra: 195, varanasi: 410 },
  farrukhabad: { barabanki: 192, lucknow: 168, kanpur: 138, kannauj: 58, farrukhabad: 9, prayagraj: 342, agra: 174, varanasi: 462 },
  agra: { barabanki: 356, lucknow: 332, kanpur: 274, kannauj: 195, farrukhabad: 174, prayagraj: 468, agra: 12, varanasi: 595 },
  prayagraj: { barabanki: 215, lucknow: 202, kanpur: 208, kannauj: 288, farrukhabad: 342, prayagraj: 11, agra: 468, varanasi: 124 },
  varanasi: { barabanki: 295, lucknow: 312, kanpur: 330, kannauj: 410, farrukhabad: 462, prayagraj: 124, agra: 595, varanasi: 13 },
};

export const INITIAL_TRANSPORT_POOLS: TransportPool[] = [
  {
    id: 'pool-bbk-lko-1',
    cropId: 'aloo',
    originDistrict: 'barabanki',
    destinationMandiId: 'lucknow_dubagga',
    vehicleLabel: 'Eicher 6-Ton Truck',
    totalCapacityQtl: 60,
    bookedQtl: 38,
    farmersJoined: 3,
    departureDate: 'Tomorrow, 21 Nov',
    departureTime: '04:30 AM',
    totalTruckCostRs: 3100,
    leadFarmerName: 'Ramprakash Verma',
    leadVillage: 'Dewa Block, Barabanki',
    verifiedFpo: true,
  },
  {
    id: 'pool-knj-agra-2',
    cropId: 'aloo',
    originDistrict: 'kannauj',
    destinationMandiId: 'agra_sikandra',
    vehicleLabel: 'Tata 10-Ton Shared Carrier',
    totalCapacityQtl: 100,
    bookedQtl: 68,
    farmersJoined: 5,
    departureDate: '22 Nov',
    departureTime: '02:00 AM',
    totalTruckCostRs: 8600,
    leadFarmerName: 'Suresh Tiwari',
    leadVillage: 'Tirwa, Kannauj',
    verifiedFpo: true,
  },
  {
    id: 'pool-bbk-knp-3',
    cropId: 'gehu',
    originDistrict: 'barabanki',
    destinationMandiId: 'kanpur_naubasta',
    vehicleLabel: 'Eicher 6-Ton Truck',
    totalCapacityQtl: 60,
    bookedQtl: 42,
    farmersJoined: 4,
    departureDate: '22 Nov',
    departureTime: '05:00 AM',
    totalTruckCostRs: 5400,
    leadFarmerName: 'Dinesh Yadav',
    leadVillage: 'Fatehpur, Barabanki',
    verifiedFpo: true,
  },
  {
    id: 'pool-prg-vns-4',
    cropId: 'pyaz',
    originDistrict: 'prayagraj',
    destinationMandiId: 'varanasi_paharia',
    vehicleLabel: 'Bolero Maxi Truck Plus',
    totalCapacityQtl: 35,
    bookedQtl: 21,
    farmersJoined: 2,
    departureDate: 'Tomorrow, 21 Nov',
    departureTime: '03:45 AM',
    totalTruckCostRs: 3800,
    leadFarmerName: 'Mahesh Maurya',
    leadVillage: 'Phulpur, Prayagraj',
    verifiedFpo: false,
  },
  {
    id: 'pool-frk-knp-5',
    cropId: 'sarson',
    originDistrict: 'farrukhabad',
    destinationMandiId: 'kanpur_naubasta',
    vehicleLabel: 'Eicher 6-Ton Truck',
    totalCapacityQtl: 60,
    bookedQtl: 36,
    farmersJoined: 3,
    departureDate: '23 Nov',
    departureTime: '04:00 AM',
    totalTruckCostRs: 6100,
    leadFarmerName: 'Rajendra Shakya',
    leadVillage: 'Kaimganj, Farrukhabad',
    verifiedFpo: true,
  },
];

export const INITIAL_FORUM_POSTS: ForumPost[] = [
  {
    id: 'post-101',
    title: 'Dubagga Mandi (Lucknow) paying ₹190/qtl extra for dry 3797 Aloo today',
    body: 'Took 22 quintals from Barabanki early morning via shared truck. Nawabganj yard had a 4-hour tractor queue and traders were cutting ₹120/qtl citing damp soil. At Dubagga, dry bold tubers sold cleanly at ₹1,640/qtl with 2% commission. Always sun-dry tubers for 3–4 hours before bagging.',
    category: 'Market Rates',
    cropTag: 'aloo',
    authorName: 'Harishchandra Patel',
    district: 'Barabanki',
    createdAt: '2 hours ago',
    helpfulCount: 28,
    pinned: true,
    reportedCount: 0,
    reportReasons: [],
    comments: [
      {
        id: 'c-1',
        authorName: 'Vinod Kumar',
        district: 'Lucknow',
        createdAt: '1 hour ago',
        body: 'Confirmed! Gate entry was smooth before 7 AM today. Arhatiyas are specifically asking for 45mm+ bold sorting.',
      },
      {
        id: 'c-2',
        authorName: 'Savitri Devi (FPO Lead)',
        district: 'Barabanki',
        createdAt: '42 mins ago',
        body: 'Our Dewa FPO truck leaves tomorrow 4:30 AM for Dubagga—22 quintal space is still open in Transport Pools.',
      },
    ],
  },
  {
    id: 'post-102',
    title: 'How to pass UP e-Kharid Paddy MSP moisture test without rejection?',
    body: 'At Prayagraj and Barabanki government paddy centers, moisture meter strictly requires 17% or lower. Last week my lot measured 19.2% and almost got turned away. Spreading the grain in a 2-inch thin layer on tarpaulin for one sunny afternoon brought it down to 16.4%, and I got full ₹2,320/qtl Grade-A MSP via DBT in 36 hours.',
    category: 'MSP & Schemes',
    cropTag: 'dhaan',
    authorName: 'Rameshwar Mishra',
    district: 'Prayagraj',
    createdAt: '5 hours ago',
    helpfulCount: 41,
    reportedCount: 0,
    reportReasons: [],
    comments: [
      {
        id: 'c-3',
        authorName: 'Anil Chauhan',
        district: 'Varanasi',
        createdAt: '3 hours ago',
        body: 'Great advice. Also bring updated Khatauni printout and check your bank NPCI seeding beforehand so DBT does not stall.',
      },
    ],
  },
  {
    id: 'post-103',
    title: 'Ventilated bamboo chawl storage cut my onion weight loss in half',
    body: 'Instead of keeping Bhima Super onions in sealed plastic gunny bags where neck rot starts in 6 days, we stacked them on raised bamboo slats with 1-foot air flow underneath. Held for 10 days waiting for Varanasi Paharia prices to cross ₹2,850/qtl—shrinkage stayed under 3%.',
    category: 'Storage & Cold Store',
    cropTag: 'pyaz',
    authorName: 'Pradeep Kushwaha',
    district: 'Varanasi',
    createdAt: 'Yesterday',
    helpfulCount: 19,
    reportedCount: 0,
    reportReasons: [],
    comments: [],
  },
  {
    id: 'post-104',
    title: 'Urgent!! Send ₹500 advance UPI to lock ₹3,200/qtl wheat buyer guaranteed!!',
    body: 'Guaranteed double MSP rate! Send ₹500 registration fee and share OTP on WhatsApp immediately to book private truck pickup today. Limited slots!',
    category: 'Market Rates',
    cropTag: 'gehu',
    authorName: 'QuickTrade_Agent99',
    district: 'Kanpur Dehat',
    createdAt: '3 hours ago',
    helpfulCount: 0,
    reportedCount: 3,
    reportReasons: ['Middleman Scam / Advance Fee Fraud', 'Misleading Price Claim'],
    autoFlagged: true,
    autoFlagReason: 'Suspicious advance fee / OTP request pattern detected.',
    comments: [],
  },
];
