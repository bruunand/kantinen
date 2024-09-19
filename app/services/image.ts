import { getNextMealDate } from "./date";
import { generateImageForMeal } from "./image-generator";
import { getImageUrlForKey } from "./image-uploader";
import { Theme } from "./theme";

export const getImageBackground = async (
  meal: string | undefined,
  theme: Theme
) => {
  if (!meal) {
    return { imageUrl: FALLBACK_IMAGE };
  }
  const date = getNextMealDate();
  const key = getCacheKey(date, theme);
  const url = await getImageUrlForKey(key).catch((error) => {
    console.error(`Could not determine if an image already exists`, {
      error,
      key,
    });
    return FALLBACK_IMAGE;
  });

  if (url) {
    console.log("Found an existing image", { key, url });
    return { imageUrl: url };
  }

  // The image generation job is NOT awaited - by design. We want to return the promise, and await it later.
  // Once the "generate" route has matured and has been validated, remove this part and always return fallback image if we get to here
  const imageUrlJob = generateImageForMeal(key, meal, theme).catch((error) => {
    console.error("Could not generate image", { error, key, meal });
    return FALLBACK_IMAGE;
  });
  return {
    imageUrlJob,
  };
};

export const getCacheKey = (date: Date, theme: Theme): string => {
  // Convert Date object into ISO Date string (no timestamp) (example: 2024-07-31)
  const dateString = date.toISOString().split("T")[0];
  return `wip-${theme}-${dateString}`;
};

const FALLBACK_IMAGE = "https://picsum.photos/id/292/1900/1300";
