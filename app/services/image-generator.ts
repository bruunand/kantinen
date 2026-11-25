import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getWeekdayDates, getWeekdayIndex } from "./date";
import { persistImageInCloud } from "./image-uploader";
import { getMatchingEmojis } from "./meal-name";
import { shuffleWithSeed } from "./random";
import { Theme } from "./theme";
import { getRequiredEnv } from "./variables";

const CORAX_API_URL = "https://api.corax.app/v1";
const CORAX_CAPABILITY_ID = "371853b5-aada-4934-b161-5c37f5203c9a";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
const FAILED_STATUSES = ["failed", "failure", "error", "cancelled"];

const CONTEXT_IMAGE_DIR = path.join(process.cwd(), "resources");
const CONTEXT_IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const BURGER_CHAINS = ["McDonald's", "Burger King"];
const POULTRY_CHAIN = "KFC";
const POULTRY_EMOJIS = ["🐔", "🦃"];

interface ThemePrompt {
  /** Called per generation so a theme can vary between runs and react to the meal. */
  describe: (meal: string) => string;
  /** Send a photo from resources/ to Corax as visual context for the scene. */
  usesContextImage?: boolean;
}

// Deliberately high level: the Corax capability owns the visual details, we
// only steer the setting and keep the props that make each theme recognizable.
export const themePrompts: Record<Theme, ThemePrompt> = {
  neutral: { describe: () => "Nordic minimalist restaurant" },
  prison: { describe: () => "Prison cafeteria" },
  streetfood: { describe: () => "Busy evening street food market" },
  sweatshop: { describe: () => "Code sweatshop, White Monster cans visible" },
  drivethru: {
    describe: (meal) =>
      `${pickDriveThruChain(meal)} drive-thru window, the person in this photo is the employee handing out the dish`,
    usesContextImage: true,
  },
};

interface CoraxExecution {
  id: string;
  status: string;
  result?: { file_id: string };
}

/**
 * Generates an image of the date's meal with Corax and stores it in the cloud
 * under the given key.
 */
export const generateImageForMeal = async (
  key: string,
  meal: string,
  theme: Theme,
  date: Date
) => {
  const themePrompt = themePrompts[theme];
  if (!themePrompt) {
    throw new Error(`Unsupported theme: ${theme}`);
  }

  const themeDescription = themePrompt.describe(meal);
  const contextImages = themePrompt.usesContextImage
    ? [await readContextImageForDate(date)]
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

/**
 * Reads the date's photo from resources/ and returns it as a data URL, the format
 * Corax accepts for blobs. Listed per call so dropping in a photo needs no code change.
 */
const readContextImageForDate = async (date: Date): Promise<string> => {
  const fileNames = await readdir(CONTEXT_IMAGE_DIR);
  const imageNames = fileNames.filter((name) =>
    Boolean(getImageMimeType(name))
  );
  if (imageNames.length === 0) {
    throw new Error(`No context images found in ${CONTEXT_IMAGE_DIR}`);
  }

  const fileName = pickContextImageForDate(imageNames, date);
  const image = await readFile(path.join(CONTEXT_IMAGE_DIR, fileName));

  return `data:${getImageMimeType(fileName)};base64,${image.toString("base64")}`;
};

/**
 * Shuffles the photos once per week and gives each weekday its own slot, so
 * nobody shows up twice in a week while the order still varies week to week.
 * Repeats only happen when there are fewer photos than weekdays.
 */
const pickContextImageForDate = (imageNames: string[], date: Date): string => {
  const [monday] = getWeekdayDates(date);
  const weekSeed = monday.toDateString();

  // Sorted so the shuffle does not depend on the order readdir lists files in
  const sortedNames = [...imageNames].sort();
  const weekOrder = shuffleWithSeed(sortedNames, weekSeed);

  return weekOrder[getWeekdayIndex(date) % weekOrder.length];
};

const getImageMimeType = (fileName: string): string | undefined =>
  CONTEXT_IMAGE_TYPES[path.extname(fileName).toLowerCase()];

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

/**
 * KFC for any dish with chicken or turkey in it, even when the menu shows
 * another emoji (a chicken burger gets 🍔); other dishes go to a random burger chain.
 */
const pickDriveThruChain = (meal: string): string => {
  const isPoultry = getMatchingEmojis(meal).some((emoji) =>
    POULTRY_EMOJIS.includes(emoji)
  );

  return isPoultry ? POULTRY_CHAIN : pickRandom(BURGER_CHAINS);
};

const pickRandom = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];
