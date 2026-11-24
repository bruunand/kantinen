/** The theme named in the "theme" search param, if it is a known theme. */
export const getRequestedTheme = (request: Request): Theme | null => {
  const requested = new URL(request.url).searchParams.get("theme");

  return Themes.find((theme) => theme.id === requested)?.id ?? null;
};

/**
 * Picks the theme to show: the requested one if it has an image, otherwise a
 * random theme among those that do. Returns null when no theme is available.
 */
export const getThemeFromParams = (
  request: Request,
  availableThemes: Theme[]
): Theme | null => {
  const requested = getRequestedTheme(request);

  return (
    availableThemes.find((theme) => theme === requested) ??
    getRandomTheme(availableThemes)
  );
};

/**
 * The theme next to the current one in the given direction, or null at either
 * end of the list (no wrap around).
 */
export const getAdjacentTheme = (
  themes: Theme[],
  current: Theme | null,
  direction: "previous" | "next"
): Theme | null => {
  if (!current) {
    return null;
  }

  const currentIndex = themes.indexOf(current);
  if (currentIndex === -1) {
    return null;
  }

  const offset = direction === "next" ? 1 : -1;
  return themes[currentIndex + offset] ?? null;
};

const getRandomTheme = (themes: Theme[]): Theme | null => {
  if (themes.length === 0) {
    return null;
  }

  return themes[Math.floor(Math.random() * themes.length)];
};

export type Theme = (typeof Themes)[number]["id"];
export const Themes = [
  { id: "neutral", displayName: "✨ Neutral" },
  { id: "prison", displayName: "🧟 Prison" },
  { id: "streetfood", displayName: "🌯 Street Food" },
  { id: "sweatshop", displayName: "🏭 Sweatshop" },
  { id: "drivethru", displayName: "🍔 Drive-Thru" },
] as const;
