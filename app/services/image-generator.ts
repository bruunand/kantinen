import Replicate from "replicate";
import { persistImageInCloud } from "./image-uploader";
import { Theme } from "./theme";
import { getRequiredEnv } from "./variables";

const replicate = new Replicate({
  auth: getRequiredEnv("REPLICATE_API_TOKEN"),
});

export const generateImageForMeal = async (
  key: string,
  meal: string,
  theme: Theme
) => {
  console.log("Generating prompt for a new image", { key, meal, theme });
  const mealDescriptionPrompt = await generateTextPromptForMeal(meal, theme);
  const mealDescription = await runTextPrompt(mealDescriptionPrompt);
  console.log("Generating image with prompt", { prompt: mealDescription });

  const imageUrl = await generateImage(mealDescription);
  return await persistImageInCloud(key, imageUrl);
};

const generateTextPromptForMeal = async (
  meal: string,
  theme: Theme
): Promise<string> => {
  const baseStyle = "Ensure professional food photography, high detail, high creativity, photorealistic, appetizing aesthetics. Respond only with the prompt.";
  const promptPrefix = `Create a highly detailed image description for AI generation of the meal "${meal}"`;

  switch (theme) {
    case "neutral":
      return `${promptPrefix}: Nordic minimalist restaurant setting. Clean white surfaces, natural lighting, shallow depth of field, elegant plating. ${baseStyle}`;

    case "prison":
      return `${promptPrefix}: Institutional cafeteria. Stainless steel tray, fluorescent lighting, basic portions, utilitarian presentation. ${baseStyle}`;

    case "streetfood":
      return `${promptPrefix}: Evening food market scene. Golden hour lighting, food cart setting, steam rising, paper wrapping, vibrant street atmosphere. ${baseStyle}`;

    case "manga":
      return `${promptPrefix}: Manga/anime art style. Three-panel composition: close-up of food, character taking bite with surprised expression, explosive flavor reaction. Bold colors, speed lines, exaggerated effects. ${baseStyle}`;

    case "sweatshop":
      return `${promptPrefix}: Late-night office setting. Glowing computer monitors, desk with coding equipment, Monster energy cans, tired developer atmosphere, blue screen glow mixed with warm desk lamps. ${baseStyle}`;

    case "cyberpunk":
      return `${promptPrefix}: Cyberpunk restaurant. Neon lighting (pink, blue, green), chrome surfaces, holographic displays, rain-streaked windows, synthetic ingredients, high-tech dystopian atmosphere. ${baseStyle}`;

    default:
      throw new Error(`Unsupported theme: ${theme}`);
  }
};

const runTextPrompt = async (prompt: string) => {
  // https://replicate.com/meta/meta-llama-3-8b-instruct/api
  const output = await replicate.run("openai/gpt-5-nano", {
    input: {
      prompt,
      max_tokens: 1024,
      prompt_template:
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
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
  const output = await replicate.run("bytedance/seedream-3", {
    input: {
      prompt,
      aspect_ratio: "16:9",
      num_outputs: 1,
    },
  });

  console.log(output);

  if (typeof output !== "string") {
    throw new Error("Expected image url from image generator");
  }

  return output;
};
