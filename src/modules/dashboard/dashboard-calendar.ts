export function weddingCountdown(weddingDate: string, timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const days = Math.round((Date.parse(`${weddingDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return { days, label: days > 0 ? `${days} ${days === 1 ? "day" : "days"} to go` : days === 0 ? "Your wedding day is here" : "Celebrating your wedding story" };
}
