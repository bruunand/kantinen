export const getThemeFromParams = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get("theme");
  if (!theme) {
    searchParams.delete("theme");
  }
  return parseTheme(theme);
};
const parseTheme = (theme: string | null) => {
  switch (theme) {
    case "prison":
      return theme;
    default:
      return "neutral";
  }
};

export type Theme = ReturnType<typeof getThemeFromParams>;
