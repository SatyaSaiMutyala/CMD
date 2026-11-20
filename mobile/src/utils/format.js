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
