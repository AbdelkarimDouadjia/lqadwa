import type { Language } from "@/lib/i18n";

export type PublicInfoPath = "how-it-works" | "for-pharmacies" | "safety" | "pricing" | "help";
type CopyBlock = { title: string; body: string; detail: string };
type Question = { question: string; answer: string };
type PageCopy = {
  label: string; title: string; summary: string; action: string; image: string; imageAlt: string;
  facts: [string, string, string]; sections: CopyBlock[]; questions?: Question[];
  price?: { amount: string; oldAmount: string; period: string; note: string };
};

const content: Record<Language, Record<PublicInfoPath, PageCopy>> = {
  ar: {
    "how-it-works": {
      label: "رحلة المريض", title: "من اسم الدواء إلى شباك الصيدلية.", summary: "ابحث عن دواء في منطقتك، وانتظر ردّ الصيدلي، ثم احجز للاستلام بنفسك. لقى دوا يوجّهك إلى الصيدلية؛ ولا يبيع الدواء أو يوصّله.", action: "ابدأ البحث", image: "/art/walk.webp", imageAlt: "طريق مشاة في حي جزائري", facts: ["بحث مجاني للمريض", "تأكيد من الصيدلية", "استلام حضوري فقط"],
      sections: [
        { title: "ابدأ باسم واضح", body: "اكتب الاسم التجاري أو المادة الفعالة والتركيز، ثم اختر منطقتك. يمكنك قراءة الاسم من صورة على جهازك بمسح OCR.", detail: "راجع الاسم والتركيز قبل الإرسال؛ قد يخطئ التعرف الضوئي، خصوصاً في الخط اليدوي. لا تُرفع صورة الوصفة أو نصها الكامل إلى خوادمنا." },
        { title: "دع الصيدلي يؤكد التوفر", body: "يصل طلب مختصر إلى الصيدليات القريبة المسجلة والمعتمدة. الصيدلي هو من يجيب عن التوفر؛ بيانات المخزون المدخلة يدوياً قد تتغير.", detail: "النتائج مرتبة حسب القرب، ولا تعني نتيجة الفهرس الدوائي أن الدواء متوفر. قد لا تظهر صيدليات إذا لم تكن الشبكة قد وصلت إلى منطقتك." },
        { title: "احجز وخطّط للاستلام", body: "بعد تأكيد الصيدلي يمكنك حجز الدواء لساعتين، وإظهار رمز الحجز عند الشباك. افتح المسار للمشي أو السيارة أو النقل العمومي حيث تتوفر بياناته.", detail: "أحضر الوصفة الأصلية عندما تكون مطلوبة قانوناً. الصيدلي يتحقق من شروط الصرف؛ الحجز لا يضمن صرف الدواء ولا يحل محل الاستشارة." },
      ],
    },
    "for-pharmacies": {
      label: "مساحة الصيدلية", title: "طلبات أوضح. وإدارة بسيطة من مكان واحد.", summary: "أنشئ ملف صيدليتك، وبعد مراجعة الإدارة يمكنك الرد على طلبات التوفر، وتحديث المخزون والحجوزات من لوحة واحدة.", action: "سجّل صيدليتك", image: "/art/pharmacy.webp", imageAlt: "تصوّر توضيحي لرفوف صيدلية", facts: ["موافقة الإدارة قبل الظهور", "لا يلزم نظام تسيير مرتبط", "لا توصيل ولا عمولة"],
      sections: [
        { title: "التسجيل والمراجعة", body: "أرسل اسم الصيدلية وعنوانها ووسائل الاتصال والبيانات المهنية المطلوبة. لن يظهر الملف للمرضى قبل مراجعة الإدارة واعتماده.", detail: "قدّم بيانات صحيحة ومحدّثة. التسجيل لا يعني اعتماداً من وزارة أو هيئة مهنية، ولا نعرض الصيدلية قبل اكتمال المراجعة." },
        { title: "مخزون تحت سيطرتك", body: "أضف الأصناف والكميات أو حدّثها يدوياً، وراجع طلبات التوفر الواردة. لا يوجد حالياً تكامل مع برنامج تسيير الصيدلية أو واجهة وطنية للمخزون.", detail: "القائمة تساعد في تنظيم العمل، لكنها ليست ضماناً لحظياً للتوفر. افحص الرف والوصفة قبل تأكيد الحجز والصرف." },
        { title: "ردّ، ثم جهّز الاستلام", body: "أجب متوفّر أو غير متوفر. عند تأكيد التوفر يستطيع المريض إنشاء حجز مؤقت ورمز QR، ثم يأتي إلى الصيدلية للاستلام.", detail: "يمكن للصيدلية التحقق من الرمز عند الشباك. مشاركة موقع اقتراب المريض اختيارية، وتتوقف عند إيقافها أو انتهاء تحديثها؛ لا يوجد تتبع في الخلفية." },
      ],
    },
    safety: {
      label: "الثقة والخصوصية", title: "بيانات أقل. وخيارات واضحة.", summary: "خدمة توجيه وليست تشخيصاً أو بيعاً للأدوية. صُممت خطوات المسح والموقع والاستلام لتبقي القرار المهني بيد الصيدلي.", action: "اقرأ سياسة الخصوصية", image: "/art/prescription.webp", imageAlt: "هاتف وورقة ضمن رسم توضيحي", facts: ["لا صور وصفات على الخادم", "الموقع بإذنك", "لا بيع أو توصيل"],
      sections: [
        { title: "مسح محلي، لا تحقق طبي", body: "تُعالج صورة العلبة أو الوصفة ونتيجة OCR على جهازك. اختر اسم الدواء بنفسك وراجعه قبل إرسال طلب التوفر.", detail: "OCR قد يخطئ ولا يتحقق من صلاحية الوصفة أو ملاءمة الدواء. لا ترفع التشخيص أو صورة الوصفة إلى الدعم." },
        { title: "شارك ما تحتاجه فقط", body: "يُرسل اسم الدواء ومنطقة البحث لتوجيه الطلب. نحتاج بيانات الحساب لتشغيل البحث والحجوزات، ولا نطلب تشخيصاً طبياً للعثور على صيدلية.", detail: "استخدام الموقع اختياري. إذا شاركت تقدّم وصولك، فتراه الصيدلية المرتبطة بالحجز فقط ولمدة مؤقتة؛ أوقف المشاركة متى شئت." },
        { title: "الاستلام مسؤولية الصيدلي", body: "لا شراء داخل التطبيق، ولا توصيل منزلي، ولا عمولة على سعر الدواء، ولا ترتيب مدفوع للصيدليات.", detail: "الاستلام في المحل فقط. يراجع الصيدلي الوصفة وشروط الصرف ويقدم الاستشارة اللازمة. تعرّف على البيانات المحفوظة وحقوقك في سياسة الخصوصية." },
      ],
    },
    pricing: {
      label: "الأسعار", title: "البحث للمريض مجاني دائماً.", summary: "يمكن للمريض البحث والحجز دون رسوم. اشتراك الصيدلية مجاني حتى 30 سبتمبر 2027؛ لا تُحصّل المنصة مدفوعات حالياً.", action: "تعرّف على مساحة الصيدلية", image: "/art/neighbourhood.webp", imageAlt: "حي جزائري ضمن رسم توضيحي", facts: ["0 دج للمريض", "مجاني للصيدليات حتى 30 سبتمبر 2027", "لا دفع إلكتروني الآن"],
      sections: [
        { title: "للمريض", body: "البحث عن التوفر وإنشاء الحجز واستخدام معلومات المسار مجانية. يدفع المريض للصيدلية السعر النظامي عند الاستلام، لا للمنصة.", detail: "لا تبيع لقى دوا الأدوية ولا تضيف رسماً على سعرها." },
        { title: "للصيدلية", body: "الاشتراك المعروض هو 300 دج شهرياً بعد الفترة المجانية، المجانية حتى 30 سبتمبر 2027.", detail: "لا توجد عملية تحصيل مفعّلة الآن. لا ترسل أي مبلغ إلى المنصة؛ سيُعلن أي تغيير في الأسعار وآلية الاشتراك بوضوح قبل تطبيقه." },
        { title: "قبل تفعيل ملفك", body: "تحتاج الصيدلية إلى إنشاء حساب، وإرسال بياناتها، وانتظار مراجعة الإدارة. يظهر الملف المعتمد فقط في البحث.", detail: "لا تُحتسب عمولة على صرف الأدوية، ولا يوجد ترتيب مدفوع أو مساحة إعلانية للصيدليات." },
      ], price: { amount: "باطل الآن", oldAmount: "300 دج", period: "شهرياً بعد 30 سبتمبر 2027", note: "لا تحصيل مالي مفعّل حالياً." },
    },
    help: {
      label: "مركز المساعدة", title: "إجابات قبل أن تبدأ.", summary: "تفاصيل عملية للمريض والصيدلي حول البحث والمخزون والحجز والخصوصية.", action: "إنشاء حساب مريض", image: "/art/neighbourhood.webp", imageAlt: "حي جزائري ضمن رسم توضيحي", facts: ["الدواء يُصرف من الصيدلية", "الرد من الصيدلي", "الدعم عبر البريد"],
      sections: [{ title: "ما الذي تحتاجه؟", body: "اختر السؤال المناسب. إذا احتجت مساعدة بشأن حسابك، راسل فريق الدعم من البريد الإلكتروني المسجل لديك.", detail: "لا ترسل كلمة مرور أو تشخيصاً أو صورة وصفة بالبريد." }],
      questions: [
        { question: "هل تؤكد المنصة توفر الدواء؟", answer: "لا. الصيدلية هي التي ترد على الطلب. راجع وقت الرد، واتصل بالصيدلية قبل التنقل إذا تغيّرت خطتك." },
        { question: "هل يوجد توصيل أو دفع داخل التطبيق؟", answer: "لا. الحجز للتنسيق فقط؛ الاستلام والدفع النظامي يتمان داخل الصيدلية مباشرة." },
        { question: "هل أحتاج وصفة؟", answer: "أحضر الوصفة الطبية الأصلية إذا كان الدواء يتطلبها. يقرر الصيدلي شروط الصرف عند الشباك." },
        { question: "هل يمكنني مسح وصفة؟", answer: "نعم، لاقتراح نص للبحث فقط. تتم القراءة على جهازك وقد تخطئ؛ راجع اسم الدواء والتركيز بنفسك." },
        { question: "لماذا لا أرى صيدلية قريبة؟", answer: "لا تظهر إلا الصيدليات المسجلة والمعتمدة التي تغطيها نتائج منطقتك. قد لا تكون الخدمة متاحة في كل منطقة بعد." },
        { question: "هل المسارات والنقل العمومي متاحان في كل مكان؟", answer: "المسار يفتح عبر مزود خرائط عام. توفر المشي والسيارة والحافلة أو القطار يعتمد على بيانات منطقتك؛ تحقق من الخيارات والمواعيد قبل الانطلاق." },
      ],
    },
  },
  fr: {
    "how-it-works": {
      label: "Parcours patient", title: "Du nom du médicament au comptoir.", summary: "Cherchez un médicament près de vous, attendez la réponse du pharmacien puis réservez un retrait en personne. LQADWA oriente vers une pharmacie : la plateforme ne vend ni ne livre de médicaments.", action: "Commencer la recherche", image: "/art/walk.webp", imageAlt: "Rue piétonne dans un quartier algérien", facts: ["Recherche gratuite", "Réponse de la pharmacie", "Retrait sur place"],
      sections: [
        { title: "Saisissez un nom précis", body: "Indiquez le nom commercial ou la substance active et le dosage, puis votre zone. La lecture OCR d’une photo peut proposer un nom sur votre appareil.", detail: "Vérifiez le texte avant l’envoi : la reconnaissance peut se tromper, surtout sur l’écriture manuscrite. La photo et le texte complet de l’ordonnance ne sont pas envoyés à nos serveurs." },
        { title: "La pharmacie confirme", body: "Une demande concise est adressée aux pharmacies proches, inscrites et approuvées. La réponse vient du pharmacien ; le stock saisi manuellement peut évoluer.", detail: "Les résultats sont ordonnés par proximité. Une correspondance dans le catalogue ne prouve pas la disponibilité. Le réseau peut ne pas encore couvrir votre zone." },
        { title: "Réservez et préparez le trajet", body: "Après confirmation, vous pouvez réserver le médicament pendant deux heures et présenter le QR au comptoir. Ouvrez l’itinéraire à pied, en voiture ou en transports selon les données disponibles.", detail: "Apportez l’ordonnance originale si elle est requise. Le pharmacien vérifie les conditions de délivrance ; une réservation ne garantit pas la délivrance et ne remplace pas son conseil." },
      ],
    },
    "for-pharmacies": {
      label: "Espace pharmacie", title: "Des demandes claires. Une gestion simple.", summary: "Créez la fiche de votre officine. Après validation par l’administration, répondez aux demandes de disponibilité et gérez stock et réservations depuis un seul espace.", action: "Inscrire ma pharmacie", image: "/art/pharmacy.webp", imageAlt: "Illustration de rayons de pharmacie", facts: ["Validation avant publication", "Aucun logiciel à connecter", "Ni livraison ni commission"],
      sections: [
        { title: "Inscription et examen", body: "Envoyez le nom, l’adresse, les coordonnées et les informations professionnelles demandées. La fiche n’est visible aux patients qu’après examen et approbation.", detail: "Fournissez des informations exactes et à jour. L’inscription n’est pas une accréditation ministérielle ou professionnelle." },
        { title: "Un stock sous votre contrôle", body: "Ajoutez les références et quantités ou actualisez-les manuellement, puis consultez les demandes. Aucun logiciel de gestion d’officine ni registre national de stock n’est connecté actuellement.", detail: "La liste facilite l’organisation mais ne garantit pas un stock en temps réel. Vérifiez le produit et l’ordonnance avant de confirmer la délivrance." },
        { title: "Répondez et préparez le retrait", body: "Répondez disponible ou indisponible. Après confirmation, le patient peut créer une réservation temporaire et un QR, puis venir retirer le médicament sur place.", detail: "Vous pouvez vérifier le QR au comptoir. Le partage temporaire de position est facultatif et s’arrête lorsque le patient le désactive ou que les mises à jour cessent ; aucun suivi en arrière-plan." },
      ],
    },
    safety: {
      label: "Confiance et confidentialité", title: "Moins de données. Des choix clairs.", summary: "Un service d’orientation, pas de diagnostic ni de vente de médicaments. Le pharmacien conserve la décision professionnelle.", action: "Lire la politique de confidentialité", image: "/art/prescription.webp", imageAlt: "Illustration d’un téléphone et d’une feuille", facts: ["Pas de photo d’ordonnance sur le serveur", "Position facultative", "Ni vente ni livraison"],
      sections: [
        { title: "Lecture locale, sans validation médicale", body: "La photo d’une boîte ou d’une ordonnance et le résultat OCR sont traités sur votre appareil. Choisissez et vérifiez vous-même le nom avant d’envoyer une demande.", detail: "L’OCR peut se tromper et ne valide ni l’ordonnance ni la pertinence du traitement. N’envoyez pas de diagnostic ni d’ordonnance au support." },
        { title: "Ne partagez que le nécessaire", body: "Le nom du médicament et la zone de recherche servent à orienter la demande. Les données de compte sont nécessaires pour les recherches et réservations ; aucun diagnostic n’est requis.", detail: "La géolocalisation est facultative. Si vous partagez votre approche, seule la pharmacie liée à la réservation la voit, temporairement. Vous pouvez arrêter le partage." },
        { title: "Le retrait reste à la pharmacie", body: "Pas d’achat intégré, pas de livraison, pas de commission sur le médicament et pas de classement payant des pharmacies.", detail: "Le retrait se fait sur place. Le pharmacien vérifie l’ordonnance et les conditions de délivrance, puis conseille le patient. Consultez la politique de confidentialité pour les données conservées et vos droits." },
      ],
    },
    pricing: {
      label: "Tarifs", title: "La recherche patient reste gratuite.", summary: "Recherche et réservation sont gratuites pour les patients. L’abonnement pharmacie est gratuit jusqu’au 30 septembre 2027 ; aucun paiement n’est collecté actuellement.", action: "Découvrir l’espace pharmacie", image: "/art/neighbourhood.webp", imageAlt: "Illustration d’un quartier algérien", facts: ["0 DA pour le patient", "Gratuit jusqu’au 30 septembre 2027", "Aucun paiement en ligne"],
      sections: [
        { title: "Pour les patients", body: "La recherche, la réservation et les informations d’itinéraire sont gratuites. Le patient paie le prix réglementaire directement à la pharmacie lors du retrait, pas à la plateforme.", detail: "LQADWA ne vend pas de médicaments et n’ajoute pas de frais à leur prix." },
        { title: "Pour les pharmacies", body: "Le tarif affiché est de 300 DA par mois après la période gratuite, qui court jusqu’au 30 septembre 2027.", detail: "Aucun paiement n’est activé. N’envoyez pas d’argent à la plateforme ; tout changement de tarif ou de mode d’abonnement sera annoncé avant application." },
        { title: "Avant la mise en ligne", body: "La pharmacie crée un compte, envoie ses informations et attend l’examen de l’administration. Seules les fiches approuvées sont affichées.", detail: "Aucune commission n’est prélevée sur les médicaments et aucun placement sponsorisé n’est proposé." },
      ], price: { amount: "Gratuit", oldAmount: "300 DA", period: "par mois après le 30 septembre 2027", note: "Aucun paiement n’est activé actuellement." },
    },
    help: {
      label: "Centre d’aide", title: "Vos questions, clairement.", summary: "Les détails pratiques pour les patients et les pharmacies : recherche, stock, réservation et confidentialité.", action: "Créer un compte patient", image: "/art/neighbourhood.webp", imageAlt: "Illustration d’un quartier algérien", facts: ["Délivrance en pharmacie", "Réponse du pharmacien", "Assistance par e-mail"],
      sections: [{ title: "De quoi avez-vous besoin ?", body: "Choisissez une réponse ci-dessous. Pour une question liée au compte, écrivez au support depuis l’adresse associée au compte.", detail: "N’envoyez ni mot de passe, ni diagnostic, ni photo d’ordonnance par e-mail." }],
      questions: [
        { question: "La plateforme confirme-t-elle le stock ?", answer: "Non. La pharmacie répond à la demande. Vérifiez l’heure de la réponse et appelez l’officine avant de vous déplacer si votre plan change." },
        { question: "Y a-t-il livraison ou paiement dans l’application ?", answer: "Non. La réservation sert à coordonner le retrait ; la délivrance et le paiement réglementaire se font directement à la pharmacie." },
        { question: "Dois-je apporter une ordonnance ?", answer: "Apportez l’ordonnance originale si le médicament l’exige. Le pharmacien vérifie les règles de délivrance au comptoir." },
        { question: "Puis-je scanner une ordonnance ?", answer: "Oui, pour proposer un texte de recherche. La lecture se fait sur votre appareil et peut se tromper ; vérifiez le nom et le dosage." },
        { question: "Pourquoi aucune pharmacie proche n’apparaît ?", answer: "Seules les pharmacies inscrites et approuvées dans votre zone s’affichent. Le service peut ne pas encore être disponible partout." },
        { question: "Les itinéraires et transports sont-ils disponibles partout ?", answer: "L’itinéraire s’ouvre auprès d’un fournisseur de cartes public. Marche, voiture, bus ou train dépendent des données locales ; vérifiez les options et horaires avant le départ." },
      ],
    },
  },
  en: {
    "how-it-works": {
      label: "For patients", title: "From a medicine name to the pharmacy counter.", summary: "Search nearby, wait for a pharmacist’s reply, then reserve for in-person pickup. LQADWA points you to a pharmacy; it does not sell or deliver medicine.", action: "Start a search", image: "/art/walk.webp", imageAlt: "A pedestrian street in an Algerian neighbourhood", facts: ["Free patient search", "Pharmacy-confirmed reply", "In-person pickup only"],
      sections: [
        { title: "Start with a clear name", body: "Enter a brand or active ingredient and strength, then choose an area. On-device OCR can suggest a name from a photo.", detail: "Review the text before sending: OCR can be wrong, especially with handwriting. Prescription photos and full extracted text are not uploaded to our servers." },
        { title: "Let the pharmacy confirm", body: "A short request goes to nearby registered and approved pharmacies. The pharmacist replies; manually entered stock can change.", detail: "Results are ordered by distance. A medicine-catalog match is not proof of stock, and the network may not yet cover your area." },
        { title: "Reserve and plan pickup", body: "After confirmation, you can reserve for two hours and show a booking QR at the counter. Open walking, driving or transit directions where local data is available.", detail: "Bring the original prescription when required. The pharmacist checks dispensing conditions; a reservation does not guarantee dispensing or replace professional advice." },
      ],
    },
    "for-pharmacies": {
      label: "Pharmacy workspace", title: "Clearer requests. Simple operations in one place.", summary: "Create your pharmacy profile. Once reviewed, answer availability requests and manage stock and reservations from one dashboard.", action: "Register your pharmacy", image: "/art/pharmacy.webp", imageAlt: "Illustration of pharmacy shelves", facts: ["Reviewed before listing", "No system integration required", "No delivery or commission"],
      sections: [
        { title: "Register and get reviewed", body: "Submit the pharmacy name, address, contact details and requested professional information. Patients can see the listing only after admin review and approval.", detail: "Keep details accurate and current. Registration does not mean government or professional accreditation." },
        { title: "Keep inventory in your hands", body: "Add items and quantities or update them manually, then review incoming requests. No pharmacy-management software or national stock register is connected today.", detail: "The list helps organise work but is not a real-time stock guarantee. Check the shelf and prescription before confirming dispensing." },
        { title: "Reply, then prepare pickup", body: "Reply available or unavailable. After confirmation, the patient can make a temporary reservation and QR, then collect in person.", detail: "Verify the QR at the counter. Optional, temporary arrival sharing stops when switched off or updates cease; there is no background tracking." },
      ],
    },
    safety: {
      label: "Trust and privacy", title: "Less data. Clear choices.", summary: "An orientation service—not diagnosis or medicine sales. The pharmacist retains the professional decision.", action: "Read the privacy policy", image: "/art/prescription.webp", imageAlt: "Illustration of a phone and a sheet of paper", facts: ["No prescription image on our server", "Location is optional", "No sales or delivery"],
      sections: [
        { title: "On-device reading, not medical verification", body: "A medicine-box or prescription photo and OCR result are processed on your device. Choose and review the medicine name before sending a request.", detail: "OCR can be wrong and does not validate a prescription or treatment. Do not send a diagnosis or prescription to support." },
        { title: "Share only what is needed", body: "The medicine name and search area route your request. Account details support search and reservations; a diagnosis is not needed.", detail: "Location is optional. If you share your approach, only the pharmacy linked to that reservation can see it temporarily. Stop sharing at any time." },
        { title: "Pickup stays with the pharmacist", body: "No in-app purchase, home delivery, medicine commission or paid ranking of pharmacies.", detail: "Pickup is in person. The pharmacist checks the prescription and dispensing requirements and gives advice. See the privacy policy for retained data and your rights." },
      ],
    },
    pricing: {
      label: "Pricing", title: "Patient search is always free.", summary: "Search and reservations are free for patients. The pharmacy plan is free through 30 September 2027; no payments are collected today.", action: "Explore the pharmacy workspace", image: "/art/neighbourhood.webp", imageAlt: "Illustration of an Algerian neighbourhood", facts: ["0 DA for patients", "Free through 30 September 2027", "No online payments"],
      sections: [
        { title: "For patients", body: "Search, reservations and route information are free. Patients pay the regulated price directly to the pharmacy at pickup, not to the platform.", detail: "LQADWA does not sell medicine or add a fee to its price." },
        { title: "For pharmacies", body: "The displayed plan is 300 DA per month after the free period, which runs through 30 September 2027.", detail: "Payments are not enabled. Do not send money to the platform; any price or subscription change will be announced before it takes effect." },
        { title: "Before your listing goes live", body: "A pharmacy creates an account, submits its details and waits for admin review. Only approved profiles appear in search.", detail: "There is no medicine commission or paid placement." },
      ], price: { amount: "Free now", oldAmount: "300 DA", period: "per month after 30 September 2027", note: "No payment collection is enabled." },
    },
    help: {
      label: "Help centre", title: "Answers before you begin.", summary: "Practical information for patients and pharmacies about search, stock, reservations and privacy.", action: "Create a patient account", image: "/art/neighbourhood.webp", imageAlt: "Illustration of an Algerian neighbourhood", facts: ["Dispensing at the pharmacy", "Reply from the pharmacist", "Email support"],
      sections: [{ title: "What do you need help with?", body: "Choose an answer below. For account help, contact support from the email address associated with your account.", detail: "Never email a password, diagnosis or prescription photo." }],
      questions: [
        { question: "Does the platform confirm stock?", answer: "No. The pharmacy replies to your request. Check when the reply was made and call before travelling if your plans change." },
        { question: "Can I get delivery or pay in the app?", answer: "No. A reservation only coordinates pickup. Dispensing and regulated payment take place directly at the pharmacy." },
        { question: "Do I need a prescription?", answer: "Bring the original prescription if the medicine requires one. The pharmacist checks dispensing rules at the counter." },
        { question: "Can I scan a prescription?", answer: "Yes, to suggest search text. Reading happens on your device and can be wrong; check the medicine name and strength." },
        { question: "Why can’t I see a nearby pharmacy?", answer: "Only registered and approved pharmacies in your search area appear. The service may not cover every area yet." },
        { question: "Are routes and public transit available everywhere?", answer: "Directions open through a public map provider. Walking, driving, bus and rail data depend on local coverage; check options and schedules before leaving." },
      ],
    },
  },
  kab: {
    "how-it-works": {
      label: "I yimseqdacen", title: "Seg yisem n ddwa ɣer tsaymit.", summary: "Nadi deg tama-k, rǧu tiririt n usaymas, sakin ḥrez i wawway deg tsaymit. LQADWA ad k-yemmel abrid; ur iznuz ara ddwa, ur t-tsiweḍ ara.", action: "Bdu anadi", image: "/art/walk.webp", imageAlt: "Abrid n uḍar deg lḥuma n Lezzayer", facts: ["Anadi baṭel", "Tiririt n tsaymit", "Awi seg tsaymit kan"],
      sections: [
        { title: "Aru isem afessas", body: "Aru isem n ddwa neɣ isem n umeskar-is d tezmert, sakin fren tamnaḍt. OCR yezmer ad d-yefk isem seg tugna deg yibenk-ik.", detail: "Wali aḍris uqbel azen: OCR yezmer ad yeɣleḍ, ladɣa deg tira n ufus. Tugna n tamedyazt d uḍris meṛṛa ur ttwaznen ara i uqeddac-nneɣ." },
        { title: "Rǧu aselken n usaymas", body: "Tuttra tawezlant ad truḥ ɣer tsaymitin iqerben, yettwajerden u yettwaqeblen. Asaymas ad d-yerr; axezzen yettwarun s ufus yezmer ad ibeddel.", detail: "Igmaḍ ttwasudsen ilmend n uqreb. Amsasa deg tebdart n ddwa mačči d aselken n uxezzen; yezmer ulac tixxamin deg temnaḍt-ik tura." },
        { title: "Ḥrez, sakin heggi abrid", body: "Seld aselken, tzemreḍ ad teḥrez ddwa i snat n tesragin, ad d-skenḍ QR deg tsaymit. Ldi abrid s uḍar, s tkarust neɣ s unagraw azayez ma llan yisefka.", detail: "Awi tawuri taṣṣelt ma tettwasra. Asaymas ad isenqed tiwtilin n usiweḍ; aḥraz mačči d aḍman n usiweḍ neɣ amḍiq n usesteb." },
      ],
    },
    "for-pharmacies": {
      label: "Tallunt n tsaymit", title: "Tuttriwin ifazen. Tadbelt s tefses.", summary: "Rnu tafelwit n tsaymit-ik. Seld aselken n tedbelt, err ɣef tuttriwin, beddel axezzen akked yiḥrazen deg yiwen n wadeg.", action: "Sekles tasaymit-ik", image: "/art/pharmacy.webp", imageAlt: "Tawlaft n yixxamen n ddwa", facts: ["Aselken uqbel ad d-tban", "Ulac anermis n yisnasen", "Ulac asiwed neɣ tafayt"],
      sections: [
        { title: "Asekles d uselken", body: "Azen isem, tansa, uṭṭun d yisefka n umahil. Tafelwit ur d-tban ara i yimeḍlan uqbel aselken d uqbal n tedbelt.", detail: "Aru isefka imeẓyanen u imeɣta. Asekles mačči d aselken n tɣiwant neɣ n tɣiwant n umahil." },
        { title: "Axezzen deg ufus-ik", body: "Rnu ddwa d umḍan neɣ beddel-it s ufus; wali tuttriwin. Ulac anermis akked useɣẓan n tixxamin neɣ tebdart tameqqrant n uxezzen.", detail: "Tabdart tettɛawan deg umahil, maca mačči d aselken n uxezzen s wakud. Senqed ddwa d tamedyazt uqbel aselken." },
        { title: "Err, heggi awi", body: "Err yella neɣ ulac-it. Seld aselken, ameḍlan yezmer ad yeḥrez aḥraz d QR, syin ad d-yas i wawway deg tsaymit.", detail: "Selken QR deg tsaymit. Abḍu n wadig d afran, yemmut ma yettwaḥbes neɣ ma ḥebsen yismiren; ulac aḍfar deg unagraw." },
      ],
    },
    safety: {
      label: "Taɣellist d tabaḍnit", title: "Isefka drus. Ifranen banen.", summary: "Ameẓlu n usenqed, mačči d aselmed n tedawsa neɣ aznuz n ddwa. Asaymas iɣleb deg tɣara n usesteb.", action: "Ɣer tasertit n tabaḍnit", image: "/art/prescription.webp", imageAlt: "Tawlaft n tiliɣri d lkaɣeḍ", facts: ["Ulac tugna n tamedyazt deg uqeddac", "Adeg d afran", "Ulac aznuz neɣ asiwed"],
      sections: [
        { title: "Ɣer deg yibenk, mačči d aselken n tedawsa", body: "Tugna n ddwa neɣ tamedyazt akked igemmaḍ OCR ttwaɣren deg yibenk-ik. Fren u wali isem uqbel ad tazenḍ tuttra.", detail: "OCR yezmer ad yeɣleḍ; ur iselken ara tamedyazt neɣ ddwa. Ur tazen ara aselmed n tedawsa neɣ tamedyazt i tallelt." },
        { title: "Bḍu ayen ilaqen kan", body: "Isem n ddwa d tamnaḍt n unadi iwakken ad d-yemmel tuttra. Isefka n umiḍan ttwassnen i unadi d uḥraz; ur nesri ara aselmed n tedawsa.", detail: "Adeg d afran. Ma tebḍiḍ abrid-ik, tasaymit n uḥraz kan ad t-wali s wakud ameẓyan; tzemreḍ ad tḥebseḍ." },
        { title: "Awi deg tsaymit", body: "Ulac aznuz deg usnas, asiwed n ddwa, tafayt ɣef ddwa neɣ asuddes n tixxamin s lexlaṣ.", detail: "Awi deg tsaymit kan. Asaymas ad isenqed tamedyazt d tewtilin n usiweḍ, ad ak-yefk tallelt. Wali tasertit n tabaḍnit i yisefka akked izerfan-ik." },
      ],
    },
    pricing: {
      label: "Azal", title: "Anadi i umuḍin d abaṭel.", summary: "Anadi d uḥraz d abaṭel i umuḍin. Aseɣẓan n tsaymit d abaṭel ar 30 septembre 2027; ulac lexlaṣ tura.", action: "Wali tallunt n tsaymit", image: "/art/neighbourhood.webp", imageAlt: "Tawlaft n lḥuma n Lezzayer", facts: ["0 DA i umuḍin", "Baṭel ar 30 septembre 2027", "Ulac lexlaṣ s Internet"],
      sections: [
        { title: "I yimseqdacen", body: "Anadi, aḥraz d yisefka n ubrid d imen. Ameḍlan ad ixelleṣ azal ameɣtu i tsaymit mi ara d-yawi ddwa, mačči i LQADWA.", detail: "LQADWA ur d-tzenz ara ddwa, ur ternu ara azal fell-as." },
        { title: "I tsaymitin", body: "Aseɣẓan yettwasken d 300 DA i yaggur seld tallit tabaṭelt, i yellan ar 30 septembre 2027.", detail: "Ulac lexlaṣ yermed tura. Ur tazen ara idrimen i LQADWA; yal abeddel n wazal neɣ n lexlaṣ ad d-yettwasekna uqbel ad yeddu." },
        { title: "Uqbel ad d-tban tsaymit-ik", body: "Tasaymit ad ternu amiḍan, ad tazen isefka, sakin ad tarǧu aselken n tedbelt. Tixxamin yettwaqeblen kan ad d-banen.", detail: "Ulac tafayt ɣef ddwa neɣ amḍiq s lexlaṣ." },
      ], price: { amount: "Baṭel tura", oldAmount: "300 DA", period: "i yaggur seld 30 septembre 2027", note: "Ulac lexlaṣ yermed tura." },
    },
    help: {
      label: "Tallelt", title: "Tiririt uqbel ad tebduḍ.", summary: "Talɣut i yimseqdacen d tsaymitin ɣef unadi, axezzen, aḥraz d tabaḍnit.", action: "Rnu amiḍan n umuḍin", image: "/art/neighbourhood.webp", imageAlt: "Tawlaft n lḥuma n Lezzayer", facts: ["Awi ddwa seg tsaymit", "Tiririt n usaymas", "Tallelt s imayl"],
      sections: [{ title: "D acu i tebɣiḍ ad tissineḍ?", body: "Fren tiririt ddaw. I talɣut n umiḍan, aru i tallelt seg imayl yettwaselken akked umiḍan-ik.", detail: "Ur tazen ara awal uffir, aselmed n tedawsa neɣ tugna n tamedyazt s imayl." }],
      questions: [
        { question: "LQADWA isebbet axezzen?", answer: "Ala. Tasaymit ad d-ter ɣef tuttra. Wali akud n tiririt, sakin nermes tasaymit uqbel abrid ma ibeddel ubrid-ik." },
        { question: "Yella usiwed neɣ lexlaṣ deg usnas?", answer: "Ala. Aḥraz i usuddes n wawway kan. Asiwed d lexlaṣ ameɣtu deg tsaymit kan." },
        { question: "Ilaq ad awiɣ tamedyazt?", answer: "Awi tamedyazt taṣṣelt ma ddwa ilaq-as. Asaymas ad isenqed tiwtilin n usiweḍ deg tsaymit." },
        { question: "Zemreɣ ad scan-eɣ tamedyazt?", answer: "Iwakken ad d-yefk aḍris i unadi kan. Aɣri yetteddu deg yibenk-ik yezmer ad yeɣleḍ; wali isem d tezmert." },
        { question: "Acuɣer ulac tasaymit iqerben?", answer: "Tixxamin yettwajerden u yettwaqeblen deg temnaḍt kan ad d-banen. Ameẓlu yezmer ur yewwi ara ɣer meṛṛa tama tura." },
        { question: "Ibriden d unagraw azayez llan yal tama?", answer: "Abrid ad yeldi deg useqdec n tkarḍa. Aḍar, tkarust, bus d train ilmend n yisefka n temnaḍt; wali leswaɛ uqbel abrid." },
      ],
    },
  },
};

export function publicInfoCopy(language: Language, page: PublicInfoPath) { return content[language][page]; }
export const publicInfoPages: PublicInfoPath[] = ["how-it-works", "for-pharmacies", "safety", "pricing", "help"];
