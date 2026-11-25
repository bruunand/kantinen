import { getImageUrlForKey } from "./image-uploader";
import { Theme, Themes } from "./theme";

export interface ThemeImage {
  theme: Theme;
  url: string;
}

/**
 * Looks up which themes already have a generated image for the date.
 * Lookup failures count as unavailable so one broken theme never hides the rest.
 */
export const getAvailableImages = async (date: Date): Promise<ThemeImage[]> => {
  const lookups = await Promise.all(
    Themes.map(async ({ id }) => {
      const key = getCacheKey(date, id);
      const url = await getImageUrlForKey(key).catch((error) => {
        console.error("Could not determine if an image already exists", {
          error,
          key,
        });
        return null;
      });

      return { theme: id, url };
    })
  );

  return lookups.filter((lookup): lookup is ThemeImage => Boolean(lookup.url));
};

// Bump to invalidate all cached images (e.g. after changing image model or prompts)
const IMAGE_CACHE_VERSION = "v3.4-corax";

// Bump a theme here to regenerate only its images (e.g. after changing just its
// prompt). Themes without an entry keep their keys, so their images stay cached.
const THEME_CACHE_VERSIONS: Partial<Record<Theme, number>> = {
  drivethru: 2,
};

export const getCacheKey = (date: Date, theme: Theme): string => {
  // Convert Date object into ISO Date string (no timestamp) (example: 2024-07-31)
  const dateString = date.toISOString().split("T")[0];

  const themeVersion = THEME_CACHE_VERSIONS[theme];
  const themeKey = themeVersion ? `${theme}-v${themeVersion}` : theme;

  return `${IMAGE_CACHE_VERSION}-${themeKey}-${dateString}`;
};

export const FALLBACK_IMAGE = "https://picsum.photos/id/292/1900/1300";
