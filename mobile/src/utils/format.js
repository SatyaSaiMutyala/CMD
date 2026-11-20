/* Date and time text, written by hand so it reads the same on every device */

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const two = n => String(n).padStart(2, '0');
const meridiem = d => (d.getHours() >= 12 ? 'pm' : 'am');
const hour12 = d => d.getHours() % 12 || 12;

// "Wednesday, 18 Nov 2026"
export const longDate = d =>
  `${DAYS[d.getDay()]}, ${d.getDate()} ${
    MONTHS[d.getMonth()]
  } ${d.getFullYear()}`;

// "3:41 pm"
export const clockTime = d =>
  `${hour12(d)}:${two(d.getMinutes())} ${meridiem(d)}`;

// "18 Nov, 03:41 pm"
export const shortStamp = iso => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${two(hour12(d))}:${two(
    d.getMinutes(),
  )} ${meridiem(d)}`;
};

/* ---- wording used by the redesigned screens ---- */

const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// "Good morning" | "Good afternoon" | "Good evening"
export const greeting = d => {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// ["5:57", "pm"] — the reminder shows the two at different sizes
export const clockParts = d => [
  `${hour12(d)}:${two(d.getMinutes())}`,
  meridiem(d),
];

// "Thursday, 19 November"
export const weekdayDate = d =>
  `${DAYS[d.getDay()]}, ${d.getDate()} ${LONG_MONTHS[d.getMonth()]}`;

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isToday = iso => sameDay(new Date(iso), new Date());

// "Today" | "Yesterday" | "17 Nov 2026" — the heading over a day of history
export const dayLabel = iso => {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "5:42 PM"
export const clockUpper = iso => clockTime(new Date(iso)).toUpperCase();

// "₹1,50,000" -> 150000 (0 when it is not an amount)
export const amountOf = text =>
  Number(String(text || '').replace(/[^0-9.]/g, '')) || 0;
