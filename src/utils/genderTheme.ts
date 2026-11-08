// Gender Theme Utility for Toghrool — Lex Colorful design language
// Male side = Lex Blue, Female side = Lex Pink. Everything else stays on the shared
// Lex canvas (#F5F3EF) so only the app bar, active nav, FAB and accents change color.

export type UserGender = 'male' | 'female';

export interface GenderThemeConfig {
  gender: UserGender;
  isMale: boolean;
  isFemale: boolean;
  label: string;
  partnerLabel: string;

  // Primary brand palette
  primaryColor: string;       // solid app-bar / FAB color
  primaryHover: string;
  primaryDark: string;        // text-safe darker tone
  primaryLight: string;       // light tint for chips
  primaryBgSoft: string;      // very soft tint
  primaryBorder: string;
  primaryText: string;

  // App bar
  headerBg: string;
  headerGradient: string;
  headerText: string;

  // Active Navigation
  activePillBg: string;
  activePillText: string;

  // Floating Action Button (FAB)
  fabBg: string;
  fabText: string;

  // Avatar Rings
  myAvatarRing: string;
  partnerAvatarRing: string;

  // Partner complementary theme
  partnerColor: string;
  partnerLight: string;
  partnerBgSoft: string;

  // Lex Tip card
  guidanceBg: string;
  guidanceBorder: string;
  guidanceIconBg: string;

  // Gradient pill used for the selected filter chip (Lex "My Trans Journey" pill)
  chipGradient: string;
}

export function getGenderTheme(gender?: string | null): GenderThemeConfig {
  const isFemale = gender === 'female';

  if (isFemale) {
    return {
      gender: 'female',
      isMale: false,
      isFemale: true,
      label: 'خانم',
      partnerLabel: 'آقا',

      primaryColor: '#FF7EB6',
      primaryHover: '#F86AA8',
      primaryDark: '#C2306F',
      primaryLight: '#FFD3E6',
      primaryBgSoft: '#FFEAF3',
      primaryBorder: '#1C1C1C',
      primaryText: '#B0285F',

      headerBg: 'bg-[#FF7EB6]',
      headerGradient: 'from-[#FF7EB6] to-[#F86AA8]',
      headerText: '#1C1C1C',

      activePillBg: 'bg-[#FF7EB6]',
      activePillText: 'text-[#1C1C1C]',

      fabBg: 'bg-[#FF7EB6] hover:bg-[#F86AA8]',
      fabText: 'text-[#1C1C1C]',

      myAvatarRing: 'ring-2 ring-white',
      partnerAvatarRing: 'ring-2 ring-white',

      partnerColor: '#4FA9F6',
      partnerLight: '#CFE6FC',
      partnerBgSoft: '#E8F3FE',

      guidanceBg: 'bg-[#FFC6DF]',
      guidanceBorder: 'border-[#1C1C1C]',
      guidanceIconBg: 'bg-white',

      chipGradient: 'bg-gradient-to-l from-[#FFC6DF] to-[#EBA2F8]'
    };
  }

  return {
    gender: 'male',
    isMale: true,
    isFemale: false,
    label: 'آقا',
    partnerLabel: 'خانم',

    primaryColor: '#4FA9F6',
    primaryHover: '#3C9AEC',
    primaryDark: '#1C6FB8',
    primaryLight: '#CFE6FC',
    primaryBgSoft: '#E8F3FE',
    primaryBorder: '#1C1C1C',
    primaryText: '#175E9E',

    headerBg: 'bg-[#4FA9F6]',
    headerGradient: 'from-[#4FA9F6] to-[#3C9AEC]',
    headerText: '#1C1C1C',

    activePillBg: 'bg-[#4FA9F6]',
    activePillText: 'text-[#1C1C1C]',

    fabBg: 'bg-[#4FA9F6] hover:bg-[#3C9AEC]',
    fabText: 'text-[#1C1C1C]',

    myAvatarRing: 'ring-2 ring-white',
    partnerAvatarRing: 'ring-2 ring-white',

    partnerColor: '#FF7EB6',
    partnerLight: '#FFD3E6',
    partnerBgSoft: '#FFEAF3',

    guidanceBg: 'bg-[#A8DBF4]',
    guidanceBorder: 'border-[#1C1C1C]',
    guidanceIconBg: 'bg-white',

    chipGradient: 'bg-gradient-to-l from-[#A8DBF4] to-[#A9ABEE]'
  };
}
