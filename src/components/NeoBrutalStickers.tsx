import React from "react";

/**
 * Bespoke Neobrutalist Retro Rubber-Hose Cartoon Stickers & Mascots
 * Inspired by classic 90s/rubber-hose character illustrations with bold #1C1C1C ink outlines,
 * expressive cartoon eyes, gloves/sneakers, and 4-point sparkles (✦).
 */

export const NeoSparkle: React.FC<{ className?: string; fill?: string }> = ({
  className = "w-5 h-5",
  fill = "#FFFFFF",
}) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M16 2C16.8 9.8 22.2 15.2 30 16C22.2 16.8 16.8 22.2 16 30C15.2 22.2 9.8 16.8 2 16C9.8 15.2 15.2 9.8 16 2Z"
      fill={fill}
      stroke="#1C1C1C"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const NeoZigZagTrend: React.FC<{ className?: string }> = ({ className = "w-8 h-5" }) => (
  <svg viewBox="0 0 36 20" fill="none" className={className} aria-hidden="true">
    <path
      d="M2 16L11 8L17 13L29 3M29 3H21M29 3V10"
      stroke="#1C1C1C"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Category Sticker Mascots for Wish Cards (Cake on Skates, Sushi Stack, Cool Gift, Retro TV, etc.)
 */
export const NeoWishSticker: React.FC<{ category: string; className?: string }> = ({
  category,
  className = "w-24 h-24",
}) => {
  switch (category) {
    case "trip":
      // Retro Cartoon Suitcase with Roller Skates & Cute Eyes
      return (
        <svg viewBox="0 0 110 110" fill="none" className={className} aria-hidden="true">
          {/* Sparkle */}
          <path d="M18 14C18.5 18.5 21.5 21.5 26 22C21.5 22.5 18.5 25.5 18 30C17.5 25.5 14.5 22.5 10 22C14.5 21.5 17.5 18.5 18 14Z" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2" />
          {/* Suitcase Handle */}
          <path d="M42 26V18C42 14.5 44.5 12 48 12H64C67.5 12 70 14.5 70 18V26" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
          {/* Rubber-hose Arms */}
          <path d="M24 54C14 50 11 42 15 36" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="15" cy="35" r="5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <path d="M88 54C97 49 100 41 96 35" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="96" cy="34" r="5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          {/* Main Tilted Suitcase Body */}
          <rect x="24" y="25" width="64" height="50" rx="12" transform="rotate(-4 56 50)" fill="#FFB5E8" stroke="#1C1C1C" strokeWidth="2.6" />
          {/* Decorative Stripes & Travel Patch */}
          <path d="M36 25L39 74" stroke="#1C1C1C" strokeWidth="2.2" />
          <path d="M74 23L77 72" stroke="#1C1C1C" strokeWidth="2.2" />
          <rect x="44" y="30" width="22" height="9" rx="4.5" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="2" />
          {/* Cute Cartoon Eyes & Smile */}
          <ellipse cx="50" cy="49" rx="4.5" ry="6" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="51" cy="49" r="2.2" fill="#1C1C1C" />
          <ellipse cx="62" cy="48" rx="4.5" ry="6" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="63" cy="48" r="2.2" fill="#1C1C1C" />
          <path d="M51 59C54 63 59 63 62 58" stroke="#1C1C1C" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M54 60.5C55 64 58 64 59 60.5" fill="#FF6B6B" />
          {/* Legs & Roller Skates */}
          <path d="M44 74L41 88" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M68 73L71 88" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="31" y="86" width="18" height="10" rx="5" fill="#43D9BD" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="35" cy="99" r="3" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2" />
          <circle cx="45" cy="99" r="3" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2" />
          <rect x="64" y="86" width="18" height="10" rx="5" fill="#43D9BD" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="68" cy="99" r="3" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2" />
          <circle cx="78" cy="99" r="3" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2" />
        </svg>
      );

    case "place":
    case "food":
      // Layered Cake / Pastry on Roller Skates (Direct homage to Screen 1!)
      return (
        <svg viewBox="0 0 110 110" fill="none" className={className} aria-hidden="true">
          {/* Frosting Top */}
          <path d="M26 38C26 27 42 20 58 20C74 20 86 28 86 38Z" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Cherry / Topping */}
          <circle cx="46" cy="18" r="7" fill="#FF6B6B" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="66" cy="21" r="6" fill="#A9ABEE" stroke="#1C1C1C" strokeWidth="2.2" />
          {/* Cake Wedge Layers */}
          <rect x="26" y="36" width="60" height="40" rx="8" fill="#FF9AA2" stroke="#1C1C1C" strokeWidth="2.6" />
          <line x1="26" y1="49" x2="86" y2="49" stroke="#1C1C1C" strokeWidth="2.2" />
          <line x1="26" y1="62" x2="86" y2="62" stroke="#1C1C1C" strokeWidth="2.2" />
          {/* Cute Cartoon Eyes */}
          <ellipse cx="50" cy="48" rx="4.5" ry="6.5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="51" cy="48" r="2.3" fill="#1C1C1C" />
          <ellipse cx="61" cy="48" rx="4.5" ry="6.5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="62" cy="48" r="2.3" fill="#1C1C1C" />
          {/* Cheeky Smile */}
          <path d="M49 58C52 63 60 63 63 58" fill="#1C1C1C" stroke="#1C1C1C" strokeWidth="2" strokeLinecap="round" />
          {/* Arms */}
          <path d="M26 52C16 48 13 41 16 35" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="16" cy="34" r="4.5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2" />
          <path d="M86 52C95 48 98 41 95 35" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="95" cy="34" r="4.5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2" />
          {/* Legs & Skates */}
          <path d="M42 76L39 90" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M70 76L73 90" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="29" y="88" width="18" height="9" rx="4.5" fill="#43D9BD" stroke="#1C1C1C" strokeWidth="2.2" />
          <rect x="65" y="88" width="18" height="9" rx="4.5" fill="#43D9BD" stroke="#1C1C1C" strokeWidth="2.2" />
          <circle cx="33" cy="100" r="2.8" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="1.8" />
          <circle cx="43" cy="100" r="2.8" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="1.8" />
          <circle cx="69" cy="100" r="2.8" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="1.8" />
          <circle cx="79" cy="100" r="2.8" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="1.8" />
        </svg>
      );

    case "buy":
      // Cool Gift Box Character with Sunglasses & Thumbs Up
      return (
        <svg viewBox="0 0 110 110" fill="none" className={className} aria-hidden="true">
          {/* Ribbon Bow */}
          <path d="M55 24C44 12 32 16 38 25C43 28 50 26 55 24Z" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2.4" />
          <path d="M55 24C66 12 78 16 72 25C67 28 60 26 55 24Z" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2.4" />
          {/* Lid */}
          <rect x="24" y="24" width="62" height="14" rx="5" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="2.5" />
          {/* Gift Body */}
          <rect x="28" y="38" width="54" height="42" rx="9" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.5" />
          <rect x="50" y="24" width="10" height="56" fill="#FF8566" stroke="#1C1C1C" strokeWidth="2.2" />
          {/* Cool Retro Sunglasses */}
          <rect x="34" y="45" width="19" height="12" rx="4" fill="#1C1C1C" stroke="#1C1C1C" strokeWidth="2" />
          <rect x="57" y="45" width="19" height="12" rx="4" fill="#1C1C1C" stroke="#1C1C1C" strokeWidth="2" />
          <line x1="53" y1="49" x2="57" y2="49" stroke="#1C1C1C" strokeWidth="2.6" />
          <line x1="37" y1="48" x2="43" y2="48" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="48" x2="66" y2="48" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          {/* Happy Grin */}
          <path d="M46 65C50 70 60 70 64 65" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" />
          {/* Arms & Sneakers */}
          <path d="M28 56C17 53 14 45 18 39" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="18" cy="38" r="5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <path d="M82 56C93 53 96 45 92 39" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="92" cy="38" r="5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
          <path d="M43 80V92" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M67 80V92" stroke="#1C1C1C" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="40" cy="95" rx="9" ry="5" fill="#A9ABEE" stroke="#1C1C1C" strokeWidth="2.2" />
          <ellipse cx="70" cy="95" rx="9" ry="5" fill="#A9ABEE" stroke="#1C1C1C" strokeWidth="2.2" />
        </svg>
      );

    default:
      // Stacked Happy Characters (Sushi / Popcorn / Experience Stack homage to Screen 1!)
      return (
        <svg viewBox="0 0 110 110" fill="none" className={className} aria-hidden="true">
          {/* Top Character */}
          <rect x="33" y="16" width="44" height="28" rx="12" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.5" />
          <circle cx="49" cy="29" r="3" fill="#1C1C1C" />
          <circle cx="61" cy="29" r="3" fill="#1C1C1C" />
          <path d="M51 36C53 39 57 39 59 36" stroke="#1C1C1C" strokeWidth="2.2" strokeLinecap="round" />
          {/* Middle Character */}
          <rect x="29" y="42" width="52" height="30" rx="13" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="2.5" />
          <circle cx="48" cy="55" r="3.2" fill="#1C1C1C" />
          <circle cx="62" cy="55" r="3.2" fill="#1C1C1C" />
          <path d="M50 63C53 66 57 66 60 63" stroke="#1C1C1C" strokeWidth="2.2" strokeLinecap="round" />
          {/* Arms */}
          <path d="M29 55C18 51 15 43 19 37" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="19" cy="36" r="4.5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2" />
          <path d="M81 55C92 51 95 43 91 37" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="91" cy="36" r="4.5" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2" />
          {/* Bottom Character */}
          <rect x="31" y="70" width="48" height="28" rx="12" fill="#B5F279" stroke="#1C1C1C" strokeWidth="2.5" />
          <circle cx="49" cy="82" r="3" fill="#1C1C1C" />
          <circle cx="61" cy="82" r="3" fill="#1C1C1C" />
          <path d="M50 89C53 92 57 92 60 89" stroke="#1C1C1C" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
};

/**
 * Hero Couple Mascot with Cap, Sunglasses, Gloves & Sneakers (Homage to Screen 3 Mascot!)
 */
export const NeoCoolHeartMascot: React.FC<{ className?: string }> = ({ className = "w-32 h-32" }) => (
  <svg viewBox="0 0 140 140" fill="none" className={className} aria-hidden="true">
    {/* Sparkles around mascot */}
    <path d="M22 22C22.6 27.5 26.5 31.4 32 32C26.5 32.6 22.6 36.5 22 42C21.4 36.5 17.5 32.6 12 32C17.5 31.4 21.4 27.5 22 22Z" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.2" />
    <path d="M118 16C118.5 20.5 121.5 23.5 126 24C121.5 24.5 118.5 27.5 118 32C117.5 27.5 114.5 24.5 110 24C114.5 23.5 117.5 20.5 118 16Z" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="2.2" />
    {/* Rubber-hose Legs & Big White Sneakers */}
    <path d="M56 96C54 108 53 116 53 122" stroke="#1C1C1C" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M84 96C86 108 87 116 87 122" stroke="#1C1C1C" strokeWidth="5.5" strokeLinecap="round" />
    <rect x="36" y="118" width="26" height="14" rx="7" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.6" />
    <rect x="78" y="118" width="26" height="14" rx="7" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.6" />
    {/* Main Plump Heart Body */}
    <path
      d="M70 104C70 104 26 79 26 48C26 33 38 23 51 23C60 23 66 28 70 35C74 28 80 23 89 23C102 23 114 33 114 48C114 79 70 104 70 104Z"
      fill="#FF8566"
      stroke="#1C1C1C"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Retro Cap on Top */}
    <path d="M46 28C48 15 62 10 78 13C89 15 95 22 94 30Z" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.6" />
    <path d="M42 27C55 24 78 25 99 31C93 35 60 34 42 27Z" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="2.6" />
    {/* Cool Red-Framed Sunglasses */}
    <rect x="42" y="44" width="24" height="15" rx="5" fill="#1C1C1C" stroke="#FFFFFF" strokeWidth="2.2" />
    <rect x="74" y="44" width="24" height="15" rx="5" fill="#1C1C1C" stroke="#FFFFFF" strokeWidth="2.2" />
    <line x1="66" y1="50" x2="74" y2="50" stroke="#FFFFFF" strokeWidth="2.8" />
    <line x1="46" y1="48" x2="54" y2="48" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="78" y1="48" x2="86" y2="48" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    {/* Cheeky Grin & Tongue */}
    <path d="M55 68C61 76 79 76 85 68" fill="#1C1C1C" stroke="#1C1C1C" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M65 71C65 78 75 78 75 71" fill="#FFB5E8" stroke="#1C1C1C" strokeWidth="2" />
    {/* Rubber-hose Arms & Gloved Thumbs-Up */}
    <path d="M31 62C18 68 17 82 28 86" stroke="#1C1C1C" strokeWidth="5" strokeLinecap="round" />
    <circle cx="31" cy="86" r="7" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.5" />
    <path d="M109 62C122 68 123 82 112 86" stroke="#1C1C1C" strokeWidth="5" strokeLinecap="round" />
    <circle cx="109" cy="86" r="7" fill="#FFFFFF" stroke="#1C1C1C" strokeWidth="2.5" />
  </svg>
);
