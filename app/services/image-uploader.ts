import { v2 as cloudinary } from "cloudinary";
import { getRequiredEnv } from "./variables";

cloudinary.config({
  cloud_name: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
  api_key: getRequiredEnv("CLOUDINARY_API_KEY"),
  api_secret: getRequiredEnv("CLOUDINARY_API_SECRET"),
});

export const persistImageInCloud = async (key: string, imgUrl: string) => {
  console.log("Caching image for future visits", { key, imgUrl });
  const uploadResult = await cloudinary.uploader.upload(imgUrl, {
    public_id: key,
    folder: "meals",
  });

  return uploadResult.url;
};

// Only positive results are cached: a missing image may be generated later
const urlCache = new Map<string, string>();

export const getImageUrlForKey = async (
  key: string
): Promise<string | null> => {
  const cachedUrl = urlCache.get(key);
  if (cachedUrl) {
    return cachedUrl;
  }

  // First check if it exists, if it does, get the url, else return null
  const existsSearch = await cloudinary.search
    .expression(`public_id:meals/${key}`)
    .execute();

  const url = existsSearch?.resources?.[0]?.url || null;
  if (url) {
    urlCache.set(key, url);
  }
  return url;
};
