export const getNextMealDate = () => {
  let baseTime = new Date();
  if (isPastLunch(baseTime)) {
    baseTime.setUTCHours(baseTime.getHours() + 24);
  }
  if (isWeekend(baseTime)) {
    const daysToAdd = (8 - baseTime.getDay()) % 7 || 7; // Calculate days to add to reach next Monday
    baseTime.setDate(baseTime.getDate() + daysToAdd);
  }
  return baseTime;
};

// Monday through Friday of the week containing the given date
export const getWeekdayDates = (baseDate: Date): Date[] => {
  const monday = new Date(baseDate);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
};

export const toDateString = (date: Date) => date.toISOString().split("T")[0];

// Resolves the meal date from the "date" search param, clamped to the
// current work week. Falls back to the default meal date when the param
// is missing or outside the week.
export const getMealDateFromParams = (request: Request) => {
  const defaultDate = getNextMealDate();
  const weekDates = getWeekdayDates(defaultDate);
  const dateParam = new URL(request.url).searchParams.get("date");
  const selected = dateParam
    ? weekDates.find((day) => toDateString(day) === dateParam)
    : undefined;
  return { date: selected ?? defaultDate, defaultDate, weekDates };
};

const isPastLunch = (time: Date) => {
  const hour = Number(
    time.toLocaleTimeString("da-DK", {
      hour: "numeric",
      timeZone: "Europe/Copenhagen",
    })
  );
  return hour > 12 || (hour === 12 && time.getMinutes() >= 30);
};

const isWeekend = (time: Date) => {
  return time.getDay() === 0 || time.getDay() === 6;
};
