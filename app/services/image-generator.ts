import { readFile } from "node:fs/promises";
import path from "node:path";
import { persistImageInCloud } from "./image-uploader";
import { Theme } from "./theme";
import { getRequiredEnv } from "./variables";

const CORAX_API_URL = "https://api.corax.app/v1";
const CORAX_CAPABILITY_ID = "371853b5-aada-4934-b161-5c37f5203c9a";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
const FAILED_STATUSES = ["failed", "failure", "error", "cancelled"];

const CONTEXT_IMAGE_DIR = path.join(process.cwd(), "resources");
const DRIVE_THRU_CHAINS = ["McDonald's", "Burger King"];

interface ThemePrompt {
  /** Called per generation so a theme can vary between runs. */
  describe: () => string;
  /** JPEG under resources/ that Corax gets as visual context for the scene. */
  contextImage?: string;
}

// Deliberately high level: the Corax capability owns the visual details, we
// only steer the setting and keep the props that make each theme recognizable.
export const themePrompts: Record<Theme, ThemePrompt> = {
  neutral: { describe: () => "Nordic minimalist restaurant" },
  prison: { describe: () => "Prison cafeteria" },
  streetfood: { describe: () => "Busy evening street food market" },
  sweatshop: { describe: () => "Code sweatshop, White Monster cans visible" },
  drivethru: {
    describe: () =>
      `${pickRandom(DRIVE_THRU_CHAINS)} drive-thru window, the person in this photo is the employee handing out the dish`,
    contextImage: "mpba.jpg",
  },
};

interface CoraxExecution {
  id: string;
  status: string;
  result?: { file_id: string };
}

/** Generates an image of the meal with Corax and stores it in the cloud under the given key. */
export const generateImageForMeal = async (
  key: string,
  meal: string,
  theme: Theme
) => {
  const themePrompt = themePrompts[theme];
  if (!themePrompt) {
    throw new Error(`Unsupported theme: ${theme}`);
  }

  const themeDescription = themePrompt.describe();
  const contextImages = themePrompt.contextImage
    ? [await readContextImage(themePrompt.contextImage)]
    : [];

  console.log("Generating image with Corax", {
    key,
    meal,
    theme,
    themeDescription,
  });

  const execution = await startExecution(meal, themeDescription, contextImages);
  const fileId = await waitForResultFile(execution.id);
  const image = await downloadFile(fileId);

  return await persistImageInCloud(key, image);
};

const coraxFetch = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${CORAX_API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      "X-API-Key": getRequiredEnv("CORAX_API_KEY"),
    },
  });
  if (!response.ok) {
    throw new Error(`Corax request to ${path} failed: ${response.status}`);
  }

  return response;
};

/** Reads an image from resources/ as a data URL, the format Corax accepts for blobs. */
const readContextImage = async (fileName: string): Promise<string> => {
  const image = await readFile(path.join(CONTEXT_IMAGE_DIR, fileName));
  return `data:image/jpeg;base64,${image.toString("base64")}`;
};

const startExecution = async (
  dish: string,
  theme: string,
  blobs: string[]
): Promise<CoraxExecution> => {
  const response = await coraxFetch(
    `/capabilities/${CORAX_CAPABILITY_ID}/executions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: {
          // isBirthday is required by the capability but never wanted here
          variables: { dish, theme, isBirthday: "false" },
          ...(blobs.length > 0 && { blobs }),
        },
      }),
    }
  );

  return (await response.json()) as CoraxExecution;
};

/** Polls the execution until it succeeds and returns the id of the generated file. */
const waitForResultFile = async (executionId: string): Promise<string> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await coraxFetch(
      `/capabilities/${CORAX_CAPABILITY_ID}/executions/${executionId}`
    );
    const execution = (await response.json()) as CoraxExecution;

    if (execution.status === "success" && execution.result?.file_id) {
      return execution.result.file_id;
    }
    if (FAILED_STATUSES.includes(execution.status)) {
      throw new Error(`Corax execution ${executionId} ${execution.status}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Corax execution ${executionId} timed out`);
};

const downloadFile = async (fileId: string) => {
  const response = await coraxFetch(`/files/${fileId}/content`);
  return Buffer.from(await response.arrayBuffer());
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pickRandom = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];
