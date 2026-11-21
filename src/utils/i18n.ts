import type { DistrictId, LanguageCode } from '../data/upMandis';

export interface DistrictGeoInfo {
  id: DistrictId;
  lat: number;
  lng: number;
  defaultLanguage: LanguageCode;
  regionNameEn: string;
  regionNameLocal: string;
}

export const DISTRICT_GEO: Record<DistrictId, DistrictGeoInfo> = {
  barabanki: {
    id: 'barabanki',
    lat: 26.926,
    lng: 81.183,
    defaultLanguage: 'awadhi',
    regionNameEn: 'Awadh Belt',
    regionNameLocal: 'अवध क्षेत्र',
  },
  lucknow: {
    id: 'lucknow',
    lat: 26.8467,
    lng: 80.9462,
    defaultLanguage: 'awadhi',
    regionNameEn: 'Awadh Belt',
    regionNameLocal: 'अवध क्षेत्र',
  },
  prayagraj: {
    id: 'prayagraj',
    lat: 25.4358,
    lng: 81.8463,
    defaultLanguage: 'awadhi',
    regionNameEn: 'Awadh–Sangam Belt',
    regionNameLocal: 'अवध–संगम क्षेत्र',
  },
  varanasi: {
    id: 'varanasi',
    lat: 25.3176,
    lng: 82.9739,
    defaultLanguage: 'bhojpuri',
    regionNameEn: 'Purvanchal',
    regionNameLocal: 'पूर्वांचल',
  },
  agra: {
    id: 'agra',
    lat: 27.1767,
    lng: 78.0081,
    defaultLanguage: 'hi',
    regionNameEn: 'Braj / Western UP',
    regionNameLocal: 'ब्रज / पश्चिमी यूपी',
  },
  kanpur: {
    id: 'kanpur',
    lat: 26.4499,
    lng: 80.3319,
    defaultLanguage: 'hi',
    regionNameEn: 'Central UP',
    regionNameLocal: 'मध्य यूपी',
  },
  kannauj: {
    id: 'kannauj',
    lat: 27.0514,
    lng: 79.9137,
    defaultLanguage: 'hi',
    regionNameEn: 'Kannauj Belt',
    regionNameLocal: 'कन्नौज क्षेत्र',
  },
  farrukhabad: {
    id: 'farrukhabad',
    lat: 27.3906,
    lng: 79.58,
    defaultLanguage: 'hi',
    regionNameEn: 'Doab Belt',
    regionNameLocal: 'दोआब क्षेत्र',
  },
};

export function getDefaultLanguageForDistrict(districtId: DistrictId): LanguageCode {
  return DISTRICT_GEO[districtId]?.defaultLanguage ?? 'hi';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the nearest supported UP district for given GPS coordinates.
 * Also returns distance in km so the UI can note if the user is outside UP.
 */
export function findNearestDistrict(
  lat: number,
  lng: number
): { districtId: DistrictId; distanceKm: number; language: LanguageCode; inUpRegion: boolean } {
  let closest: DistrictGeoInfo = DISTRICT_GEO.lucknow;
  let minDist = Number.POSITIVE_INFINITY;

  for (const info of Object.values(DISTRICT_GEO)) {
    const d = haversineKm(lat, lng, info.lat, info.lng);
    if (d < minDist) {
      minDist = d;
      closest = info;
    }
  }

  return {
    districtId: closest.id,
    distanceKm: Math.round(minDist),
    language: closest.defaultLanguage,
    inUpRegion: minDist <= 350,
  };
}

export interface UiStrings {
  languageName: string;
  nav: {
    home: string;
    profit: string;
    map: string;
    forecast: string;
    pools: string;
    voice: string;
    community: string;
    voiceCta: string;
    backToHome: string;
  };
  dashboard: {
    headline: string;
    subline: string;
    chooseAction: string;
    quickCropLabel: string;
    openTool: string;
    cards: {
      profitTitle: string;
      profitDesc: string;
      forecastTitle: string;
      forecastDesc: string;
      mapTitle: string;
      mapDesc: string;
      poolsTitle: string;
      poolsDesc: string;
      voiceTitle: string;
      voiceDesc: string;
      communityTitle: string;
      communityDesc: string;
    };
  };
  locationBar: {
    homeLocation: string;
    useGps: string;
    detectingGps: string;
    autoRegion: string;
    languageLabel: string;
    gpsMatched: string;
    gpsOutsideUp: string;
    gpsDenied: string;
  };
  profit: {
    title: string;
    subtitle: string;
    step1Title: string;
    step2Title: string;
    step3Title: string;
    quantityLabel: string;
    vehicleLabel: string;
    qualityGood: string;
    qualityGoodSub: string;
    qualityNormal: string;
    qualityNormalSub: string;
    qualityWeak: string;
    qualityWeakSub: string;
    moreQualityBtn: string;
    hideQualityBtn: string;
    photoCheckBtn: string;
    fairRateLabel: string;
    bestMandiLabel: string;
    cashInHandLabel: string;
    perQuintalNet: string;
    deductionsLabel: string;
    extraVsLocal: string;
    mspRateLabel: string;
    showAllMandis: string;
    showTopMandis: string;
    copySlip: string;
    copiedSlip: string;
    checkSellOrWait: string;
    tableMandi: string;
    tableDist: string;
    tableRate: string;
    tableCosts: string;
    tableCrowd: string;
    tableProfit: string;
    sharedTruckPrompt: string;
    viewPoolBtn: string;
  };
  forecast: {
    title: string;
    subtitle: string;
    sellNowBadge: string;
    holdBadge: string;
    coldStore: string;
    farmShed: string;
    holdSlider: string;
    weatherTitle: string;
    mspTitle: string;
  };
  pools: {
    title: string;
    subtitle: string;
    startPool: string;
    crowdChartTitle: string;
    poolsTitle: string;
    reserveSlot: string;
    joinedLabel: string;
  };
  voice: {
    title: string;
    subtitle: string;
    askPlaceholder: string;
    sendBtn: string;
    listenBtn: string;
    tapToAsk: string;
  };
  community: {
    title: string;
    subtitle: string;
    newPost: string;
    modDesk: string;
    helpful: string;
    comments: string;
    report: string;
  };
  map: {
    title: string;
    subtitle: string;
    findMandis: string;
    findColdStores: string;
    findKvk: string;
    routeToBest: string;
    openGoogleMaps: string;
    liveMapsBrief: string;
  };
  chatbot: {
    title: string;
    greeting: string;
    placeholder: string;
    openAria: string;
    closeAria: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, UiStrings> = {
  hi: {
    languageName: 'हिंदी',
    nav: {
      home: 'मुख्य पेज',
      profit: 'शुद्ध मुनाफा',
      map: 'मंडी नक्शा',
      forecast: 'बाजार ट्रेंड',
      pools: 'साझा ट्रक',
      voice: 'आवाज़ सलाह',
      community: 'किसान चौपाल',
      voiceCta: 'बोलकर पूछें',
      backToHome: 'मुख्य डैशबोर्ड पर लौटें',
    },
    dashboard: {
      headline: 'आज आपकी फसल के लिए सही फैसला',
      subline: 'बड़े बटन चुनें — साफ और तेज़ मंडी सलाह, सीधे खेत से इस्तेमाल के लिए।',
      chooseAction: 'क्या देखना चाहते हैं? किसी एक कार्ड पर टैप करें',
      quickCropLabel: 'फसल बदलें:',
      openTool: 'खोलें',
      cards: {
        profitTitle: 'शुद्ध मुनाफा जानें',
        profitDesc: 'भाड़ा, टोल और कमीशन काटकर सबसे ज़्यादा हाथ में पैसा देने वाली मंडी देखें।',
        forecastTitle: 'बाजार ट्रेंड और MSP देखें',
        forecastDesc: '15 दिन का भाव अनुमान, कोल्ड स्टोर खर्च और सरकारी MSP की तुलना करें।',
        mapTitle: 'मंडी नक्शा और रास्ता',
        mapDesc: 'सबसे फायदेमंद मंडी का रास्ता, दूरी और पास के कोल्ड स्टोर नक्शे पर देखें।',
        poolsTitle: 'साझा ट्रक और भीड़ अलर्ट',
        poolsDesc: 'भीड़ वाली मंडी से बचें और पास के किसानों के साथ ट्रक बांटकर भाड़ा कम करें।',
        voiceTitle: 'बोलकर सलाह लें',
        voiceDesc: 'अपनी बोली में बोलकर सवाल पूछें और आवाज़ में पूरा जवाब सुनें।',
        communityTitle: 'किसान चौपाल',
        communityDesc: 'यूपी के किसान भाइयों से मंडी भाव, भंडारण और खेती के अनुभव बांटें।',
      },
    },
    locationBar: {
      homeLocation: 'आपका जिला',
      useGps: 'मेरी लोकेशन पहचानें',
      detectingGps: 'खोज रहे हैं...',
      autoRegion: 'इलाके की भाषा (Auto)',
      languageLabel: 'भाषा',
      gpsMatched: 'लोकेशन से जिला व भाषा चुनी गई',
      gpsOutsideUp: 'आप यूपी से बाहर हैं — नज़दीकी यूपी जिला चुना गया',
      gpsDenied: 'लोकेशन की अनुमति नहीं मिली — ऊपर से अपना जिला चुनें',
    },
    profit: {
      title: 'किस मंडी में मिलेगा सबसे ज़्यादा मुनाफा?',
      subtitle: 'फसल चुनें, उसकी क्वालिटी बताएं — और भाड़ा व कमीशन काटकर हाथ में आने वाला असली पैसा जानें।',
      step1Title: '1. फसल और मात्रा चुनें',
      step2Title: '2. आपकी फसल कैसी है? (क्वालिटी)',
      step3Title: '3. सबसे फायदेमंद मंडी (आपके हाथ में पैसा)',
      quantityLabel: 'कितने क्विंटल?',
      vehicleLabel: 'कौन सा वाहन?',
      qualityGood: 'अच्छी व सूखी',
      qualityGoodSub: 'बड़ा दाना, कम नमी (+भाव)',
      qualityNormal: 'सामान्य (FAQ)',
      qualityNormalSub: 'ठीक-ठाक मंडी मानक',
      qualityWeak: 'गीली या दागी',
      qualityWeakSub: 'ज्यादा नमी या कटा-फटा',
      moreQualityBtn: 'नमी, दाना और फोटो जांच खोलें',
      hideQualityBtn: 'विस्तृत जांच बंद करें',
      photoCheckBtn: 'फसल की फोटो से जांचें',
      fairRateLabel: 'आपकी फसल का सही भाव',
      bestMandiLabel: 'सबसे ज़्यादा मुनाफे वाली मंडी',
      cashInHandLabel: 'हाथ में शुद्ध कमाई',
      perQuintalNet: 'प्रति क्विंटल शुद्ध',
      deductionsLabel: 'भाड़ा व मंडी खर्च',
      extraVsLocal: 'पास की मंडी से ज़्यादा',
      mspRateLabel: 'सरकारी MSP / समर्थन',
      showAllMandis: 'सभी 8 मंडियां देखें',
      showTopMandis: 'सिर्फ टॉप 3 मंडियां देखें',
      copySlip: 'भाव पर्ची कॉपी करें',
      copiedSlip: 'पर्ची कॉपी हो गई',
      checkSellOrWait: 'आज बेचें या रुकें?',
      tableMandi: 'मंडी का नाम',
      tableDist: 'दूरी',
      tableRate: 'सही भाव',
      tableCosts: 'कुल खर्च',
      tableCrowd: 'भीड़ / आवक',
      tableProfit: 'शुद्ध कमाई',
      sharedTruckPrompt: 'साझा ट्रक उपलब्ध है — भाड़ा बचाएं',
      viewPoolBtn: 'ट्रक देखें',
    },
    forecast: {
      title: 'आज बेचें या कुछ दिन रुकें? + सरकारी MSP',
      subtitle: 'अगले 15 दिनों के अनुमानित भाव, कोल्ड स्टोर किराया और मौसम देखकर सही दिन चुनें।',
      sellNowBadge: 'सलाह · आज बेचना बेहतर है',
      holdBadge: 'सलाह · कुछ दिन रोककर बेचें',
      coldStore: 'कोल्ड स्टोर',
      farmShed: 'गोदाम / घर पर',
      holdSlider: 'कितने दिन रोकें?',
      weatherTitle: '7 दिन का मौसम अलर्ट',
      mspTitle: 'यूपी सरकारी MSP योजना',
    },
    pools: {
      title: 'मंडी में भीड़ और साझा ट्रक पूल',
      subtitle: 'भीड़ वाली मंडी से बचें और पास के किसानों के साथ ट्रक शेयर करके भाड़ा आधा करें।',
      startPool: 'नया ट्रक पूल बनाएं',
      crowdChartTitle: 'आज यूपी की मंडियों में भीड़ (क्षमता का %)',
      poolsTitle: 'उपलब्ध साझा ट्रक (सीट बुक करें)',
      reserveSlot: 'जगह बुक करें',
      joinedLabel: 'बुक हो गया',
    },
    voice: {
      title: 'बोलकर पूछें — व्हाट्सऐप और आवाज़ सलाहकार',
      subtitle: 'हिंदी, अवधी, भोजपुरी या अंग्रेज़ी में बोलकर या लिखकर पूछें और आवाज़ में जवाब सुनें।',
      askPlaceholder: 'अपना सवाल लिखें या माइक दबाकर बोलें...',
      sendBtn: 'भेजें',
      listenBtn: 'आवाज़ में सुनें',
      tapToAsk: 'सीधे पूछने के लिए दबाएं',
    },
    community: {
      title: 'किसान चौपाल — आपसी बातचीत व सलाह',
      subtitle: 'किसान भाइयों से मंडी भाव, खेती और भंडारण के अनुभव बांटें। ठगी रोकने के लिए मॉडरेशन सक्रिय है।',
      newPost: 'नई पोस्ट लिखें',
      modDesk: 'मॉडरेटर जांच',
      helpful: 'उपयोगी',
      comments: 'टिप्पणियां',
      report: 'रिपोर्ट करें',
    },
    map: {
      title: 'मंडी नक्शा, रास्ता और नज़दीकी कोल्ड स्टोर',
      subtitle: 'एक क्लिक में अपनी सबसे फायदेमंद मंडी का रास्ता, समय और पास के कोल्ड स्टोर देखें।',
      findMandis: 'पास की मंडियां खोजें',
      findColdStores: 'पास के कोल्ड स्टोर',
      findKvk: 'कृषि केंद्र / खाद-बीज',
      routeToBest: 'सबसे फायदेमंद मंडी का रास्ता',
      openGoogleMaps: 'Google Maps में रास्ता खोलें',
      liveMapsBrief: 'आस-पास की मंडी सलाह (AI Maps)',
    },
    chatbot: {
      title: 'मंडीमित्र AI मददगार',
      greeting: 'नमस्ते किसान भाई! मंडी भाव, फसल की नमी, कोल्ड स्टोर, MSP या खेती से जुड़ा कोई भी सवाल यहाँ पूछें।',
      placeholder: 'कोई भी सवाल यहाँ लिखें...',
      openAria: 'मंडीमित्र AI मददगार खोलें',
      closeAria: 'मंडीमित्र AI मददगार बंद करें',
    },
  },
  awadhi: {
    languageName: 'अवधी',
    nav: {
      home: 'मुख्य पेज',
      profit: 'असली कमाई',
      map: 'मंडी नक्शा',
      forecast: 'भाव के हाल',
      pools: 'साझा ट्रक',
      voice: 'बोलिके पूछीं',
      community: 'किसान चौपाल',
      voiceCta: 'आवाज़ सलाह',
      backToHome: 'मुख्य डैशबोर्ड पर लौटौ',
    },
    dashboard: {
      headline: 'आज तोहरे फसल खातिर सही फैसला',
      subline: 'बड़ा बटन दबावै — खेत या मंडी से आसानी से मंडी भाव अउर सलाह जानौ।',
      chooseAction: 'का देखब चाहत हौ? एक कार्ड पर टैप करौ',
      quickCropLabel: 'फसल बदलौ:',
      openTool: 'खोलौ',
      cards: {
        profitTitle: 'असली कमाई जानौ',
        profitDesc: 'भाड़ा अउर कमीशन काट के हाथ मा आवे वाला सबसे जादा पैसा जानौ।',
        forecastTitle: 'बाजार ट्रेंड अउर MSP देखौ',
        forecastDesc: 'आवे वाले 15 दिन के भाव, कोल्ड स्टोर किराया अउर सरकारी MSP देखौ।',
        mapTitle: 'मंडी नक्शा अउर रास्ता',
        mapDesc: 'सबसे बढ़िया मंडी के रास्ता, दूरी अउर पास के कोल्ड स्टोर नक्शा मा देखौ।',
        poolsTitle: 'साझा ट्रक अउर भीड़ खबर',
        poolsDesc: 'भीड़ वाली मंडी से बचौ अउर किसानन संग ट्रक बांट के भाड़ा आधा करौ।',
        voiceTitle: 'बोलिके सलाह लेवौ',
        voiceDesc: 'अवधी या हिंदी मा बोलके सवाल पूछौ अउर आवाज़ मा जवाब सुनौ।',
        communityTitle: 'किसान चौपाल',
        communityDesc: 'किसान भाइयन से मंडी भाव, कोल्ड स्टोर अउर खेती के बात बांटौ।',
      },
    },
    locationBar: {
      homeLocation: 'तोहार जिला',
      useGps: 'हमारी जगह पहचानौ',
      detectingGps: 'खोजत हन...',
      autoRegion: 'इलाका के बोली (Auto)',
      languageLabel: 'बोली',
      gpsMatched: 'जगह के हिसाब से जिला अउर बोली चुन लिहिन',
      gpsOutsideUp: 'तुम यूपी से बाहर हौ — नज़दीकी यूपी जिला चुना गा',
      gpsDenied: 'लोकेशन नाहीं मिला — ऊपर से आपन जिला चुन लियो',
    },
    profit: {
      title: 'कौन मंडी मा मिलै सबसे जादा कमाई?',
      subtitle: 'आपन फसल अउर क्वालिटी बतावौ — भाड़ा अउर कमीशन काट के हाथ मा आवे वाला सही पैसा जानौ।',
      step1Title: '1. फसल अउर वजन चुनौ',
      step2Title: '2. तोहार फसल कैसी बा? (क्वालिटी)',
      step3Title: '3. सबसे बढ़िया मंडी (हाथ मा कमाई)',
      quantityLabel: 'केतना क्विंटल?',
      vehicleLabel: 'कवन गाड़ी?',
      qualityGood: 'बढ़िया अउर सूखी',
      qualityGoodSub: 'मोट दाना, कम नमी (+दाम)',
      qualityNormal: 'सामान्य (ठीक)',
      qualityNormalSub: 'साधारण मंडी भाव',
      qualityWeak: 'गीली या दागी',
      qualityWeakSub: 'नमी जादा या दाग बा',
      moreQualityBtn: 'नमी, दाना अउर फोटो जांच खोलौ',
      hideQualityBtn: 'विस्तृत जांच बंद करौ',
      photoCheckBtn: 'फोटो से फसल जांचौ',
      fairRateLabel: 'तोहरे फसल के सही दाम',
      bestMandiLabel: 'सबसे जादा फायदा वाली मंडी',
      cashInHandLabel: 'हाथ मा शुद्ध कमाई',
      perQuintalNet: 'प्रति क्विंटल शुद्ध',
      deductionsLabel: 'भाड़ा अउर मंडी खर्च',
      extraVsLocal: 'पास की मंडी से जादा',
      mspRateLabel: 'सरकारी MSP दाम',
      showAllMandis: 'सब 8 मंडी देखौ',
      showTopMandis: 'केवल टॉप 3 मंडी देखौ',
      copySlip: 'दाम पर्ची कॉपी करौ',
      copiedSlip: 'पर्ची कॉपी होई गै',
      checkSellOrWait: 'आज बेचीं कि रोकीं?',
      tableMandi: 'मंडी के नाम',
      tableDist: 'दूरी',
      tableRate: 'सही दाम',
      tableCosts: 'कुल खर्च',
      tableCrowd: 'भीड़ / आवक',
      tableProfit: 'शुद्ध कमाई',
      sharedTruckPrompt: 'साझा ट्रक मिलत बा — भाड़ा बचावै',
      viewPoolBtn: 'ट्रक देखौ',
    },
    forecast: {
      title: 'आज बेचीं कि कुछ दिन रोकीं? + सरकारी MSP',
      subtitle: 'आवे वाले 15 दिन के भाव, कोल्ड स्टोर के किराया अउर मौसम देख के सही फैसला करौ।',
      sellNowBadge: 'सलाह · आज बेचब ठीक रही',
      holdBadge: 'सलाह · कुछ दिन रोक के बेचौ',
      coldStore: 'कोल्ड स्टोर',
      farmShed: 'घर या गोदाम',
      holdSlider: 'केतना दिन रोकीं?',
      weatherTitle: '7 दिन के मौसम खबर',
      mspTitle: 'यूपी सरकारी MSP योजना',
    },
    pools: {
      title: 'मंडी के भीड़ अउर साझा ट्रक',
      subtitle: 'भीड़ वाली मंडी से बचौ अउर आस-पास के किसानन संग ट्रक बांट के भाड़ा कम करौ।',
      startPool: 'नवा ट्रक पूल बनावौ',
      crowdChartTitle: 'आज यूपी की मंडी मा भीड़ (%)',
      poolsTitle: 'खाली साझा ट्रक (जगह बुक करौ)',
      reserveSlot: 'जगह बुक करौ',
      joinedLabel: 'बुक होई गा',
    },
    voice: {
      title: 'बोलिके पूछीं — व्हाट्सऐप अउर आवाज़ सलाह',
      subtitle: 'अवधी, हिंदी, भोजपुरी या अंग्रेज़ी मा पूछौ अउर सीधे आवाज़ मा जवाब सुनौ।',
      askPlaceholder: 'आपन सवाल लिखौ या माइक दबा के बोलौ...',
      sendBtn: 'भेजौ',
      listenBtn: 'आवाज़ मा सुनौ',
      tapToAsk: 'सीधे पूछे खातिर दबावै',
    },
    community: {
      title: 'किसान चौपाल — आपस के बातचीत',
      subtitle: 'किसान भाइयन से मंडी भाव अउर खेती के बात बांटौ। ठगी रोके खातिर मॉडरेशन चालू बा।',
      newPost: 'नवा बात लिखौ',
      modDesk: 'मॉडरेटर जांच',
      helpful: 'काम के बात',
      comments: 'जवाब',
      report: 'शिकायत करौ',
    },
    map: {
      title: 'मंडी के नक्शा, रास्ता अउर पास के कोल्ड स्टोर',
      subtitle: 'एक बटन दबा के सबसे बढ़िया मंडी के रास्ता, दूरी अउर नज़दीकी कोल्ड स्टोर देखौ।',
      findMandis: 'पास की मंडी खोजौ',
      findColdStores: 'पास के कोल्ड स्टोर',
      findKvk: 'कृषि केंद्र / बीज दुकान',
      routeToBest: 'सबसे बढ़िया मंडी के रास्ता',
      openGoogleMaps: 'Google Maps मा खोलौ',
      liveMapsBrief: 'आस-पास की मंडी सलाह (AI Maps)',
    },
    chatbot: {
      title: 'मंडीमित्र AI मददगार',
      greeting: 'राम-राम किसान भैया! मंडी भाव, फसल के नमी, कोल्ड स्टोर या MSP से जुड़ल कउनो सवाल यहाँ पूछ सकत हौ।',
      placeholder: 'कउनो सवाल यहाँ लिखौ...',
      openAria: 'मंडीमित्र AI मददगार खोलौ',
      closeAria: 'मंडीमित्र AI मददगार बंद करौ',
    },
  },
  bhojpuri: {
    languageName: 'भोजपुरी',
    nav: {
      home: 'मुख्य पेज',
      profit: 'असली कमाई',
      map: 'मंडी नक्शा',
      forecast: 'बाजार ट्रेंड',
      pools: 'साझा ट्रक',
      voice: 'बोलके पूछीं',
      community: 'किसान चौपाल',
      voiceCta: 'आवाज़ सलाह',
      backToHome: 'मुख्य डैशबोर्ड प लउटीं',
    },
    dashboard: {
      headline: 'आज राउर फसल खातिर सही फैसला',
      subline: 'बड़ बटन दबाईं — खेत भा मंडी से आसानी से सही भाव आ सलाह जानीं।',
      chooseAction: 'का देखल चाहत बानी? कवनो एक कार्ड प टैप करीं',
      quickCropLabel: 'फसल बदलीं:',
      openTool: 'खोलीं',
      cards: {
        profitTitle: 'असली कमाई जानीं',
        profitDesc: 'भाड़ा आ कमीशन काट के हाथ में आवे वाला सबसे बेसी पइसा देखीं।',
        forecastTitle: 'बाजार ट्रेंड आ MSP देखीं',
        forecastDesc: 'अगिला 15 दिन के भाव अनुमान, कोल्ड स्टोर खरच आ सरकारी MSP देखीं।',
        mapTitle: 'मंडी नक्शा आ रास्ता',
        mapDesc: 'सबसे बढ़िया मंडी के रास्ता, दूरी आ लगले के कोल्ड स्टोर नक्शा प देखीं।',
        poolsTitle: 'साझा ट्रक आ भीड़ अलर्ट',
        poolsDesc: 'भीड़ वाला मंडी से बचीं आ लगले किसानन संगे ट्रक बांट के भाड़ा बचाईं।',
        voiceTitle: 'बोलके सलाह लीं',
        voiceDesc: 'भोजपुरी भा हिंदी में बोलके सवाल पूछीं आ आवाज़ में जवाब सुनीं।',
        communityTitle: 'किसान चौपाल',
        communityDesc: 'किसान भाई लोग संगे मंडी भाव, भंडारण आ खेती के अनुभव बांटीं।',
      },
    },
    locationBar: {
      homeLocation: 'राउर जिला',
      useGps: 'हमर लोकेशन पकड़ीं',
      detectingGps: 'खोजल जाता...',
      autoRegion: 'इलाका के भाषा (Auto)',
      languageLabel: 'भाषा',
      gpsMatched: 'लोकेशन से जिला आ भोजपुरी भाषा चुन लिहल गइल',
      gpsOutsideUp: 'रउआ यूपी से बाहर बानी — नज़दीकी यूपी जिला चुनल गइल',
      gpsDenied: 'लोकेशन ना मिलल — ऊपर से आपन जिला चुन लीं',
    },
    profit: {
      title: 'कवन मंडी में मिली सबसे बेसी कमाई?',
      subtitle: 'आपन फसल आ क्वालिटी चुनीं — भाड़ा आ कमीशन काट के हाथ में आवे वाला असली पइसा जानीं।',
      step1Title: '1. फसल आ वजन चुनीं',
      step2Title: '2. राउर फसल कइसन बा? (क्वालिटी)',
      step3Title: '3. सबसे बढ़िया मंडी (राउर हाथ में पइसा)',
      quantityLabel: 'केतना क्विंटल?',
      vehicleLabel: 'कवन गाड़ी?',
      qualityGood: 'बढ़िया आ सूखल',
      qualityGoodSub: 'मोट दाना, कम नमी (+भाव)',
      qualityNormal: 'सामान्य (ठीक)',
      qualityNormalSub: 'मंडी के साधारण भाव',
      qualityWeak: 'गील भा दागी',
      qualityWeakSub: 'नमी बेसी भा दाग बा',
      moreQualityBtn: 'नमी, दाना आ फोटो जांच खोलीं',
      hideQualityBtn: 'विस्तृत जांच बंद करीं',
      photoCheckBtn: 'फोटो से फसल जांचीं',
      fairRateLabel: 'राउर फसल के सही भाव',
      bestMandiLabel: 'सबसे बेसी फायदा वाला मंडी',
      cashInHandLabel: 'हाथ में शुद्ध कमाई',
      perQuintalNet: 'प्रति क्विंटल शुद्ध',
      deductionsLabel: 'भाड़ा आ मंडी खरच',
      extraVsLocal: 'लगले मंडी से बेसी',
      mspRateLabel: 'सरकारी MSP भाव',
      showAllMandis: 'सब 8 मंडी देखीं',
      showTopMandis: 'खाली टॉप 3 मंडी देखीं',
      copySlip: 'भाव पर्ची कॉपी करीं',
      copiedSlip: 'पर्ची कॉपी हो गइल',
      checkSellOrWait: 'आज बेचीं कि रुकीं?',
      tableMandi: 'मंडी के नाम',
      tableDist: 'दूरी',
      tableRate: 'सही भाव',
      tableCosts: 'कुल खरच',
      tableCrowd: 'भीड़ / आवक',
      tableProfit: 'शुद्ध कमाई',
      sharedTruckPrompt: 'साझा ट्रक मिलत बा — भाड़ा बचाईं',
      viewPoolBtn: 'ट्रक देखीं',
    },
    forecast: {
      title: 'आज बेचीं कि कुछ दिन रुकीं? + सरकारी MSP',
      subtitle: 'अगिला 15 दिन के भाव, कोल्ड स्टोर किराया आ मौसम देख के सही दिन चुनीं।',
      sellNowBadge: 'सलाह · आज बेचल ठीक रही',
      holdBadge: 'सलाह · कुछ दिन रुक के बेचीं',
      coldStore: 'कोल्ड स्टोर',
      farmShed: 'गोदाम / घर प',
      holdSlider: 'केतना दिन रुकीं?',
      weatherTitle: '7 दिन के मौसम अलर्ट',
      mspTitle: 'यूपी सरकारी MSP योजना',
    },
    pools: {
      title: 'मंडी के भीड़ आ साझा ट्रक पूल',
      subtitle: 'भीड़ वाला मंडी से बचीं आ लगले के किसान लोग संगे ट्रक बांट के भाड़ा कम करीं।',
      startPool: 'नया ट्रक पूल बनाईं',
      crowdChartTitle: 'आज यूपी मंडी में भीड़ (%)',
      poolsTitle: 'उपलब्ध साझा ट्रक (सीट बुक करीं)',
      reserveSlot: 'जगह बुक करीं',
      joinedLabel: 'बुक हो गइल',
    },
    voice: {
      title: 'बोलके पूछीं — व्हाट्सऐप आ आवाज़ सलाहकार',
      subtitle: 'भोजपुरी, हिंदी, अवधी भा अंग्रेज़ी में बोलके पूछीं आ आवाज़ में जवाब सुनीं।',
      askPlaceholder: 'आपन सवाल लिखीं भा माइक दबा के बोलीं...',
      sendBtn: 'भेजीं',
      listenBtn: 'आवाज़ में सुनीं',
      tapToAsk: 'सीधे पूछे खातिर दबाईं',
    },
    community: {
      title: 'किसान चौपाल — आपसी बातचीत',
      subtitle: 'किसान भाई लोग से मंडी भाव आ खेती के अनुभव बांटीं। ठगी रोके खातिर मॉडरेशन चालू बा।',
      newPost: 'नया पोस्ट लिखीं',
      modDesk: 'मॉडरेटर जांच',
      helpful: 'काम के बात',
      comments: 'जवाब',
      report: 'रिपोर्ट करीं',
    },
    map: {
      title: 'मंडी के नक्शा, रास्ता आ लगले कोल्ड स्टोर',
      subtitle: 'एक क्लिक में सबसे बढ़िया मंडी के रास्ता, दूरी आ लगले के कोल्ड स्टोर देखीं।',
      findMandis: 'लगले मंडी खोजीं',
      findColdStores: 'लगले कोल्ड स्टोर',
      findKvk: 'कृषि केंद्र / खाद-बीज',
      routeToBest: 'सबसे बढ़िया मंडी के रास्ता',
      openGoogleMaps: 'Google Maps में खोलीं',
      liveMapsBrief: 'आस-पास के मंडी सलाह (AI Maps)',
    },
    chatbot: {
      title: 'मंडीमित्र AI मददगार',
      greeting: 'प्रणाम किसान भाई! मंडी भाव, फसल के नमी, कोल्ड स्टोर भा MSP से जुड़ल कवनो सवाल इहाँ पूछीं।',
      placeholder: 'कवनो सवाल इहाँ लिखीं...',
      openAria: 'मंडीमित्र AI मददगार खोलीं',
      closeAria: 'मंडीमित्र AI मददगार बंद करीं',
    },
  },
  en: {
    languageName: 'English',
    nav: {
      home: 'Dashboard',
      profit: 'Check Profit',
      map: 'Mandi Map',
      forecast: 'Market Trends',
      pools: 'Truck Pools',
      voice: 'Voice Advisor',
      community: 'Community',
      voiceCta: 'Ask by Voice',
      backToHome: 'Back to Dashboard',
    },
    dashboard: {
      headline: 'Clear Mandi Decisions, Built for the Field',
      subline: 'Large, high-contrast action cards so you can check profit, trends, routes, and voice advice in bright daylight.',
      chooseAction: 'Tap an action card to open',
      quickCropLabel: 'Switch crop:',
      openTool: 'Open',
      cards: {
        profitTitle: 'Check Profit',
        profitDesc: 'Compare real take-home cash across UP mandis after fuel, tolls, fees, and crop grade.',
        forecastTitle: 'View Market Trends',
        forecastDesc: 'See 15-day price forecasts, cold storage costs, weather alerts, and UP MSP rates.',
        mapTitle: 'Mandi Map & Routes',
        mapDesc: 'View driving routes, travel time, and verified nearby mandis & cold storages.',
        poolsTitle: 'Share a Truck',
        poolsDesc: 'Avoid overcrowded yards and split freight space with nearby farmers.',
        voiceTitle: 'Ask by Voice',
        voiceDesc: 'Speak in Hindi, Awadhi, Bhojpuri, or English and hear instant IVR advice.',
        communityTitle: 'Farmer Community',
        communityDesc: 'Share mandi rates, storage tips, and crop advice with UP farmers.',
      },
    },
    locationBar: {
      homeLocation: 'Home District',
      useGps: 'Use Current GPS',
      detectingGps: 'Locating...',
      autoRegion: 'Auto by Region',
      languageLabel: 'Language',
      gpsMatched: 'Matched district & regional language from your location',
      gpsOutsideUp: 'Outside UP — selected nearest UP mandi district',
      gpsDenied: 'Location permission blocked — pick your home district instead',
    },
    profit: {
      title: 'Where Will You Earn the Most Cash?',
      subtitle: 'Pick your crop and quality — see actual take-home profit after transport fuel, tolls, and mandi fees.',
      step1Title: '1. Select Crop & Quantity',
      step2Title: '2. How Is Your Crop Quality?',
      step3Title: '3. Best Mandi for Take-Home Profit',
      quantityLabel: 'Quantity (Quintals)',
      vehicleLabel: 'Transport Vehicle',
      qualityGood: 'Best / Dry',
      qualityGoodSub: 'Bold size, low moisture (+Rate)',
      qualityNormal: 'Normal (FAQ)',
      qualityNormalSub: 'Standard mandi average',
      qualityWeak: 'Wet / Damaged',
      qualityWeakSub: 'High moisture or blemishes',
      moreQualityBtn: 'Adjust exact moisture, damage & photo',
      hideQualityBtn: 'Hide detailed quality controls',
      photoCheckBtn: 'Inspect Crop Photo',
      fairRateLabel: 'Your Fair Gate Price',
      bestMandiLabel: 'Highest Take-Home Mandi',
      cashInHandLabel: 'Take-Home Cash',
      perQuintalNet: 'net per quintal',
      deductionsLabel: 'Fuel & Mandi Costs',
      extraVsLocal: 'Extra vs. Home Mandi',
      mspRateLabel: 'UP Govt MSP / Floor',
      showAllMandis: 'Compare all 8 mandis',
      showTopMandis: 'Show top 3 mandis only',
      copySlip: 'Copy Fair Price Slip',
      copiedSlip: 'Slip Copied',
      checkSellOrWait: 'Sell Today or Hold?',
      tableMandi: 'Mandi',
      tableDist: 'Distance',
      tableRate: 'Fair Rate',
      tableCosts: 'Total Costs',
      tableCrowd: 'Yard Crowd',
      tableProfit: 'Take-Home',
      sharedTruckPrompt: 'Shared truck available — save freight',
      viewPoolBtn: 'View Pool',
    },
    forecast: {
      title: 'Sell Today or Hold? + UP MSP Schemes',
      subtitle: 'Compare 15-day price trends against storage fees, weather spoilage risk, and government MSP rates.',
      sellNowBadge: 'Advice · Sell Today',
      holdBadge: 'Advice · Store & Hold',
      coldStore: 'Cold Storage',
      farmShed: 'PACS / Farm Shed',
      holdSlider: 'Hold Duration',
      weatherTitle: '7-Day Weather Alert',
      mspTitle: 'UP Govt MSP & Schemes',
    },
    pools: {
      title: 'Mandi Crowd Alerts & Shared Truck Pools',
      subtitle: 'Skip overcrowded yards and split truck space with nearby farmers to cut freight costs.',
      startPool: 'Start Truck Pool',
      crowdChartTitle: 'Today’s Mandi Yard Crowd (% of Capacity)',
      poolsTitle: 'Active Shared Truck Pools',
      reserveSlot: 'Reserve Slot',
      joinedLabel: 'Reserved',
    },
    voice: {
      title: 'Regional Voice & WhatsApp Mandi Advisor',
      subtitle: 'Ask by voice or text in Hindi, Awadhi, Bhojpuri, or English and listen to the IVR answer.',
      askPlaceholder: 'Type your question or tap mic to speak...',
      sendBtn: 'Send',
      listenBtn: 'Listen (IVR Audio)',
      tapToAsk: 'Tap a quick question',
    },
    community: {
      title: 'Kisan Chaupal — Farmer Community',
      subtitle: 'Discuss mandi rates, crop care, and storage tips with UP farmers. Protected by scam moderation.',
      newPost: 'New Post',
      modDesk: 'Moderator Desk',
      helpful: 'Helpful',
      comments: 'Comments',
      report: 'Report',
    },
    map: {
      title: 'Live Mandi Map, Routes & Nearby Cold Stores',
      subtitle: 'See your best mandi driving route, travel time, and real nearby cold storages in one tap.',
      findMandis: 'Find Nearby Mandis',
      findColdStores: 'Nearby Cold Stores',
      findKvk: 'Agri / KVK Centers',
      routeToBest: 'Route to Best Mandi',
      openGoogleMaps: 'Open in Google Maps',
      liveMapsBrief: 'AI Nearby Places Guide (Maps)',
    },
    chatbot: {
      title: 'MandiMitra AI Help',
      greeting: 'Namaste! Ask me anything about mandi prices, crop moisture, storage, UP MSP, or farming in Hindi, Awadhi, Bhojpuri, or English.',
      placeholder: 'Ask anything here...',
      openAria: 'Open MandiMitra AI Chatbot',
      closeAria: 'Close MandiMitra AI Chatbot',
    },
  },
};
