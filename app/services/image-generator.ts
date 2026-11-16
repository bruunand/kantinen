import { persistImageInCloud } from "./image-uploader";
import { Theme } from "./theme";
import { getRequiredEnv } from "./variables";

const CORAX_API_URL = "https://api.corax.app/v1";
const CORAX_CAPABILITY_ID = "371853b5-aada-4934-b161-5c37f5203c9a";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
const FAILED_STATUSES = ["failed", "failure", "error", "cancelled"];

// Deliberately high level: the Corax capability owns the visual details, we
// only steer the setting and keep the props that make each theme recognizable.
export const themeDescriptions: Record<Theme, string> = {
  neutral: "Nordic minimalist restaurant",
  prison: "Prison cafeteria",
  streetfood: "Busy evening street food market",
  sweatshop: "Code sweatshop, White Monster cans visible",
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
  const themeDescription = themeDescriptions[theme];
  if (!themeDescription) {
    throw new Error(`Unsupported theme: ${theme}`);
  }

  console.log("Generating image with Corax", { key, meal, theme });

  const execution = await startExecution(meal, themeDescription);
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

const startExecution = async (
  dish: string,
  theme: string
): Promise<CoraxExecution> => {
  const response = await coraxFetch(
    `/capabilities/${CORAX_CAPABILITY_ID}/executions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // isBirthday is required by the capability but never wanted here
        payload: { variables: { dish, theme, isBirthday: "false" } },
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
