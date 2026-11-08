// Gender Theme Utility for Toghrool — Inspired by Lex Colorful Design
// Supports dynamic theming: Blue theme for Male side, Pink theme for Female side

export type UserGender = 'male' | 'female';

export interface GenderThemeConfig {
  gender: UserGender;
  isMale: boolean;
  isFemale: boolean;
  label: string;
  partnerLabel: string;
  
  // Primary brand palette
  primaryColor: string;       // e.g. '#38BDF8' (Sky Blue) | '#FB7185' (Blossom Rose)
  primaryHover: string;       // e.g. '#0EA5E9' | '#F43F5E'
  primaryDark: string;        // e.g. '#0284C7' | '#E11D48'
  primaryLight: string;       // e.g. '#E0F2FE' | '#FFE4E6'
  primaryBgSoft: string;      // e.g. '#F0F9FF' | '#FFF1F2'
  primaryBorder: string;      // '#141414'
  primaryText: string;        // e.g. '#0369A1' | '#BE123C'
  
  // Top Header styling
  headerBg: string;           // Tailwind class e.g. 'bg-[#38BDF8]' | 'bg-[#FB7185]'
  headerGradient: string;     // Tailwind gradient e.g. 'from-[#38BDF8] to-[#0EA5E9]'
  headerText: string;         // '#141414'
  
  // Active Navigation Pill
  activePillBg: string;       // 'bg-[#38BDF8]' | 'bg-[#FB7185]'
  activePillText: string;     // 'text-[#141414]' | 'text-white'
  
  // Floating Action Button (FAB)
  fabBg: string;              // 'bg-[#38BDF8] hover:bg-[#0EA5E9]' | 'bg-[#FB7185] hover:bg-[#F43F5E]'
  fabText: string;            // 'text-[#141414]' | 'text-white'
  
  // Avatar Rings
  myAvatarRing: string;       // 'ring-2 ring-[#0284C7]' | 'ring-2 ring-[#E11D48]'
  partnerAvatarRing: string;  // 'ring-2 ring-[#FB7185]' | 'ring-2 ring-[#38BDF8]'

  // Partner complementary theme (Her side when I am male, His side when I am female)
  partnerColor: string;       // '#FB7185' | '#38BDF8'
  partnerLight: string;       // '#FFE4E6' | '#E0F2FE'
  partnerBgSoft: string;      // '#FFF1F2' | '#F0F9FF'

  // Guidance card classes
  guidanceBg: string;         // 'bg-[#F0F9FF]' | 'bg-[#FFF1F2]'
  guidanceBorder: string;     // 'border-[#38BDF8]' or 'border-[#141414]'
  guidanceIconBg: string;     // 'bg-[#BAE6FD]' | 'bg-[#FCE7F3]'
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
      
      // Female Blossom Rose / Chic Pink palette
      primaryColor: '#FB7185',
      primaryHover: '#F43F5E',
      primaryDark: '#E11D48',
      primaryLight: '#FFE4E6',
      primaryBgSoft: '#FFF1F2',
      primaryBorder: '#141414',
      primaryText: '#BE123C',
      
      headerBg: 'bg-[#FB7185]',
      headerGradient: 'from-[#FB7185] to-[#F43F5E]',
      headerText: '#141414',
      
      activePillBg: 'bg-[#FB7185]',
      activePillText: 'text-white',
      
      fabBg: 'bg-[#FB7185] hover:bg-[#F43F5E]',
      fabText: 'text-white',
      
      myAvatarRing: 'ring-2 ring-[#E11D48]',
      partnerAvatarRing: 'ring-2 ring-[#0284C7]',
      
      partnerColor: '#38BDF8',
      partnerLight: '#E0F2FE',
      partnerBgSoft: '#F0F9FF',

      guidanceBg: 'bg-[#FFF1F2]',
      guidanceBorder: 'border-[#141414]',
      guidanceIconBg: 'bg-[#FCE7F3]'
    };
  }

  // Default: Male Sky / Electric Blue palette
  return {
    gender: 'male',
    isMale: true,
    isFemale: false,
    label: 'آقا',
    partnerLabel: 'خانم',
    
    primaryColor: '#38BDF8',
    primaryHover: '#0EA5E9',
    primaryDark: '#0284C7',
    primaryLight: '#E0F2FE',
    primaryBgSoft: '#F0F9FF',
    primaryBorder: '#141414',
    primaryText: '#0369A1',
    
    headerBg: 'bg-[#38BDF8]',
    headerGradient: 'from-[#38BDF8] to-[#0EA5E9]',
    headerText: '#141414',
    
    activePillBg: 'bg-[#38BDF8]',
    activePillText: 'text-[#141414]',
    
    fabBg: 'bg-[#38BDF8] hover:bg-[#0EA5E9]',
    fabText: 'text-[#141414]',
    
    myAvatarRing: 'ring-2 ring-[#0284C7]',
    partnerAvatarRing: 'ring-2 ring-[#E11D48]',
    
    partnerColor: '#FB7185',
    partnerLight: '#FFE4E6',
    partnerBgSoft: '#FFF1F2',

    guidanceBg: 'bg-[#F0F9FF]',
    guidanceBorder: 'border-[#141414]',
    guidanceIconBg: 'bg-[#BAE6FD]'
  };
}
