import { getNextMealDate } from "./date";
import { getImageUrlForKey } from "./image-uploader";
import { Theme } from "./theme";

export const getImageBackground = async (theme: Theme) => {
  const date = getNextMealDate();
  const key = getCacheKey(date, theme);
  const url = await getImageUrlForKey(key).catch((error) => {
    console.error(`Could not determine if an image already exists`, {
      error,
      key,
    });
    return FALLBACK_IMAGE;
  });

  if (!url) {
    console.warn("No image background found... using fallback image");
    return FALLBACK_IMAGE;
  }
  return url;
};

export const getCacheKey = (date: Date, theme: Theme): string => {
  // Convert Date object into ISO Date string (no timestamp) (example: 2024-07-31)
  const dateString = date.toISOString().split("T")[0];
  return `seedream-3-${theme}-${dateString}`;
};

const FALLBACK_IMAGE = "https://picsum.photos/id/292/1900/1300";
