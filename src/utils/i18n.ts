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
    eyebrow: string;
    title: string;
    subtitle: string;
    newPost: string;
    closeComposer: string;
    modDesk: string;
    helpful: string;
    commentSingular: string;
    comments: string;
    report: string;
    verifiedBadge: string;
    lockedBadge: string;
    hiddenBadge: string;
    searchPlaceholder: string;
    sortNewest: string;
    sortHelpful: string;
    emptyState: string;
    resetFilters: string;
    noCommentsYet: string;
    commentsLockedNotice: string;
    yourNamePlaceholder: string;
    replyPlaceholder: string;
    replyBtn: string;
    composerTitle: string;
    composerGuardNote: string;
    fieldName: string;
    fieldDistrict: string;
    fieldCategory: string;
    fieldCrop: string;
    generalFarming: string;
    fieldHeadline: string;
    fieldHeadlinePlaceholder: string;
    fieldDetails: string;
    fieldDetailsPlaceholder: string;
    cancelBtn: string;
    publishBtn: string;
    errFillRequired: string;
    errEmptyComment: string;
    errModGuardPrefix: string;
    modQueueTitle: string;
    modQueueSubtitle: string;
    modAllClear: string;
    modApprove: string;
    modRestore: string;
    modRemoveHide: string;
    modPin: string;
    modUnpin: string;
    modLock: string;
    modUnlock: string;
    modHide: string;
    reportModalTitle: string;
    reportFlagging: string;
    reportReasonLegend: string;
    reportSubmitBtn: string;
    reportReasons: [string, string, string, string];
    categories: {
      All: string;
      'Market Rates': string;
      'Crop Care': string;
      'Storage & Cold Store': string;
      'MSP & Schemes': string;
      Transport: string;
    };
  };
  alerts: {
    buttonLabel: string;
    modalTitle: string;
    modalSubtitle: string;
    browserNotifEnable: string;
    browserNotifGranted: string;
    browserNotifDenied: string;
    browserNotifUnsupported: string;
    createTitle: string;
    cropLabel: string;
    directionLabel: string;
    aboveLabel: string;
    belowLabel: string;
    thresholdLabel: string;
    preferredMandisLabel: string;
    saveAlertBtn: string;
    checkLiveNowBtn: string;
    simulateSurgeBtn: string;
    activeRulesTitle: string;
    noRulesText: string;
    historyTitle: string;
    noHistoryText: string;
    markAllRead: string;
    clearHistory: string;
    deleteRule: string;
    currentRateLabel: string;
    dismissToast: string;
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
    liveDataLabel: string;
    autoLabel: string;
    searchLabel: string;
    mapsLabel: string;
    thinkingLabel: string;
    checkingMapsLabel: string;
    retryBtn: string;
    webSourcesLabel: string;
    mapsSourcesLabel: string;
    timeoutError: string;
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
      eyebrow: 'किसान चौपाल · यूपी के किसानों की भरोसेमंद चर्चा और ठगी-सुरक्षा',
      title: 'किसान चौपाल — आपसी बातचीत व सलाह',
      subtitle: 'किसान भाइयों से मंडी भाव, खेती और भंडारण के अनुभव बांटें। ठगी रोकने के लिए मॉडरेशन सक्रिय है।',
      newPost: 'नई पोस्ट लिखें',
      closeComposer: 'बंद करें',
      modDesk: 'मॉडरेटर जांच',
      helpful: 'उपयोगी',
      commentSingular: 'टिप्पणी',
      comments: 'टिप्पणियां',
      report: 'रिपोर्ट करें',
      verifiedBadge: 'सत्यापित सलाह',
      lockedBadge: 'टिप्पणी बंद',
      hiddenBadge: 'मॉडरेटर द्वारा छिपाई गई',
      searchPlaceholder: 'फसल, मंडी या विषय खोजें...',
      sortNewest: 'सबसे नई',
      sortHelpful: 'सबसे उपयोगी',
      emptyState: 'आपकी खोज या श्रेणी से मेल खाने वाली कोई चर्चा नहीं मिली।',
      resetFilters: 'फिल्टर हटाएं',
      noCommentsYet: 'अभी कोई टिप्पणी नहीं है। अपना अनुभव या सवाल लिखें।',
      commentsLockedNotice: 'इस चर्चा पर मॉडरेटर ने नई टिप्पणियां बंद कर दी हैं।',
      yourNamePlaceholder: 'आपका नाम',
      replyPlaceholder: 'अपनी सलाह या मंडी का ताजा हाल लिखें...',
      replyBtn: 'जवाब भेजें',
      composerTitle: 'किसान चौपाल पर नई चर्चा शुरू करें',
      composerGuardNote: 'स्वचालित ठगी-रोकथाम और शालीन भाषा जांच सक्रिय है',
      fieldName: 'आपका नाम',
      fieldDistrict: 'जिला',
      fieldCategory: 'विषय चुनें',
      fieldCrop: 'संबंधित फसल',
      generalFarming: 'सामान्य खेती',
      fieldHeadline: 'शीर्षक',
      fieldHeadlinePlaceholder: 'जैसे: सिकंदरा मंडी आगरा में आज चिप्सोना आलू का सुबह का भाव',
      fieldDetails: 'पूरा विवरण (मंडी भाव, नमी का अनुभव, भंडारण या खेती की टिप)',
      fieldDetailsPlaceholder: 'किसान भाइयों के काम आने वाली सही और सच्ची जानकारी लिखें...',
      cancelBtn: 'रद्द करें',
      publishBtn: 'पोस्ट प्रकाशित करें',
      errFillRequired: 'कृपया अपना नाम, शीर्षक और पूरा विवरण भरें।',
      errEmptyComment: 'कृपया पोस्ट करने से पहले अपनी टिप्पणी लिखें।',
      errModGuardPrefix: 'मॉडरेशन सुरक्षा ने यह संदेश रोका:',
      modQueueTitle: 'सामुदायिक मॉडरेशन जांच सूची',
      modQueueSubtitle: 'संदिग्ध ठगी पोस्ट और किसान रिपोर्ट की समीक्षा करें। आप नीचे किसी भी पोस्ट को पिन, लॉक या छिपा सकते हैं।',
      modAllClear: 'सब ठीक है — जांच सूची में कोई संदिग्ध या रिपोर्ट की गई पोस्ट नहीं है।',
      modApprove: 'स्वीकृत करें व दिखाएं',
      modRestore: 'वापस दिखाएं',
      modRemoveHide: 'हटाएं / छिपाएं',
      modPin: 'पिन करें',
      modUnpin: 'पिन हटाएं',
      modLock: 'लॉक करें',
      modUnlock: 'अनलॉक करें',
      modHide: 'छिपाएं',
      reportModalTitle: 'मॉडरेटर को रिपोर्ट करें',
      reportFlagging: 'रिपोर्ट किया जा रहा है:',
      reportReasonLegend: 'रिपोर्ट करने का कारण चुनें',
      reportSubmitBtn: 'रिपोर्ट भेजें',
      reportReasons: [
        'बिचौलिया ठगी / एडवांस फीस या OTP मांगना',
        'अभद्र या अपमानजनक भाषा',
        'गलत मंडी भाव या भ्रामक MSP जानकारी',
        'स्पैम या अनचाहा प्रचार',
      ],
      categories: {
        All: 'सभी',
        'Market Rates': 'मंडी भाव',
        'Crop Care': 'फसल देखभाल',
        'Storage & Cold Store': 'भंडारण व कोल्ड स्टोर',
        'MSP & Schemes': 'MSP और योजनाएं',
        Transport: 'परिवहन / ट्रक',
      },
    },
    alerts: {
      buttonLabel: 'भाव अलर्ट',
      modalTitle: 'मंडी भाव नोटिफिकेशन अलर्ट',
      modalSubtitle: 'अपनी पसंदीदा मंडियों में तय भाव पार होते ही तुरंत स्थानीय अलर्ट पाएं।',
      browserNotifEnable: 'फोन/ब्राउज़र अलर्ट चालू करें',
      browserNotifGranted: 'ब्राउज़र नोटिफिकेशन चालू है',
      browserNotifDenied: 'ब्राउज़र नोटिफिकेशन बंद है (ऐप के अंदर अलर्ट दिखेंगे)',
      browserNotifUnsupported: 'ऐप के अंदर तुरंत अलर्ट सक्रिय हैं',
      createTitle: 'नया भाव अलर्ट बनाएं',
      cropLabel: 'फसल चुनें',
      directionLabel: 'कब अलर्ट मिले?',
      aboveLabel: 'भाव ऊपर जाए (≥)',
      belowLabel: 'भाव नीचे आए (≤)',
      thresholdLabel: 'लक्ष्य भाव (₹ / क्विंटल)',
      preferredMandisLabel: 'पसंदीदा मंडियां चुनें',
      saveAlertBtn: 'अलर्ट सेव करें',
      checkLiveNowBtn: 'ताजा भाव अभी जांचें',
      simulateSurgeBtn: 'भाव बढ़ोतरी (+₹100) जांचें',
      activeRulesTitle: 'सक्रिय भाव अलर्ट नियम',
      noRulesText: 'अभी कोई भाव अलर्ट नहीं बना है। ऊपर से अपनी पसंदीदा मंडी का लक्ष्य भाव सेट करें।',
      historyTitle: 'आए हुए नोटिफिकेशन',
      noHistoryText: 'अभी कोई अलर्ट ट्रिगर नहीं हुआ है। लक्ष्य भाव पार होते ही यहाँ सूचना दिखेगी।',
      markAllRead: 'सभी पढ़ा हुआ चिह्नित करें',
      clearHistory: 'साफ करें',
      deleteRule: 'हटाएं',
      currentRateLabel: 'मौजूदा भाव',
      dismissToast: 'बंद करें',
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
      liveDataLabel: 'लाइव डेटा:',
      autoLabel: 'ऑटो',
      searchLabel: 'सर्च',
      mapsLabel: 'नक्शा',
      thinkingLabel: 'मंडी डेटा जांच रहे हैं...',
      checkingMapsLabel: 'Google Maps जांच रहे हैं...',
      retryBtn: 'फिर कोशिश करें',
      webSourcesLabel: 'वेब स्रोत:',
      mapsSourcesLabel: 'Google Maps स्थान:',
      timeoutError: 'जवाब आने में अधिक समय लग गया। कृपया दोबारा कोशिश करें।',
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
      eyebrow: 'किसान चौपाल · यूपी के किसानन के भरोसेमंद बातचीत अउर ठगी से बचाव',
      title: 'किसान चौपाल — आपस के बातचीत',
      subtitle: 'किसान भाइयन से मंडी भाव अउर खेती के बात बांटौ। ठगी रोके खातिर मॉडरेशन चालू बा।',
      newPost: 'नवा बात लिखौ',
      closeComposer: 'बंद करौ',
      modDesk: 'मॉडरेटर जांच',
      helpful: 'काम के बात',
      commentSingular: 'जवाब',
      comments: 'जवाब',
      report: 'शिकायत करौ',
      verifiedBadge: 'सत्यापित सलाह',
      lockedBadge: 'जवाब बंद बा',
      hiddenBadge: 'मॉडरेटर द्वारा छिपावल गा',
      searchPlaceholder: 'फसल, मंडी या विषय खोजौ...',
      sortNewest: 'सबसे नवा',
      sortHelpful: 'सबसे काम के',
      emptyState: 'तोहरे खोज से मिलत कउनो पोस्ट नाहीं मिलल।',
      resetFilters: 'फिल्टर हटावौ',
      noCommentsYet: 'अभी कउनो जवाब नाहीं बा। आपन अनुभव लिखौ।',
      commentsLockedNotice: 'ई चर्चा पर मॉडरेटर नवा जवाब बंद कइ दिहिन हन।',
      yourNamePlaceholder: 'तोहार नाम',
      replyPlaceholder: 'आपन जवाब या मंडी के हाल लिखौ...',
      replyBtn: 'जवाब भेजौ',
      composerTitle: 'किसान चौपाल पर नवा चर्चा शुरू करौ',
      composerGuardNote: 'ठगी रोके अउर सही भाषा के जांच चालू बा',
      fieldName: 'तोहार नाम',
      fieldDistrict: 'जिला',
      fieldCategory: 'विषय चुनौ',
      fieldCrop: 'फसल',
      generalFarming: 'साधारण खेती',
      fieldHeadline: 'शीर्षक',
      fieldHeadlinePlaceholder: 'जैसे: दुबग्गा मंडी मा आज सुबह के आलू के भाव',
      fieldDetails: 'पूरी बात (मंडी भाव, नमी, भंडारण या खेती के सलाह)',
      fieldDetailsPlaceholder: 'किसान भाइयन खातिर सच्ची अउर काम के बात लिखौ...',
      cancelBtn: 'रद्द करौ',
      publishBtn: 'पोस्ट डालौ',
      errFillRequired: 'कृपया आपन नाम, शीर्षक अउर पूरी बात लिखौ।',
      errEmptyComment: 'भेजे से पहिले कुछ लिखौ।',
      errModGuardPrefix: 'मॉडरेशन सुरक्षा ई बात रोक दिहिस:',
      modQueueTitle: 'मॉडरेशन जांच सूची',
      modQueueSubtitle: 'संदिग्ध ठगी पोस्ट अउर शिकायत देखौ। नीचे से कउनो पोस्ट पिन, लॉक या छिपाय सकत हौ।',
      modAllClear: 'सब ठीक बा — कउनो संदिग्ध पोस्ट बाकी नाहीं बा।',
      modApprove: 'पास करौ व दिखावौ',
      modRestore: 'फिर से दिखावौ',
      modRemoveHide: 'हटावौ / छिपावौ',
      modPin: 'पिन करौ',
      modUnpin: 'पिन हटावौ',
      modLock: 'लॉक करौ',
      modUnlock: 'खोलौ',
      modHide: 'छिपावौ',
      reportModalTitle: 'मॉडरेटर से शिकायत करौ',
      reportFlagging: 'शिकायत विषय:',
      reportReasonLegend: 'शिकायत के कारण चुनौ',
      reportSubmitBtn: 'शिकायत भेजौ',
      reportReasons: [
        'बिचौलिया ठगी / एडवांस पैसा या OTP मांगब',
        'गलत या खराब भाषा',
        'झूठा मंडी भाव या गलत MSP खबर',
        'फालतू प्रचार / स्पैम',
      ],
      categories: {
        All: 'सब',
        'Market Rates': 'मंडी भाव',
        'Crop Care': 'फसल देखभाल',
        'Storage & Cold Store': 'कोल्ड स्टोर व भंडारण',
        'MSP & Schemes': 'MSP अउर योजना',
        Transport: 'ट्रक / भाड़ा',
      },
    },
    alerts: {
      buttonLabel: 'भाव अलर्ट',
      modalTitle: 'मंडी भाव नोटिफिकेशन अलर्ट',
      modalSubtitle: 'आपन पसंद के मंडी मा तय दाम पार होइत ही तुरंत सूचना पावौ।',
      browserNotifEnable: 'फोन/ब्राउज़र अलर्ट चालू करौ',
      browserNotifGranted: 'ब्राउज़र नोटिफिकेशन चालू बा',
      browserNotifDenied: 'ब्राउज़र अलर्ट बंद बा (ऐप मा सूचना दिखेगी)',
      browserNotifUnsupported: 'ऐप के अंदर तुरंत अलर्ट चालू बा',
      createTitle: 'नवा भाव अलर्ट बनावौ',
      cropLabel: 'फसल चुनौ',
      directionLabel: 'कब सूचना मिलै?',
      aboveLabel: 'भाव ऊपर जाय (≥)',
      belowLabel: 'भाव नीचे आवै (≤)',
      thresholdLabel: 'लक्ष्य दाम (₹ / क्विंटल)',
      preferredMandisLabel: 'पसंदीदा मंडी चुनौ',
      saveAlertBtn: 'अलर्ट सेव करौ',
      checkLiveNowBtn: 'ताजा भाव जांचौ',
      simulateSurgeBtn: 'भाव बढ़त (+₹100) जांचौ',
      activeRulesTitle: 'चालू भाव अलर्ट नियम',
      noRulesText: 'अभी कउनो अलर्ट नाहीं बना बा। ऊपर से आपन मंडी के लक्ष्य भाव सेट करौ।',
      historyTitle: 'आइल सूचनाएं',
      noHistoryText: 'अभी कउनो अलर्ट नाहीं आइल बा। भाव पार होइत ही यहाँ दिखै लागी।',
      markAllRead: 'सब पढ़ लिहिन',
      clearHistory: 'साफ करौ',
      deleteRule: 'हटावौ',
      currentRateLabel: 'मौजूदा भाव',
      dismissToast: 'बंद करौ',
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
      liveDataLabel: 'लाइव डेटा:',
      autoLabel: 'ऑटो',
      searchLabel: 'सर्च',
      mapsLabel: 'नक्शा',
      thinkingLabel: 'मंडी डेटा जांचत हन...',
      checkingMapsLabel: 'Google Maps जांचत हन...',
      retryBtn: 'फिर कोशिश करौ',
      webSourcesLabel: 'वेब स्रोत:',
      mapsSourcesLabel: 'Google Maps जगह:',
      timeoutError: 'जवाब मा देरी भइल। कृपया फिर से कोशिश करौ।',
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
      eyebrow: 'किसान चौपाल · यूपी के किसान भाई लोग के भरोसेमंद चर्चा आ ठगी से बचाव',
      title: 'किसान चौपाल — आपसी बातचीत',
      subtitle: 'किसान भाई लोग से मंडी भाव आ खेती के अनुभव बांटीं। ठगी रोके खातिर मॉडरेशन चालू बा।',
      newPost: 'नया पोस्ट लिखीं',
      closeComposer: 'बंद करीं',
      modDesk: 'मॉडरेटर जांच',
      helpful: 'काम के बात',
      commentSingular: 'जवाब',
      comments: 'जवाब',
      report: 'रिपोर्ट करीं',
      verifiedBadge: 'सत्यापित सलाह',
      lockedBadge: 'जवाब बंद बा',
      hiddenBadge: 'मॉडरेटर द्वारा छिपावल गइल',
      searchPlaceholder: 'फसल, मंडी भा विषय खोजीं...',
      sortNewest: 'सबसे नया',
      sortHelpful: 'सबसे उपयोगी',
      emptyState: 'राउर खोज से मिलत कवनो चर्चा ना मिलल।',
      resetFilters: 'फिल्टर हटाईं',
      noCommentsYet: 'अभी कवनो जवाब नइखे। आपन अनुभव भा सवाल लिखीं।',
      commentsLockedNotice: 'एह चर्चा प मॉडरेटर नया जवाब बंद क देले बाड़ें।',
      yourNamePlaceholder: 'राउर नाम',
      replyPlaceholder: 'आपन सलाह भा मंडी के ताजा हाल लिखीं...',
      replyBtn: 'जवाब भेजीं',
      composerTitle: 'किसान चौपाल प नया चर्चा शुरू करीं',
      composerGuardNote: 'ठगी रोकथाम आ सही भाषा जांच चालू बा',
      fieldName: 'राउर नाम',
      fieldDistrict: 'जिला',
      fieldCategory: 'विषय चुनीं',
      fieldCrop: 'संबंधित फसल',
      generalFarming: 'सामान्य खेती',
      fieldHeadline: 'शीर्षक',
      fieldHeadlinePlaceholder: 'जइसे: वाराणसी पहड़िया मंडी में आज सुबह के प्याज भाव',
      fieldDetails: 'पूरा जानकारी (मंडी भाव, नमी, भंडारण भा खेती के सलाह)',
      fieldDetailsPlaceholder: 'किसान भाई लोग खातिर सही आ सच्चा जानकारी लिखीं...',
      cancelBtn: 'रद्द करीं',
      publishBtn: 'पोस्ट डालीं',
      errFillRequired: 'कृपया आपन नाम, शीर्षक आ पूरा जानकारी भरीं।',
      errEmptyComment: 'भेजे से पहिले कुछ लिखीं।',
      errModGuardPrefix: 'मॉडरेशन सुरक्षा ई संदेश रोक देहलस:',
      modQueueTitle: 'मॉडरेशन जांच सूची',
      modQueueSubtitle: 'संदिग्ध ठगी पोस्ट आ किसान रिपोर्ट के जांच करीं। नीचे से कवनो पोस्ट पिन, लॉक भा छिपा सकीले।',
      modAllClear: 'सब ठीक बा — जांच सूची में कवनो संदिग्ध पोस्ट नइखे।',
      modApprove: 'पास करीं आ देखाईं',
      modRestore: 'फिर से देखाईं',
      modRemoveHide: 'हटाईं / छिपाईं',
      modPin: 'पिन करीं',
      modUnpin: 'पिन हटाईं',
      modLock: 'लॉक करीं',
      modUnlock: 'खोलीं',
      modHide: 'छिपाईं',
      reportModalTitle: 'मॉडरेटर के रिपोर्ट करीं',
      reportFlagging: 'रिपोर्ट विषय:',
      reportReasonLegend: 'रिपोर्ट करे के कारण चुनीं',
      reportSubmitBtn: 'रिपोर्ट भेजीं',
      reportReasons: [
        'बिचौलिया ठगी / एडवांस पइसा भा OTP मांगल',
        'खराब भा अपमानजनक भाषा',
        'गलत मंडी भाव भा झूठा MSP जानकारी',
        'फालतू प्रचार / स्पैम',
      ],
      categories: {
        All: 'सब',
        'Market Rates': 'मंडी भाव',
        'Crop Care': 'फसल देखभाल',
        'Storage & Cold Store': 'कोल्ड स्टोर आ भंडारण',
        'MSP & Schemes': 'MSP आ योजना',
        Transport: 'ट्रक / भाड़ा',
      },
    },
    alerts: {
      buttonLabel: 'भाव अलर्ट',
      modalTitle: 'मंडी भाव नोटिफिकेशन अलर्ट',
      modalSubtitle: 'राउर पसंद के मंडी में तय भाव पार होखते ही तुरंत अलर्ट पाईं।',
      browserNotifEnable: 'फोन/ब्राउज़र अलर्ट चालू करीं',
      browserNotifGranted: 'ब्राउज़र नोटिफिकेशन चालू बा',
      browserNotifDenied: 'ब्राउज़र अलर्ट बंद बा (ऐप में सूचना दिखी)',
      browserNotifUnsupported: 'ऐप के अंदर तुरंत अलर्ट चालू बा',
      createTitle: 'नया भाव अलर्ट बनाईं',
      cropLabel: 'फसल चुनीं',
      directionLabel: 'कब अलर्ट मिली?',
      aboveLabel: 'भाव ऊपर जाला (≥)',
      belowLabel: 'भाव नीचे आवे (≤)',
      thresholdLabel: 'लक्ष्य भाव (₹ / क्विंटल)',
      preferredMandisLabel: 'पसंदीदा मंडी चुनीं',
      saveAlertBtn: 'अलर्ट सेव करीं',
      checkLiveNowBtn: 'ताजा भाव जांचीं',
      simulateSurgeBtn: 'भाव बढ़त (+₹100) जांचीं',
      activeRulesTitle: 'चालू भाव अलर्ट नियम',
      noRulesText: 'अभी कवनो अलर्ट नइखे बनल। ऊपर से आपन मंडी के लक्ष्य भाव सेट करीं।',
      historyTitle: 'आइल सूचनाएं',
      noHistoryText: 'अभी कवनो अलर्ट ना आइल बा। भाव पार होखते ही इहाँ दिखी।',
      markAllRead: 'सब पढ़ लिहल गइल',
      clearHistory: 'साफ करीं',
      deleteRule: 'हटाईं',
      currentRateLabel: 'मौजूदा भाव',
      dismissToast: 'बंद करीं',
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
      liveDataLabel: 'लाइव डेटा:',
      autoLabel: 'ऑटो',
      searchLabel: 'सर्च',
      mapsLabel: 'नक्शा',
      thinkingLabel: 'मंडी डेटा जांचल जाता...',
      checkingMapsLabel: 'Google Maps जांचल जाता...',
      retryBtn: 'फिर कोशिश करीं',
      webSourcesLabel: 'वेब स्रोत:',
      mapsSourcesLabel: 'Google Maps जगह:',
      timeoutError: 'जवाब में देरी हो गइल। कृपया फिर कोशिश करीं।',
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
      eyebrow: 'Kisan Chaupal · Verified UP Farmer Discussions & Anti-Scam Moderation',
      title: 'Kisan Chaupal — Farmer Community',
      subtitle: 'Discuss mandi rates, crop care, and storage tips with UP farmers. Protected by scam moderation.',
      newPost: 'New Post',
      closeComposer: 'Close',
      modDesk: 'Moderator Desk',
      helpful: 'Helpful',
      commentSingular: 'Comment',
      comments: 'Comments',
      report: 'Report',
      verifiedBadge: 'Verified Advisory',
      lockedBadge: 'Locked',
      hiddenBadge: 'Hidden by Moderator',
      searchPlaceholder: 'Search crop, mandi, or topic...',
      sortNewest: 'Latest',
      sortHelpful: 'Most Helpful',
      emptyState: 'No discussions match your current search or category.',
      resetFilters: 'Reset filters',
      noCommentsYet: 'No comments yet. Share your experience or ask a follow-up question.',
      commentsLockedNotice: 'Comments are locked by a moderator on this thread.',
      yourNamePlaceholder: 'Your name',
      replyPlaceholder: 'Add a helpful reply or mandi update...',
      replyBtn: 'Reply',
      composerTitle: 'Start a Discussion on Kisan Chaupal',
      composerGuardNote: 'Protected by automated anti-scam & respectful language screening',
      fieldName: 'Your Name',
      fieldDistrict: 'District',
      fieldCategory: 'Topic Category',
      fieldCrop: 'Related Crop',
      generalFarming: 'General Farming',
      fieldHeadline: 'Headline',
      fieldHeadlinePlaceholder: 'e.g., Sikandra Mandi Agra morning rates for Chipsona potato',
      fieldDetails: 'Details (mandi rates, moisture experience, storage or farming tip)',
      fieldDetailsPlaceholder: 'Share helpful, factual observations for fellow farmers...',
      cancelBtn: 'Cancel',
      publishBtn: 'Publish Post',
      errFillRequired: 'Please fill in your name, post title, and discussion details.',
      errEmptyComment: 'Please write a comment before posting.',
      errModGuardPrefix: 'Moderation Guard blocked this post:',
      modQueueTitle: 'Community Moderation Queue',
      modQueueSubtitle: 'Review auto-flagged scam posts and farmer reports. You can also Pin, Lock, or Hide any post in the feed below.',
      modAllClear: 'All clear — no pending flagged or reported posts in the moderation queue.',
      modApprove: 'Approve & Publish',
      modRestore: 'Restore',
      modRemoveHide: 'Remove / Hide',
      modPin: 'Pin',
      modUnpin: 'Unpin',
      modLock: 'Lock',
      modUnlock: 'Unlock',
      modHide: 'Hide',
      reportModalTitle: 'Report to Community Moderators',
      reportFlagging: 'Flagging:',
      reportReasonLegend: 'Reason for reporting',
      reportSubmitBtn: 'Submit Report',
      reportReasons: [
        'Middleman Scam / Advance Fee Fraud',
        'Abusive or Disrespectful Language',
        'Misleading Price or MSP Information',
        'Spam / Off-Topic Advertisement',
      ],
      categories: {
        All: 'All',
        'Market Rates': 'Market Rates',
        'Crop Care': 'Crop Care',
        'Storage & Cold Store': 'Storage & Cold Store',
        'MSP & Schemes': 'MSP & Schemes',
        Transport: 'Transport',
      },
    },
    alerts: {
      buttonLabel: 'Price Alerts',
      modalTitle: 'Mandi Price Threshold Alerts',
      modalSubtitle: 'Get instant local notifications when your selected crop crosses your target rate in preferred mandis.',
      browserNotifEnable: 'Enable Browser Notifications',
      browserNotifGranted: 'Browser Notifications Enabled',
      browserNotifDenied: 'Browser notifications blocked (In-app alerts active)',
      browserNotifUnsupported: 'In-app live alerts active',
      createTitle: 'Create Price Alert',
      cropLabel: 'Selected Crop',
      directionLabel: 'Trigger Condition',
      aboveLabel: 'Crosses Above (≥)',
      belowLabel: 'Drops Below (≤)',
      thresholdLabel: 'Target Price (₹ / Quintal)',
      preferredMandisLabel: 'Preferred Mandis',
      saveAlertBtn: 'Save Alert Rule',
      checkLiveNowBtn: 'Check Rates Now',
      simulateSurgeBtn: 'Test +₹100 Surge',
      activeRulesTitle: 'Active Alert Rules',
      noRulesText: 'No price alerts yet. Set a target price for your preferred mandis above.',
      historyTitle: 'Triggered Notifications',
      noHistoryText: 'No price alerts triggered yet. You will be alerted as soon as a mandi crosses your threshold.',
      markAllRead: 'Mark all read',
      clearHistory: 'Clear',
      deleteRule: 'Remove',
      currentRateLabel: 'Current rate',
      dismissToast: 'Dismiss',
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
      liveDataLabel: 'Live Data:',
      autoLabel: 'Auto',
      searchLabel: 'Search',
      mapsLabel: 'Maps',
      thinkingLabel: 'Checking mandi data...',
      checkingMapsLabel: 'Checking Google Maps...',
      retryBtn: 'Retry',
      webSourcesLabel: 'Verified Web Sources:',
      mapsSourcesLabel: 'Google Maps Places & Links:',
      timeoutError: 'Request took too long. Please check your connection and tap Retry.',
    },
  },
};
