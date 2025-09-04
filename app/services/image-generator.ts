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

  const imageBuffer = await generateImage(mealDescription);
  return await persistImageInCloud(key, imageBuffer);
};

const generateTextPromptForMeal = async (
  meal: string,
  theme: Theme
): Promise<string> => {
  const base = `
The image prompt needs the following key components in the description of the image.

Subject: The main focus of the image.

Style: The artistic approach or visual aesthetic.

Composition: How elements are arranged within the frame.

Lighting: The type and quality of light in the scene.

Color Palette: The dominant colors or color scheme.

Mood/Atmosphere: The emotional tone or ambiance of the image.

Technical Details: Camera settings, perspective, or specific visual techniques.

Additional Elements: Supporting details or background information.

The image should be as realistic as possible, with a high level of detail and texture.

Avoid including any text in the image.
  `;
  switch (theme) {
    case "neutral":
      return `Write a description of the dish: "${meal}".
      The description should be used for an image prompt.
      The theme of the image is fine and high quality dining, set in a Scandinavian restaurant.
     
      ${base}`;
    case "prison":
      return `Write a description of the dish: "${meal}".
      The description should be used for an image prompt.
      The theme of the image is food that is served in the prison.
      ${base}`;
    case "streetfood":
      return `Write a description of the dish: "${meal}".
      The description should be used for an image prompt.
      The theme of the image is a festive outdoor street food scene in the evening.
      ${base}`;
    case "manga":
      return `Write a description of the dish: "${meal}".
      The description should be used for an image prompt.
      The image should be a 3 frame manga drawing in colour, the first frame shows the food, the second frame a character eating the food and the third frame shows the same character being amazed by the flavour. The frames may overlap.
      ${base}`;
    case "sweatshop":
      return `Write a description of the dish "${meal}" to be used as an image prompt.
      The setting of the image is a dark office focused on software engineering.
      The image should include a group of hard working employees working on computers.
      Cans of White Monster energy drink should be visible on the desks.`;
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

const generateImage = async (prompt: string): Promise<Buffer> => {
  const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", {
    input: {
      prompt,
      aspect_ratio: "3:2",
      num_outputs: 1,
    },
  });

  if (!(output instanceof ReadableStream)) {
    throw new Error("Expected ReadableStream from image generator");
  }

  // Convert ReadableStream to Buffer
  const reader = output.getReader();
  const chunks: Uint8Array[] = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  
  const buffer = Buffer.concat(chunks);
  console.log("Generated image buffer", { size: buffer.length });
  
  return buffer;
};
