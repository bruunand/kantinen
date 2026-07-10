import Replicate from "replicate";
import { persistImageInCloud } from "./image-uploader";
import { Theme } from "./theme";
import { getRequiredEnv } from "./variables";

const replicate = new Replicate({
  auth: getRequiredEnv("REPLICATE_API_TOKEN"),
  // replicate >=1.0 returns FileOutput streams by default; we rely on URL strings
  useFileOutput: false,
});

export const generateImageForMeal = async (
  key: string,
  meal: string,
  theme: Theme
) => {
  const prompt = buildImagePrompt(meal, theme);
  console.log("Generating image with prompt", { key, meal, theme, prompt });

  const imageUrl = await generateImage(prompt);
  return await persistImageInCloud(key, imageUrl);
};

const themeStyleBriefs: Record<Theme, string> = {
  neutral:
    "Photorealistic food photography. Nordic minimalist restaurant: handmade ceramic plate on a pale oak table, soft diffused daylight from a window, muted natural tones, shallow depth of field, 85mm macro lens, refined plating with delicate garnish.",

  prison:
    "Photorealistic. Maximum security prison cafeteria: dented stainless steel compartment tray, carelessly slopped portions, harsh green-tinted fluorescent light, scratched metal table bolted to the floor, gray concrete walls, bleak institutional mood.",

  streetfood:
    "Photorealistic. Bustling evening street food market: dish served in greaseproof paper at a food cart, steam rising, sizzling grill, golden hour glow mixed with string lights, blurred crowd and market stalls in the background, vibrant and lively.",

  sweatshop:
    "Photorealistic. Late-night developer den: meal balanced next to an RGB mechanical keyboard on a cluttered desk, glow of code-filled monitors, crushed Monster energy drink cans, tangled cables, cold blue screen light mixed with a warm desk lamp, crunch-time atmosphere.",
};

const buildImagePrompt = (meal: string, theme: Theme): string => {
  const styleBrief = themeStyleBriefs[theme];
  if (!styleBrief) {
    throw new Error(`Unsupported theme: ${theme}`);
  }
  return `A plated serving of "${meal}" as the clear focal point. ${styleBrief}`;
};

const generateImage = async (prompt: string): Promise<string> => {
  const output = await replicate.run("prunaai/z-image-turbo", {
    input: {
      prompt,
      width: 1280,
      height: 720,
      output_quality: 100,
      output_format: "jpg",
    },
  });

  console.log(output);


  if (typeof output !== "string") {
    throw new Error("Expected image url from image generator");
  }

  return output;
};
