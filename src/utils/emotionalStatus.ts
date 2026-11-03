export interface NeedStatusOption {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const NEED_STATUS_OPTIONS: NeedStatusOption[] = [
  {
    id: "calm",
    label: "حالم آروم و خوبه",
    shortLabel: "آرام و خوب",
    emoji: "🤍",
    color: "#1B1B1A",
    bgColor: "#FAF6EC",
    borderColor: "#E5E0D2",
    description: "اوضاع مرتبه و حس درونی پایداری دارم."
  },
  {
    id: "quiet",
    label: "فقط حضور ساکت می‌خوام",
    shortLabel: "حضور ساکت",
    emoji: "🛋️",
    color: "#4B5563",
    bgColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    description: "حرف زدن سخته، فقط پیشم باش بدون بازخواست یا پرسش."
  },
  {
    id: "hugs",
    label: "دلم یه بغل طولانی و عمیق می‌خواد",
    shortLabel: "نیاز به بغل",
    emoji: "🫂",
    color: "#EC407A",
    bgColor: "#FFF0F7",
    borderColor: "#F8BBD0",
    description: "به گرمای آغوش و حس امنیت برای آرامش نیاز دارم."
  },
  {
    id: "venting",
    label: "رو مود غر زدنم، فقط بشنو و تایید کن",
    shortLabel: "فقط گوش بده",
    emoji: "☕",
    color: "#D97706",
    bgColor: "#FEF3C7",
    borderColor: "#FDE68A",
    description: "راهکار منطقی نده! فقط بگو حق با توئه و کنارم باش."
  },
  {
    id: "energetic",
    label: "پرانرژی و شیطونم، بریم تفریح!",
    shortLabel: "پرانرژی و پایه",
    emoji: "⚡",
    color: "#059669",
    bgColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    description: "شارژم فوله و پایه‌ام برای بیرون رفتن یا شیطنت دونفره."
  },
  {
    id: "hungry",
    label: "گرسنمه و هوس خوراکی دارم",
    shortLabel: "هوس خوراکی",
    emoji: "🍕",
    color: "#EA580C",
    bgColor: "#FFEDD5",
    borderColor: "#FED7AA",
    description: "دلم یه غذای خوشمزه یا هوسانه سورپرایزی می‌خواد."
  },
  {
    id: "tired",
    label: "خسته و بی‌انرژی، استراحت مطلق",
    shortLabel: "خسته و له",
    emoji: "😴",
    color: "#475569",
    bgColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    description: "شارژ روانیم تموم شده؛ نیاز به خواب و شارژ مجدد دارم."
  }
];

export function getNeedStatusOption(id?: string): NeedStatusOption {
  const found = NEED_STATUS_OPTIONS.find((o) => o.id === id);
  return found || NEED_STATUS_OPTIONS[0];
}

export function getBatteryVisual(level: number = 80): {
  color: string;
  bgColor: string;
  label: string;
  icon: string;
} {
  if (level <= 25) {
    return {
      color: "#EF4444",
      bgColor: "#FEE2E2",
      label: "باتری ضعیف",
      icon: "🪫"
    };
  }
  if (level <= 50) {
    return {
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      label: "نیمه‌شارژ",
      icon: "🔋"
    };
  }
  if (level <= 80) {
    return {
      color: "#84CC16",
      bgColor: "#ECFCCB",
      label: "انرژی خوب",
      icon: "🔋"
    };
  }
  return {
    color: "#10B981",
    bgColor: "#D1FAE5",
    label: "پرانرژی",
    icon: "⚡"
  };
}
