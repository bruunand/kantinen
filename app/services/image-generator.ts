import { persistImageInCloud } from "./image-uploader";
import { getRequiredEnv } from "./variables";

export const generateImageForMeal = async (key: string, meal: string) => {
  console.log("Generating a new image", { key, meal });
  const prompt = generateImagePromptForMeal(meal);

  const imageUrl = await generateImage(prompt);
  return await persistImageInCloud(key, imageUrl);
};

const generateImagePromptForMeal = (meal: string): string => {
  return (
    "Create a high-resolution image of a beautifully arranged meal on a stylish table setting. " +
    `The scene should feature ${meal} on elegant plates, garnished with fresh herbs and colorful vegetables. ` +
    "The background should be softly blurred to emphasize the food, with warm, natural lighting that highlights " +
    "the textures and vibrant colors of the dishes. Include tasteful cutlery and a clean napkin, to complete the inviting and appetizing presentation."
  );
};

const generateImage = async (prompt: string): Promise<string> => {
  const resp = await fetch("https://api.limewire.com/api/image/generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Version": "v1",
      Accept: "application/json",
      Authorization: `Bearer ${LIMEWIRE_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "19:13",
    }),
  });

  const data = (await resp.json()) as LimewireCreateImageApiResponse;
  if (data.status !== "COMPLETED") {
    throw new Error("Image generation failed");
  }
  const url = data.data[0]?.asset_url;
  if (!url) {
    throw new Error("Could not find generated image url");
  }
  return url;
};

const LIMEWIRE_API_KEY = getRequiredEnv("LIMEWIRE_API_KEY");

interface LimewireCreateImageApiResponse {
  id: string;
  self: string; // "https://studio.limewire.com/request/296a972f-666a-44a1-a3df-c9c28a1f56c0";
  status: string; // "COMPLETED";
  credits_used: number;
  credits_remaining: number;
  data: [
    {
      asset_id: string;
      self: string; // "https://studio.limewire.media/assets/116a972f-666a-44a1-a3df-c9c28a1f56c0";
      asset_url: string;
      type: "image/jpeg";
      width: number;
      height: number;
    }
  ];
}
