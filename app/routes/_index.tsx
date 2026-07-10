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
import { getImageBackground } from "~/services/image";
import { getCurrentMeals } from "~/services/meal";
import { getThemeFromParams, Themes } from "~/services/theme";

export const meta: MetaFunction = () => {
  return [{ title: "Kantinen - CWO Huset" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { date, defaultDate, weekDates } = getMealDateFromParams(request);
  const theme = getThemeFromParams(request);
  const [meals, backgroundImageUrl] = await Promise.all([
    getCurrentMeals(date),
    getImageBackground(theme, date),
  ]);

  return defer({
    theme,
    meals,
    date,
    defaultDate: toDateString(defaultDate),
    weekDates: weekDates.map(toDateString),
    backgroundImageUrl,
  });
}

export default function Index() {
  const { theme, meals, date, defaultDate, weekDates, backgroundImageUrl } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const dateString = toDateString(new Date(date));
  const dayIndex = weekDates.indexOf(dateString);
  const previousDate = dayIndex > 0 ? weekDates[dayIndex - 1] : undefined;
  const nextDate =
    dayIndex < weekDates.length - 1 ? weekDates[dayIndex + 1] : undefined;

  const linkToDate = (target: string) => {
    const params = new URLSearchParams(searchParams);
    if (target === defaultDate) {
      params.delete("date");
    } else {
      params.set("date", target);
    }
    return { search: params.toString() };
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && previousDate) {
        navigate(linkToDate(previousDate));
      } else if (event.key === "ArrowRight" && nextDate) {
        navigate(linkToDate(nextDate));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main>
      <nav>
        <Form onChange={(event) => submit(event.currentTarget)}>
          {dateString !== defaultDate && (
            <input type="hidden" name="date" value={dateString} />
          )}
          <select name="theme" defaultValue={theme}>
            {Themes.map(({ id, displayName }) => (
              <option key={id} value={id}>
                {displayName}
              </option>
            ))}
          </select>
        </Form>
      </nav>
      <div className="centerWrapper">
        <div className="day-navigation">
          {previousDate ? (
            <Link
              to={linkToDate(previousDate)}
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
    </main>
  );
}
