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
  console.log("Generating prompt for a new image", { key, meal, theme });
  const mealDescription = await runTextPrompt(
    generateTextPromptForMeal(meal, theme)
  );
  console.log("Generating image with prompt", { prompt: mealDescription });

  const imageUrl = await generateImage(mealDescription);
  return await persistImageInCloud(key, imageUrl);
};

const PROMPT_WRITER_SYSTEM_PROMPT = `You write prompts for a text-to-image model.
Given a meal and a style brief, respond with a single image prompt in English as one flowing paragraph.

Rules:
- The dish is the hero: name its actual components and describe their colors, textures and plating so the food is instantly recognizable. Do not invent components the meal name doesn't imply.
- Meal names may be in Danish; translate them and depict the dish faithfully.
- Composition: one plated serving as the clear focal point, seen from a natural three-quarter angle, with the frame wide enough that the surrounding setting and its props stay clearly visible around and behind the dish.
- Weave in every element of the style brief (setting, props, lighting, mood, medium) and let its mood win: a bleak brief means bleak, carelessly served food; an inviting brief means steam, gloss and fresh color.
- Respond ONLY with the prompt, no quotes or preamble.`;

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

const generateTextPromptForMeal = (meal: string, theme: Theme): string => {
  const styleBrief = themeStyleBriefs[theme];
  if (!styleBrief) {
    throw new Error(`Unsupported theme: ${theme}`);
  }
  return `Meal: "${meal}"\nStyle brief: ${styleBrief}`;
};

const runTextPrompt = async (prompt: string) => {
  // https://replicate.com/openai/gpt-5-mini/api
  const output = await replicate.run("openai/gpt-5-mini", {
    input: {
      prompt,
      system_prompt: PROMPT_WRITER_SYSTEM_PROMPT,
    },
  });
  if (typeof output === "string") {
    return output;
  }
  if (Array.isArray(output)) {
    return output.join("");
  }
  throw new Error("Invalid response from Replicate: " + typeof output);
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
