import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  defer,
  Form,
  Link,
  useLoaderData,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import { useEffect } from "react";
import { getMealDateFromParams, toDateString } from "~/services/date";
import { FALLBACK_IMAGE, getAvailableImages } from "~/services/image";
import { getCurrentMeals } from "~/services/meal";
import {
  getAdjacentTheme,
  getRequestedTheme,
  getThemeFromParams,
  Themes,
} from "~/services/theme";

export const meta: MetaFunction = () => {
  return [{ title: "Kantinen - CWO Huset" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { date, defaultDate, weekDates } = getMealDateFromParams(request);
  const [meals, availableImages] = await Promise.all([
    getCurrentMeals(date),
    getAvailableImages(date),
  ]);

  const availableThemes = availableImages.map((image) => image.theme);
  const theme = getThemeFromParams(request, availableThemes);
  const backgroundImageUrl =
    availableImages.find((image) => image.theme === theme)?.url ??
    FALLBACK_IMAGE;
  // Kept separate from the shown theme so a day without the requested theme
  // doesn't make the user lose it when navigating on to the next day
  const preferredTheme = getRequestedTheme(request) ?? theme;
  const themeOptions = Themes.filter(({ id }) => availableThemes.includes(id));

  return defer({
    theme,
    preferredTheme,
    themeOptions,
    meals,
    date,
    defaultDate: toDateString(defaultDate),
    weekDates: weekDates.map(toDateString),
    backgroundImageUrl,
  });
}

export default function Index() {
  const {
    theme,
    preferredTheme,
    themeOptions,
    meals,
    date,
    defaultDate,
    weekDates,
    backgroundImageUrl,
  } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const dateString = toDateString(new Date(date));
  const dayIndex = weekDates.indexOf(dateString);
  const previousDate = dayIndex > 0 ? weekDates[dayIndex - 1] : undefined;
  const nextDate =
    dayIndex < weekDates.length - 1 ? weekDates[dayIndex + 1] : undefined;

  const themeIds = themeOptions.map(({ id }) => id);
  const previousTheme = getAdjacentTheme(themeIds, theme, "previous");
  const nextTheme = getAdjacentTheme(themeIds, theme, "next");

  const linkToTheme = (target: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("theme", target);
    return { search: params.toString() };
  };

  const linkToDate = (target: string) => {
    const params = new URLSearchParams(searchParams);
    if (target === defaultDate) {
      params.delete("date");
    } else {
      params.set("date", target);
    }
    if (preferredTheme) {
      params.set("theme", preferredTheme);
    }
    return { search: params.toString() };
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // A focused select already changes its value (and submits) on up/down
      const isSelectFocused = event.target instanceof HTMLSelectElement;
      const isVerticalArrow =
        event.key === "ArrowUp" || event.key === "ArrowDown";
      if (isSelectFocused && isVerticalArrow) {
        return;
      }

      if (event.key === "ArrowLeft" && previousDate) {
        navigate(linkToDate(previousDate));
      } else if (event.key === "ArrowRight" && nextDate) {
        navigate(linkToDate(nextDate));
      } else if (event.key === "ArrowUp" && previousTheme) {
        navigate(linkToTheme(previousTheme));
      } else if (event.key === "ArrowDown" && nextTheme) {
        navigate(linkToTheme(nextTheme));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main>
      {themeOptions.length > 0 && (
        <nav>
          <Form onChange={(event) => submit(event.currentTarget)}>
            {dateString !== defaultDate && (
              <input type="hidden" name="date" value={dateString} />
            )}
            <select key={theme} name="theme" defaultValue={theme ?? undefined}>
              {themeOptions.map(({ id, displayName }) => (
                <option key={id} value={id}>
                  {displayName}
                </option>
              ))}
            </select>
          </Form>
        </nav>
      )}
      <div className="centerWrapper">
        <div className="day-navigation">
          {previousDate ? (
            <Link
              to={linkToDate(previousDate)}
              prefetch="render"
              className="day-nav-link"
              aria-label="Forrige dag"
            >
              ‹
            </Link>
          ) : (
            <span className="day-nav-link day-nav-disabled">‹</span>
          )}
          <p className="meal-date">
            {new Date(date).toLocaleDateString("da-DK", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {nextDate ? (
            <Link
              to={linkToDate(nextDate)}
              prefetch="render"
              className="day-nav-link"
              aria-label="Næste dag"
            >
              ›
            </Link>
          ) : (
            <span className="day-nav-link day-nav-disabled">›</span>
          )}
        </div>
        <hr />
        {meals.map((meal, index) => (
          <p
            key={index}
            className={
              "meal " + (meal.vegeratian ? "vegetarianCourse" : "mainCourse")
            }
          >
            {meal.text}
          </p>
        ))}
        <img src={backgroundImageUrl} className="background" />
      </div>
      <a
        href="https://trifork.com/corax-ai/"
        className="powered-by"
        target="_blank"
        rel="noreferrer"
      >
        Powered by Corax AI
      </a>
    </main>
  );
}
