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
  const promptPrefix = `Create an image description for AI generation of the meal "${meal}"`;
  const promptPostfix = "Be creative and highly detailed. Respond ONLY with the description.";

  switch (theme) {
    case "neutral":
      return `${promptPrefix}: Photorealistic. Nordic minimalist restaurant setting. Clean white surfaces, natural lighting, shallow depth of field, elegant plating. ${promptPostfix}`;

    case "prison":
      return `${promptPrefix}: Photorealistic. Maximum security cafeteria. Stainless steel tray, fluorescent lighting, basic portions, utilitarian presentation. ${promptPostfix}`;

    case "streetfood":
      return `${promptPrefix}: Photorealistic. Evening food market scene. Golden hour lighting, food cart setting, steam rising, paper wrapping, vibrant street atmosphere. ${promptPostfix}`;

    case "manga":
      return `${promptPrefix}: Manga/anime art style. Character taking bite with surprised expression. Bold colors, speed lines, exaggerated effects. ${promptPostfix}`;

    case "sweatshop":
      return `${promptPrefix}: Photorealistic. Late-night office setting. Glowing computer monitors, desk with RGB coding equipment, Monster energy cans, tired developer atmosphere, blue screen glow mixed with warm desk lamps. ${promptPostfix}`;

    case "cyberpunk":
      return `${promptPrefix}: Cyberpunk restaurant. Neon lighting (pink, blue, green), chrome surfaces, holographic displays, rain-streaked windows, synthetic ingredients, high-tech dystopian atmosphere. ${promptPostfix}`;

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
  let output = await replicate.run("black-forest-labs/flux-schnell", {
    input: {
      prompt,
      aspect_ratio: "16:9",
      output_quality: 100,
      output_format: "jpg",
      num_outputs: 1,
    },
  });

  console.log(output);

  if (Array.isArray(output)) {
    output = output[0];
  }
  
  if (typeof output !== "string") {
    throw new Error("Expected image url from image generator");
  }

  return output;
};
