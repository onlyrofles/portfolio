// Local-time helpers. Times are naive strings "YYYY-MM-DD HH:MM" in the shop's time zone.

const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function parse(s) {
  return new Date(s.length === 10 ? `${s}T00:00:00Z` : `${s.replace(' ', 'T')}:00Z`);
}

function format(d) {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export const hhmm = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export function nowLocal(offsetMin = 180) {
  return format(new Date(Date.now() + offsetMin * 60000));
}

export const todayLocal = (offsetMin = 180) => nowLocal(offsetMin).slice(0, 10);

export function addMinutes(s, minutes) {
  return format(new Date(parse(s).getTime() + minutes * 60000));
}

export function addDays(date, days) {
  return addMinutes(date, days * 1440).slice(0, 10);
}

export function weekday(date) {
  return parse(date).getUTCDay();
}

export function minutesOfDay(s) {
  return Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));
}

// "Пн 17.11"
export function dayLabel(date) {
  return `${WEEKDAYS[weekday(date)]} ${date.slice(8, 10)}.${date.slice(5, 7)}`;
}

// "17.11 в 14:30"
export function whenLabel(start) {
  return `${start.slice(8, 10)}.${start.slice(5, 7)} в ${start.slice(11, 16)}`;
}
