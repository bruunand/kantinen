import { v2 as cloudinary } from "cloudinary";
import { getRequiredEnv } from "./variables";

cloudinary.config({
  cloud_name: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
  api_key: getRequiredEnv("CLOUDINARY_API_KEY"),
  api_secret: getRequiredEnv("CLOUDINARY_API_SECRET"),
});

export const persistImageInCloud = async (key: string, imgUrl: string) => {
  const uploadResult = await cloudinary.uploader.upload(imgUrl, {
    public_id: key,
    folder: "meals",
  });

  return uploadResult.url;
};

export const getImageUrlForKey = async (
  key: string
): Promise<string | null> => {
  // First check if it exists, if it does, get the url, else return null
  const existsSearch = await cloudinary.search
    .expression(`public_id:meals/${key}`)
    .execute();

  return existsSearch?.resources?.[0]?.url || null;
};
