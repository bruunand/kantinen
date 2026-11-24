import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateImageForMeal, themePrompts } from "./image-generator";
import { persistImageInCloud } from "./image-uploader";
import { Themes } from "./theme";

vi.mock("./image-uploader", () => ({
  persistImageInCloud: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

const EXECUTION_ID = "execution-1";
const FILE_ID = "file-1";
const IMAGE_BYTES = new Uint8Array([1, 2, 3]);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const startedResponse = () =>
  jsonResponse({ id: EXECUTION_ID, status: "running" });

const runningResponse = () =>
  jsonResponse({ id: EXECUTION_ID, status: "running" });

const successResponse = () =>
  jsonResponse({
    id: EXECUTION_ID,
    status: "success",
    result: { file_id: FILE_ID },
  });

const imageResponse = () => new Response(IMAGE_BYTES);

describe("generateImageForMeal", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("CORAX_API_KEY", "test-key");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(persistImageInCloud).mockResolvedValue("https://cdn/image.png");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  describe("when the execution succeeds immediately", () => {
    beforeEach(() => {
      fetchMock
        .mockResolvedValueOnce(startedResponse())
        .mockResolvedValueOnce(successResponse())
        .mockResolvedValueOnce(imageResponse());
    });

    it("starts the capability with the dish, theme and isBirthday=false", async () => {
      // Arrange
      // (mocks are set up in beforeEach)

      // Act
      await generateImageForMeal("key", "Lasagne", "sweatshop");

      // Assert
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        "https://api.corax.app/v1/capabilities/371853b5-aada-4934-b161-5c37f5203c9a/executions"
      );
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual({
        payload: {
          variables: {
            dish: "Lasagne",
            theme: themePrompts.sweatshop.describe(),
            isBirthday: "false",
          },
        },
      });
    });

    it("authenticates every request with the API key", async () => {
      // Arrange
      // (mocks are set up in beforeEach)

      // Act
      await generateImageForMeal("key", "Lasagne", "neutral");

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(3);
      for (const [, init] of fetchMock.mock.calls) {
        expect(init?.headers).toMatchObject({ "X-API-Key": "test-key" });
      }
    });

    it("downloads the result file and persists it under the given key", async () => {
      // Arrange
      // (mocks are set up in beforeEach)

      // Act
      const url = await generateImageForMeal("my-key", "Lasagne", "prison");

      // Assert
      expect(fetchMock.mock.calls[2][0]).toBe(
        `https://api.corax.app/v1/files/${FILE_ID}/content`
      );
      const [key, image] = vi.mocked(persistImageInCloud).mock.calls[0];
      expect(key).toBe("my-key");
      expect(Array.from(image)).toEqual(Array.from(IMAGE_BYTES));
      expect(url).toBe("https://cdn/image.png");
    });
  });

  describe("context images", () => {
    const requestPayload = () =>
      JSON.parse(fetchMock.mock.calls[0][1]?.body as string).payload;

    beforeEach(() => {
      fetchMock
        .mockResolvedValueOnce(startedResponse())
        .mockResolvedValueOnce(successResponse())
        .mockResolvedValueOnce(imageResponse());
    });

    it("sends the drive-thru photo as a JPEG data URL blob", async () => {
      // Arrange: the photo on disk is a few known bytes
      vi.mocked(readFile).mockResolvedValue(Buffer.from("photo") as never);

      // Act: generate a drive-thru image
      await generateImageForMeal("key", "Lasagne", "drivethru");

      // Assert: the photo is read from resources/ and attached as a blob
      expect(String(vi.mocked(readFile).mock.calls[0][0])).toMatch(
        /resources[\\/]mpba\.jpg$/
      );
      expect(requestPayload().blobs).toEqual([
        `data:image/jpeg;base64,${Buffer.from("photo").toString("base64")}`,
      ]);
    });

    it("sends no blobs for themes without a context image", async () => {
      // Arrange: prison has no context image
      vi.mocked(readFile).mockClear();

      // Act: generate a prison image
      await generateImageForMeal("key", "Lasagne", "prison");

      // Assert: nothing is read and the payload has no blobs
      expect(readFile).not.toHaveBeenCalled();
      expect(requestPayload()).not.toHaveProperty("blobs");
    });
  });

  describe("polling", () => {
    it("keeps polling while the execution is running", async () => {
      // Arrange
      vi.useFakeTimers();
      fetchMock
        .mockResolvedValueOnce(startedResponse())
        .mockResolvedValueOnce(runningResponse())
        .mockResolvedValueOnce(runningResponse())
        .mockResolvedValueOnce(successResponse())
        .mockResolvedValueOnce(imageResponse());

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral");
      await vi.advanceTimersByTimeAsync(10_000);
      await promise;

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(persistImageInCloud).toHaveBeenCalledOnce();
    });

    it("gives up when the execution never finishes", async () => {
      // Arrange
      vi.useFakeTimers();
      fetchMock.mockResolvedValueOnce(startedResponse());
      fetchMock.mockImplementation(async () => runningResponse());

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral");
      const assertion = expect(promise).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

      // Assert
      await assertion;
      expect(persistImageInCloud).not.toHaveBeenCalled();
    });
  });

  describe("failures", () => {
    it("throws when the execution fails", async () => {
      // Arrange
      fetchMock
        .mockResolvedValueOnce(startedResponse())
        .mockResolvedValueOnce(jsonResponse({ id: EXECUTION_ID, status: "failed" }));

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral");

      // Assert
      await expect(promise).rejects.toThrow("failed");
      expect(persistImageInCloud).not.toHaveBeenCalled();
    });

    it("throws when Corax responds with an error status", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral");

      // Assert
      await expect(promise).rejects.toThrow("401");
    });

    it("throws when the API key is missing", async () => {
      // Arrange
      vi.stubEnv("CORAX_API_KEY", "");

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral");

      // Assert
      await expect(promise).rejects.toThrow("CORAX_API_KEY");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws for an unsupported theme", async () => {
      // Arrange
      const unknownTheme = "unknown" as never;

      // Act
      const promise = generateImageForMeal("key", "Lasagne", unknownTheme);

      // Assert
      await expect(promise).rejects.toThrow("Unsupported theme");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

describe("themePrompts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("covers every theme", () => {
    // Arrange
    const themeIds = Themes.map((theme) => theme.id).sort();

    // Act
    const describedThemes = Object.keys(themePrompts).sort();

    // Assert
    expect(describedThemes).toEqual(themeIds);
  });

  it("keeps the Monster cans in the sweatshop theme", () => {
    // Arrange / Act
    const description = themePrompts.sweatshop.describe();

    // Assert
    expect(description).toContain("Monster");
  });

  describe("drive-thru", () => {
    it.each([
      { random: 0, chain: "McDonald's" },
      { random: 0.99, chain: "Burger King" },
    ])("picks $chain when Math.random is $random", ({ random, chain }) => {
      // Arrange: pin the random chain pick
      vi.spyOn(Math, "random").mockReturnValue(random);

      // Act: describe the drive-thru scene
      const description = themePrompts.drivethru.describe();

      // Assert: the picked chain is in the description
      expect(description).toContain(chain);
    });

    it("uses the photo in resources as context", () => {
      // Arrange / Act: look up the drive-thru prompt
      const { contextImage } = themePrompts.drivethru;

      // Assert: it points at the bundled photo
      expect(contextImage).toBe("mpba.jpg");
    });
  });
});
