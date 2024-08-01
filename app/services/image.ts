import { getNextMealDate } from "./date";
import { generateImageForMeal } from "./image-generator";
import { getImageUrlForKey } from "./image-uploader";
import { Theme } from "./theme";

export const getImageBackground = async (
  meal: string | undefined,
  theme: Theme
) => {
  if (!meal) {
    return null;
  }
  const date = getNextMealDate();
  const key = getCacheKey(date, theme);
  const url = await getImageUrlForKey(key);

  if (url) {
    console.log("Found an existing image", { key, url });
    return url;
  }
  if (theme === "neutral") {
    console.error("skipping creating image for neutral theme");
    return null;
  }
  return await generateImageForMeal(key, meal, theme);
};

const getCacheKey = (date: Date, theme: Theme): string => {
  // Convert Date object into ISO Date string (no timestamp) (example: 2024-07-31)
  const dateString = date.toISOString().split("T")[0];
  return `${theme}-${dateString}`;
};
