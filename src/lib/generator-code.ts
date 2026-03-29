const GOV_CODES: Record<string, string> = {
  "بغداد": "BG", "البصرة": "BS", "نينوى": "NI", "أربيل": "ER",
  "السليمانية": "SU", "كركوك": "KI", "ديالى": "DI", "الأنبار": "AN",
  "صلاح الدين": "SD", "النجف": "NJ", "كربلاء": "KR", "بابل": "BB",
  "واسط": "WA", "ذي قار": "DQ", "ميسان": "MY", "المثنى": "MU",
  "القادسية": "QA", "دهوك": "DH",
};

export function generateAccessCode(tenantSeq: number, governorate?: string | null): string {
  const gov = governorate && GOV_CODES[governorate] ? GOV_CODES[governorate] : "IQ";
  return `AMPER-${gov}-${tenantSeq.toString().padStart(4, "0")}`;
}
