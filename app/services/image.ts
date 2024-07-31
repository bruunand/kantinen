import { generateImageForMeal } from "./image-generator";
import { getImageUrlForKey } from "./image-uploader";

export const getImageBackground = async (meal: string | undefined) => {
  if (!meal) {
    return null;
  }
  const date = new Date();
  const key = mapDateToKey(date);
  const url = await getImageUrlForKey(key);

  if (url) {
    console.log("Found an existing image", { key, url });
    return url;
  }
  return await generateImageForMeal(key, meal);
};

const mapDateToKey = (date: Date): string => {
  // Convert Date object into ISO Date string (no timestamp)
  return date.toISOString().split("T")[0];
};
