import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWeekdayDates } from "./date";
import { generateImageForMeal, themePrompts } from "./image-generator";
import { persistImageInCloud } from "./image-uploader";
import { Themes } from "./theme";

vi.mock("./image-uploader", () => ({
  persistImageInCloud: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

const EXECUTION_ID = "execution-1";
const FILE_ID = "file-1";
const IMAGE_BYTES = new Uint8Array([1, 2, 3]);
// A Wednesday at noon UTC stays in the same week in every timezone the tests run in
const MEAL_DATE = new Date("2026-11-25T12:00:00Z");

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
      await generateImageForMeal("key", "Lasagne", "sweatshop", MEAL_DATE);

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
            theme: themePrompts.sweatshop.describe("Lasagne"),
            isBirthday: "false",
          },
        },
      });
    });

    it("authenticates every request with the API key", async () => {
      // Arrange
      // (mocks are set up in beforeEach)

      // Act
      await generateImageForMeal("key", "Lasagne", "neutral", MEAL_DATE);

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
      const url = await generateImageForMeal(
        "my-key",
        "Lasagne",
        "prison",
        MEAL_DATE
      );

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
    const PHOTO_BYTES = Buffer.from("photo");
    const photoBase64 = PHOTO_BYTES.toString("base64");
    const PHOTOS = [
      "dario.jpg",
      "elon.jpg",
      "jensen.jpg",
      "sama.jpg",
      "sundar.jpg",
      "zuckerberg.jpg",
    ];

    const requestPayload = () =>
      JSON.parse(fetchMock.mock.calls[0][1]?.body as string).payload;

    /** File names of the photos read from resources/, in the order they were read. */
    const readPhotoNames = () =>
      vi
        .mocked(readFile)
        .mock.calls.map(([filePath]) => path.basename(String(filePath)));

    const generateDriveThruImages = async (dates: Date[]) => {
      for (const date of dates) {
        await generateImageForMeal("key", "Lasagne", "drivethru", date);
      }
    };

    beforeEach(() => {
      // Answer by request rather than by order so several generations can run in a row
      fetchMock.mockImplementation(async (input, init) => {
        if (init?.method === "POST") {
          return startedResponse();
        }

        return String(input).endsWith("/content")
          ? imageResponse()
          : successResponse();
      });

      vi.mocked(readFile).mockReset();
      vi.mocked(readdir).mockReset();
      vi.mocked(readFile).mockResolvedValue(PHOTO_BYTES as never);
    });

    it("sends the photo as a data URL blob with its own mime type", async () => {
      // Arrange: a single png on disk
      vi.mocked(readdir).mockResolvedValue(["other.png"] as never);

      // Act: generate a drive-thru image
      await generateImageForMeal("key", "Lasagne", "drivethru", MEAL_DATE);

      // Assert: the photo is read from resources and attached as a png
      expect(String(vi.mocked(readFile).mock.calls[0][0])).toMatch(
        /resources[\\/]other\.png$/
      );
      expect(requestPayload().blobs).toEqual([
        `data:image/png;base64,${photoBase64}`,
      ]);
    });

    it("never sends the same photo twice in a week", async () => {
      // Arrange: more photos than weekdays
      vi.mocked(readdir).mockResolvedValue(PHOTOS as never);

      // Act: generate a drive-thru image for every weekday
      await generateDriveThruImages(getWeekdayDates(MEAL_DATE));

      // Assert: five days, five different people
      expect(new Set(readPhotoNames()).size).toBe(5);
    });

    it("sends the same photo when a day is regenerated", async () => {
      // Arrange: more photos than weekdays
      vi.mocked(readdir).mockResolvedValue(PHOTOS as never);

      // Act: generate the same day twice
      await generateDriveThruImages([MEAL_DATE, MEAL_DATE]);

      // Assert: a forced regeneration cannot collide with another day
      const [first, second] = readPhotoNames();
      expect(second).toBe(first);
    });

    it("picks a different order of photos in the next week", async () => {
      // Arrange: more photos than weekdays
      vi.mocked(readdir).mockResolvedValue(PHOTOS as never);
      const nextWeek = new Date("2026-12-02T12:00:00Z");

      // Act: generate every weekday of two consecutive weeks
      await generateDriveThruImages(getWeekdayDates(MEAL_DATE));
      await generateDriveThruImages(getWeekdayDates(nextWeek));

      // Assert: the weeks do not just repeat the same lineup
      const photoNames = readPhotoNames();
      expect(photoNames.slice(5)).not.toEqual(photoNames.slice(0, 5));
    });

    it("does not depend on the order resources is listed in", async () => {
      // Arrange: the same photos listed in two different orders
      vi.mocked(readdir)
        .mockResolvedValueOnce(PHOTOS as never)
        .mockResolvedValueOnce([...PHOTOS].reverse() as never);

      // Act: generate the same day once per listing
      await generateDriveThruImages([MEAL_DATE, MEAL_DATE]);

      // Assert: both listings pick the same person
      const [first, second] = readPhotoNames();
      expect(second).toBe(first);
    });

    it("still sends a photo every day when there are fewer photos than weekdays", async () => {
      // Arrange: only two photos for five days
      vi.mocked(readdir).mockResolvedValue(["a.jpg", "b.jpg"] as never);

      // Act: generate a drive-thru image for every weekday
      await generateDriveThruImages(getWeekdayDates(MEAL_DATE));

      // Assert: every day got one of the photos, repeats being unavoidable
      const photoNames = readPhotoNames();
      expect(photoNames).toHaveLength(5);
      expect(new Set(photoNames)).toEqual(new Set(["a.jpg", "b.jpg"]));
    });

    it("ignores files in resources that are not images", async () => {
      // Arrange: a stray text file next to a single photo
      vi.mocked(readdir).mockResolvedValue(["notes.txt", "bjarne.jpg"] as never);

      // Act: generate a drive-thru image
      await generateImageForMeal("key", "Lasagne", "drivethru", MEAL_DATE);

      // Assert: only the photo is ever picked
      expect(String(vi.mocked(readFile).mock.calls[0][0])).toMatch(
        /resources[\\/]bjarne\.jpg$/
      );
      expect(requestPayload().blobs).toEqual([
        `data:image/jpeg;base64,${photoBase64}`,
      ]);
    });

    it("fails before calling Corax when resources has no images", async () => {
      // Arrange: nothing usable on disk
      vi.mocked(readdir).mockResolvedValue(["README.md"] as never);

      // Act: generate a drive-thru image
      const promise = generateImageForMeal(
        "key",
        "Lasagne",
        "drivethru",
        MEAL_DATE
      );

      // Assert: the generation fails and Corax is never called
      await expect(promise).rejects.toThrow("No context images");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends no blobs for themes without a context image", async () => {
      // Arrange: prison does not use a context image
      // (mocks are set up in beforeEach)

      // Act: generate a prison image
      await generateImageForMeal("key", "Lasagne", "prison", MEAL_DATE);

      // Assert: resources is never read and the payload has no blobs
      expect(readdir).not.toHaveBeenCalled();
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
      const promise = generateImageForMeal("key", "Lasagne", "neutral", MEAL_DATE);
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
      const promise = generateImageForMeal("key", "Lasagne", "neutral", MEAL_DATE);
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
      const promise = generateImageForMeal("key", "Lasagne", "neutral", MEAL_DATE);

      // Assert
      await expect(promise).rejects.toThrow("failed");
      expect(persistImageInCloud).not.toHaveBeenCalled();
    });

    it("throws when Corax responds with an error status", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral", MEAL_DATE);

      // Assert
      await expect(promise).rejects.toThrow("401");
    });

    it("throws when the API key is missing", async () => {
      // Arrange
      vi.stubEnv("CORAX_API_KEY", "");

      // Act
      const promise = generateImageForMeal("key", "Lasagne", "neutral", MEAL_DATE);

      // Assert
      await expect(promise).rejects.toThrow("CORAX_API_KEY");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws for an unsupported theme", async () => {
      // Arrange
      const unknownTheme = "unknown" as never;

      // Act
      const promise = generateImageForMeal(
        "key",
        "Lasagne",
        unknownTheme,
        MEAL_DATE
      );

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
    const description = themePrompts.sweatshop.describe("Lasagne");

    // Assert
    expect(description).toContain("Monster");
  });

  describe("drive-thru", () => {
    it.each([
      { random: 0, chain: "McDonald's" },
      { random: 0.99, chain: "Burger King" },
    ])(
      "picks $chain for a non-chicken dish when Math.random is $random",
      ({ random, chain }) => {
        // Arrange: pin the random chain pick
        vi.spyOn(Math, "random").mockReturnValue(random);

        // Act: describe the drive-thru scene for a pasta dish
        const description = themePrompts.drivethru.describe("Lasagne");

        // Assert: the picked burger chain is in the description
        expect(description).toContain(chain);
      }
    );

    it.each([
      "Kyllingebryst med ris",
      "Hønsefrikassé serveret med kartofler",
      "Kalkunbryst med flødekartofler",
    ])(
      "picks KFC for the poultry dish %s",
      (meal) => {
        // Arrange: randomness would otherwise land on Burger King
        vi.spyOn(Math, "random").mockReturnValue(0.99);

        // Act: describe the drive-thru scene for a poultry dish
        const description = themePrompts.drivethru.describe(meal);

        // Assert: chicken and turkey always go to KFC
        expect(description).toContain("KFC");
      }
    );

    it("does not pick KFC when another emoji wins over chicken", () => {
      // Arrange: chili is matched before chicken, so the menu shows 🌶
      vi.spyOn(Math, "random").mockReturnValue(0);

      // Act: describe the drive-thru scene for a chili chicken dish
      const description = themePrompts.drivethru.describe("Chili med kylling");

      // Assert: it falls back to a burger chain
      expect(description).toContain("McDonald's");
    });

    it("uses a photo from resources as context", () => {
      // Arrange / Act: look up the drive-thru prompt
      const { usesContextImage } = themePrompts.drivethru;

      // Assert: it asks for a context image
      expect(usesContextImage).toBe(true);
    });
  });
});
