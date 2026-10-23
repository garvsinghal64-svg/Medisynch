import { SupportedLanguage, LanguageInfo, PatientRecord, SoapNote, ClinicalAnalysisResult } from '../types/clinical';

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog / Filipino', flag: '🇵🇭' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export interface TranslatedPatientHandout {
  language: SupportedLanguage;
  title: string;
  patientGreeting: string;
  overviewHeading: string;
  overviewText: string;
  instructionsHeading: string;
  instructions: string[];
  medicationsHeading: string;
  medications: Array<{ name: string; instructions: string; purpose: string }>;
  redFlagsHeading: string;
  redFlags: string[];
  followUpHeading: string;
  followUpText: string;
  emergencyNotice: string;
  physicianSignOff: string;
}

export function generateLocalizedPatientHandout(
  lang: SupportedLanguage,
  patient: PatientRecord,
  note: SoapNote,
  analysis: ClinicalAnalysisResult | null
): TranslatedPatientHandout {
  const patientName = patient.name || 'Valued Patient';
  const doctorName = note.signedBy || 'Dr. Elena Rossi, MD';
  const primaryDiagnosis = analysis?.differentials?.[0]?.diagnosis || 'Clinical evaluation and symptom follow-up';

  switch (lang) {
    case 'es':
      return {
        language: 'es',
        title: 'Instrucciones de Alta Médica y Cuidados en Casa',
        patientGreeting: `Estimado/a ${patientName}, este es el resumen de su visita médica y las indicaciones para su recuperación.`,
        overviewHeading: 'Diagnóstico y Lo Que Está Sucediendo',
        overviewText: `Hoy evaluamos sus síntomas con respecto a: ${primaryDiagnosis}. Su equipo médico ha diseñado este plan personalizado para aliviar su malestar, proteger su corazón y riñones, y asegurar una pronta recuperación.`,
        instructionsHeading: 'Instrucciones Clave para su Cuidado Diario',
        instructions: [
          'Tome sus medicamentos exactamente según lo recetado, preferiblemente a la misma hora cada día.',
          'Pésese todas las mañanas al levantarse, después de orinar y antes del desayuno. Anote su peso en un cuaderno.',
          'Reduzca el consumo de sal y sodio (evite alimentos enlatados, embutidos y comida rápida salada).',
          'Suspenda inmediatamente medicamentos antiinflamatorios como Ibuprofeno o Naproxeno a menos que su médico lo autorice expresamente.',
          'Mantenga reposo relativo y evite esfuerzos físicos vigorosos mientras sus síntomas se estabilizan.',
        ],
        medicationsHeading: 'Horario y Propósito de sus Medicamentos',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: 'Tomar según prescripción médica con un vaso lleno de agua.',
          purpose: 'Control de la presión arterial, regulación de líquidos y protección cardiovascular.',
        })),
        redFlagsHeading: 'Señales de Alarma (Acuda a Urgencias de Inmediato)',
        redFlags: [
          'Dificultad repentina o severa para respirar, especialmente al estar acostado boca arriba.',
          'Dolor opresivo, ardor o pesadez en el centro del pecho que se extiende al brazo, cuello o mandíbula.',
          'Aumento repentino de peso de más de 1.5 kg (3 libras) en 24 horas o hinchazón notable en piernas y tobillos.',
          'Desmayos, mareos extremos, confusión mental o latidos cardíacos inusualmente rápidos o irregulares.',
        ],
        followUpHeading: 'Próxima Cita de Control',
        followUpText: 'Tiene programada una consulta de seguimiento en 5 a 7 días. Por favor traiga su registro diario de peso y presión arterial.',
        emergencyNotice: 'En caso de emergencia con riesgo vital, llame inmediatamente al 911 o acuda al servicio de urgencias más cercano.',
        physicianSignOff: `Aprobado y firmado electrónicamente por: ${doctorName}`,
      };

    case 'zh':
      return {
        language: 'zh',
        title: '出院与家庭护理指导指南',
        patientGreeting: `尊敬的 ${patientName}，这是您本次就诊的临床摘要与家庭护理康复计划。`,
        overviewHeading: '诊断与病情概览',
        overviewText: `今天我们针对您的以下病情进行了详细评估：${primaryDiagnosis}。医疗团队已制定针对性方案，以缓解不适、保护器官功能并促进身体恢复。`,
        instructionsHeading: '日常重要护理指导',
        instructions: [
          '请务必遵医嘱按时足量服药，切勿擅自停药或减量。',
          '每天早晨起床排尿后、早餐前测量体重，并将其记录在健康笔记本上。',
          '严格控制盐分和钠摄入量（每日食盐尽量少于2克，避免腌制、加工或过咸食物）。',
          '立即停止服用布洛芬（Ibuprofen）或萘普生等非甾体抗炎止痛药，防止肾脏与心脏负担加重。',
          '保持充足休息，避免剧烈运动，待各项指标恢复稳定。',
        ],
        medicationsHeading: '药物服用清单与作用说明',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: '按处方指导定时温水送服。',
          purpose: '稳定血压、调节体内多余水分负荷并保护心血管功能。',
        })),
        redFlagsHeading: '紧急危险信号（出现以下情况请立即就医）',
        redFlags: [
          '突发或严重的呼吸困难，尤其在平躺时加重，夜间被迫坐起呼吸。',
          '胸部压榨样剧痛、胸闷，并向左肩、颈部或下颌放射。',
          '体重在24小时内突然增加超过1.5公斤（3磅），或双腿、脚踝明显凹陷性水肿。',
          '突发晕厥、极度头晕、意识模糊或心悸心跳剧烈加快。',
        ],
        followUpHeading: '复诊安排',
        followUpText: '请在5至7天内回医院复诊进行血液生化检查。复诊时请务必携带每日血压与体重监测记录。',
        emergencyNotice: '若遇突发危急状况，请立即拨打120或急诊救援电话，前往最近医院急诊科。',
        physicianSignOff: `主治医师电子签名认证：${doctorName}`,
      };

    case 'hi':
      return {
        language: 'hi',
        title: 'अस्पताल डिस्चार्ज व घरेलू देखभाल निर्देश',
        patientGreeting: `प्रिय ${patientName}, यह आपकी आज की क्लिनिकल जांच का सारांश और स्वस्थ होने के लिए आवश्यक निर्देश हैं।`,
        overviewHeading: 'निदान और स्वास्थ्य स्थिति',
        overviewText: `आज हमने आपकी इस स्थिति का गहन परीक्षण किया: ${primaryDiagnosis}। आपकी चिकित्सा टीम ने आपके लक्षणों को कम करने और हृदय व गुर्दों की सुरक्षा के लिए यह योजना तैयार की है।`,
        instructionsHeading: 'घर पर महत्वपूर्ण सावधानियां',
        instructions: [
          'अपनी सभी दवाएं डॉक्टर के निर्देशानुसार नियमित समय पर लें।',
          'रोजाना सुबह शौच के बाद और नाश्ते से पहले अपना वजन मापें और डायरी में लिखें।',
          'भोजन में नमक की मात्रा बहुत कम रखें (अचार, नमकीन और डिब्बाबंद खाद्य पदार्थों से परहेज करें)।',
          'इबुप्रोफेन (Ibuprofen) जैसी दर्द निवारक दवाएं तुरंत बंद करें, ये गुर्दों पर दबाव डाल सकती हैं।',
          'उचित आराम करें और भारी शारीरिक श्रम से बचें।',
        ],
        medicationsHeading: 'दवाओं की सूची व उपयोग',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: 'डॉक्टर द्वारा बताए गए समय पर पानी के साथ लें।',
          purpose: 'रक्तचाप नियंत्रण और शरीर से अतिरिक्त पानी निकालने हेतु।',
        })),
        redFlagsHeading: 'खतरे के लक्षण (तत्काल आपातकालीन चिकित्सा लें)',
        redFlags: [
          'सांस लेने में अचानक अत्यधिक कठिनाई, विशेषकर सीधे लेटने पर।',
          'छाती में तेज दबाव, दर्द या जकड़न जो बाएं हाथ या जबड़े तक फैले।',
          '24 घंटों में 1.5 किलो से अधिक वजन बढ़ना या पैरों व टखनों में सूजन।',
          'अचानक चक्कर आना, बेहोशी या दिल की धड़कन असामान्य रूप से तेज होना।',
        ],
        followUpHeading: 'पुनः जांच (फॉलो-अप)',
        followUpText: 'कृपया 5 से 7 दिनों में क्लिनिक में फॉलो-अप के लिए आएं। साथ में अपनी वजन और बीपी की डायरी अवश्य लाएं।',
        emergencyNotice: 'किसी भी आपातकालीन स्थिति में तुरंत एम्बुलेंस (108/112/911) को कॉल करें।',
        physicianSignOff: `प्रमाणित चिकित्सक द्वारा हस्ताक्षरित: ${doctorName}`,
      };

    case 'fr':
      return {
        language: 'fr',
        title: 'Instructions de Sortie Médicale et Soins à Domicile',
        patientGreeting: `Cher(e) ${patientName}, voici le récapitulatif de votre consultation médicale et votre protocole de convalescence.`,
        overviewHeading: 'Diagnostic et Synthèse Clinique',
        overviewText: `Nous avons évalué aujourd'hui votre état de santé concernant : ${primaryDiagnosis}. Ce plan personnalisé vise à soulager vos symptômes et préserver vos fonctions cardiaque et rénale.`,
        instructionsHeading: 'Consignes de Soins Quotidiennes',
        instructions: [
          'Prenez scrupuleusement vos médicaments prescrits aux horaires indiqués.',
          'Pesez-vous chaque matin au lever, à jeun et après avoir uriné. Notez les valeurs sur un carnet.',
          'Réduisez votre apport en sel alimentaire (évitez plats préparés, charcuteries et bouillons salés).',
          'Arrêtez immédiatement les anti-inflammatoires en vente libre comme l’Ibuprofène sans avis médical.',
          'Privilégiez le repos et évitez tout effort physique intense durant la phase de stabilisation.',
        ],
        medicationsHeading: 'Ordonnance et Rôle des Médicaments',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: 'À prendre selon la posologie avec un grand verre d’eau.',
          purpose: 'Régulation de la tension artérielle et évacuation des surplus liquidiens.',
        })),
        redFlagsHeading: 'Signes d’Alerte (Consultez Immédiatement les Urgences)',
        redFlags: [
          'Essoufflement aigu ou aggravation brutale de la gêne respiratoire, surtout en position allongée.',
          'Douleur constrictive ou oppression dans la poitrine irradiant vers le bras gauche ou la mâchoire.',
          'Prise de poids soudaine de plus de 1,5 kg en 24h ou œdèmes croissants aux chevilles.',
          'Malaise, étourdissements sévères ou palpitations cardiaques rapides.',
        ],
        followUpHeading: 'Rendez-vous de Suivi',
        followUpText: 'Une visite de contrôle est requise dans 5 à 7 jours avec bilan sanguin de contrôle.',
        emergencyNotice: 'En cas d’urgence vitale, composez immédiatement le 15 (SAMU) ou le 112.',
        physicianSignOff: `Validé et signé électroniquement par le praticien : ${doctorName}`,
      };

    case 'tl':
      return {
        language: 'tl',
        title: 'Mga Tagubilin sa Paglabas sa Ospital at Pangangalaga sa Bahay',
        patientGreeting: `Mahal naming ${patientName}, narito ang buod ng inyong pagpapatingin at mga tagubilin para sa inyong mabilis na paggaling.`,
        overviewHeading: 'Pagsusuri at Lagay ng Kalusugan',
        overviewText: `Sinuri namin ang inyong kalagayan patungkol sa: ${primaryDiagnosis}. Ang planong ito ay inihanda upang maibsan ang inyong nararamdaman at mapangalagaan ang inyong puso at bato.`,
        instructionsHeading: 'Mahahalagang Tagubilin sa Pang-araw-araw',
        instructions: [
          'Inumin ang inyong mga gamot sa eksaktong oras ayon sa tagubilin ng doktor.',
          'Magtimbang araw-araw tuwing umaga bago mag-almusal at pagkatapos umihi. Isulat ito sa kwaderno.',
          'Bawasan ang pagkaing maalat (iwasan ang mga de-lata, chichirya, at processed foods).',
          'Itigil agad ang pag-inom ng mga pain reliever tulad ng Ibuprofen nang walang pahintulot ng doktor.',
          'Magpahinga nang sapat at iwasan muna ang mabibigat na gawain.',
        ],
        medicationsHeading: 'Talaan at Gamit ng mga Gamot',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: 'Inumin kasama ng isang basong tubig ayon sa reseta.',
          purpose: 'Pagkontrol sa presyon ng dugo at pag-alis ng labis na tubig sa katawan.',
        })),
        redFlagsHeading: 'Mga Babala (Pumunta Agad sa Emergency Room)',
        redFlags: [
          'Biglaang hirap sa paghinga lalo na kapag nakahiga nang patag.',
          'Paninikip o matinding kirot sa dibdib na umaabot sa kaliwang braso o panga.',
          'Biglaang pagbigat ng timbang nang higit sa 3 libra (1.5 kg) sa loob ng 24 oras o pamamaga ng mga bukong-bukong.',
          'Pagkahilo, pagkawala ng malay, o mabilis na tibok ng puso.',
        ],
        followUpHeading: 'Kasunod na Check-up',
        followUpText: 'Magpa-check up muli pagkalipas ng 5 hanggang 7 araw kasama ang inyong talaan ng timbang at presyon ng dugo.',
        emergencyNotice: 'Kung may matinding emergency, tumawag agad sa 911 o pumunta sa pinakamalapit na ospital.',
        physicianSignOff: `Nilagdaan at inaprubahan ng manggagamot: ${doctorName}`,
      };

    case 'ar':
      return {
        language: 'ar',
        title: 'تعليمات الخروج من المستشفى والرعاية المنزلية',
        patientGreeting: `عزيزي المريض ${patientName}، إليك ملخص زيارتك الطبية وخطة التعافي الموصى بها.`,
        overviewHeading: 'التشخيص والحالة الطبية',
        overviewText: `قمنا اليوم بتقييم حالتك الصحية فيما يتعلق بـ: ${primaryDiagnosis}. يهدف هذا البرنامج العلاجي إلى تخفيف الأعراض وحماية وظائف القلب والكلى.`,
        instructionsHeading: 'تعليمات الرعاية اليومية الهامة',
        instructions: [
          'تناول الأدوية بدقة تامة وفقاً للجرعات والمواعيد المحددة من قبل الطبيب.',
          'قم بقياس وزنك كل صباح فور الاستيقاظ وبعد التبول وقبل الإفطار، وسجل القراءة في دفتر المتابعة.',
          'قلل من استهلاك الملح والأطعمة المعلبة والوجبات الجاهزة الغنية بالصوديوم.',
          'أوقف فوراً استخدام المسكنات ومضادات الالتهاب مثل إيبوبروفين (Ibuprofen) لتجنب التأثير السلبي على الكلى.',
          'احرص على الراحة وتجنب المجهود البدني الشاق أثناء فترة العلاج الأولية.',
        ],
        medicationsHeading: 'جدول الأدوية والغرض منها',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: 'تناول الدواء مع كوب كامل من الماء وفق الوصفة الطبية.',
          purpose: 'تنظيم ضغط الدم والتخلص من السوائل الزائدة وحماية القلب.',
        })),
        redFlagsHeading: 'علامات الخطر (توجه فوراً إلى قسم الطوارئ)',
        redFlags: [
          'صعوبة حادة أو مفاجئة في التنفس، خاصة عند الاستلقاء على الظهر.',
          'ألم ضاغط أو ثقل شديد في الصدر يمتد إلى الذراع الأيسر أو الفك.',
          'زيادة مفاجئة في الوزن بأكثر من 1.5 كجم خلال 24 ساعة أو تورم شديد في الساقين والكاحلين.',
          'دوار شديد، فقدان للوعي، أو خفقان سريع وغير منتظم في ضربات القلب.',
        ],
        followUpHeading: 'موعد المتابعة القادم',
        followUpText: 'يرجى مراجعة العيادة في غضون 5 إلى 7 أيام لإجراء التحاليل ومتابعة الخطة العلاجية.',
        emergencyNotice: 'في حالات الطوارئ الخطرة، اتصل فوراً برقم الطوارئ 911 أو توجه لأقرب مستشفى.',
        physicianSignOff: `تمت المصادقة والتوقيع الإلكتروني بواسطة الطبيب المعالج: ${doctorName}`,
      };

    default: // 'en'
      return {
        language: 'en',
        title: 'Patient Discharge Summary & Home Care Instructions',
        patientGreeting: `Dear ${patientName}, here is your personalized care plan following today's clinical evaluation.`,
        overviewHeading: 'Diagnosis & Clinical Summary',
        overviewText: `Today we evaluated your symptoms regarding: ${primaryDiagnosis}. Your healthcare team has prepared this step-by-step care plan to alleviate your symptoms, protect your kidney and cardiovascular health, and guide your recovery.`,
        instructionsHeading: 'Essential Home Care Instructions',
        instructions: [
          'Take all prescribed medications consistently at the same times each day.',
          'Weigh yourself every morning upon waking, after urinating and before eating breakfast. Record your weight in a daily log.',
          'Maintain a low-sodium diet (<2,000 mg/day). Avoid processed meats, canned soups, frozen dinners, and heavy table salt.',
          'Discontinue over-the-counter NSAID pain relievers (e.g. Ibuprofen, Naproxen, Aleve) as they interfere with kidney function and fluid balance.',
          'Prioritize resting with your legs elevated above heart level when seated to help reduce leg and ankle swelling.',
        ],
        medicationsHeading: 'Your Prescribed Medication Schedule',
        medications: note.medications.map((m) => ({
          name: m,
          instructions: 'Take as directed with a full glass of water.',
          purpose: 'Blood pressure control, fluid regulation, and cardiovascular protection.',
        })),
        redFlagsHeading: 'Red-Flag Warning Signs (Seek Emergency Care Immediately)',
        redFlags: [
          'Sudden or worsening shortness of breath, particularly when lying flat or waking up gasping for air.',
          'Crushing chest pressure, tightness, or pain radiating to your left arm, neck, or jaw.',
          'Rapid weight gain of greater than 3 lbs in 24 hours (or >5 lbs in 1 week), or marked swelling in your legs.',
          'Severe dizziness, fainting (syncope), profound confusion, or irregular, racing heartbeats.',
        ],
        followUpHeading: 'Follow-Up Schedule',
        followUpText: 'Please return for your scheduled follow-up consultation in 5 to 7 days. Remember to bring your daily weight and blood pressure log.',
        emergencyNotice: 'If you experience severe, life-threatening symptoms, dial 911 immediately or go to the nearest emergency department.',
        physicianSignOff: `Attested & Electronically Signed by Attending Physician: ${doctorName}`,
      };
  }
}
