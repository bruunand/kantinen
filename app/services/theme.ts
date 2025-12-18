export const getThemeFromParams = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get("theme");
  return parseTheme(theme);
};

const parseTheme = (theme: string | null): Theme => {
  return Themes.find((t) => t.id === theme)?.id ?? getRandomTheme();
};

const getRandomTheme = (): Theme => {
  const randomIndex = Math.floor(Math.random() * Themes.length);
  return Themes[randomIndex].id;
};

export type Theme = (typeof Themes)[number]["id"];
export const Themes = [
  { id: "neutral", displayName: "✨ Neutral" },
  { id: "prison", displayName: "🧟 Prison" },
  { id: "streetfood", displayName: "🌯 Street Food" },
  { id: "manga", displayName: "🍜 Manga" },
  { id: "sweatshop", displayName: "🏭 Sweatshop" },
  { id: "cyberpunk", displayName: "👾 Cyberpunk" },
] as const;
