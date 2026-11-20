import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, ms } from '../../theme';

/* Every icon of the design, by name. Each is drawn on a 24 x 24 grid as
   outlines; an entry is a list of shapes:
     'path data'                    a path
     ['c', cx, cy, r]               a circle
     ['r', x, y, width, height, rx] a rounded rectangle                      */
const ICONS = {
  back: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronsUp: ['m17 11-5-5-5 5', 'm17 18-5-5-5 5'],
  chevronsRight: ['m6 17 5-5-5-5', 'm13 17 5-5-5-5'],
  chevronsLeft: ['m11 17-5-5 5-5', 'm18 17-5-5 5-5'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
  arrowUp: ['m5 12 7-7 7 7', 'M12 19V5'],
  external: [
    'M15 3h6v6',
    'M10 14 21 3',
    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  // three dots, one above the other: "more"
  more: [
    ['c', 12, 5, 1],
    ['c', 12, 12, 1],
    ['c', 12, 19, 1],
  ],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  cards: [['r', 5, 3, 14, 18, 3]],
  doc: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
  ],
  docLines: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
    'M16 13H8',
    'M16 17H8',
  ],
  image: [
    ['r', 3, 3, 18, 18, 3],
    ['c', 9, 9, 2],
    'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21',
  ],
  clock: [['c', 12, 12, 10], 'M12 6v6l4 2'],
  alert: [['c', 12, 12, 10], 'M12 8v4', 'M12 16h.01'],
  alertBare: ['M12 8v4', 'M12 16h.01'],
  info: [['c', 12, 12, 10], 'M12 16v-4', 'M12 8h.01'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  ],
  history: [
    'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
    'M3 3v5h5',
    'M12 7v5l4 2',
  ],
  plug: [
    'M12 22v-5',
    'M9 8V2',
    'M15 8V2',
    'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z',
  ],
  layers: ['m12 2 10 5-10 5L2 7z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5'],
  refresh: [
    'M3 12a9 9 0 0 1 15-6.7L21 8',
    'M21 3v5h-5',
    'M21 12a9 9 0 0 1-15 6.7L3 16',
    'M3 21v-5h5',
  ],
  autoMove: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5'],
  wifiOff: [
    'M12 20h.01',
    'M8.5 16.4a5 5 0 0 1 7 0',
    'M5 12.9a10 10 0 0 1 5.2-2.7',
    'M19 12.9a10 10 0 0 0-2.4-1.6',
    'M2 8.8a15 15 0 0 1 4.2-2.6',
    'M22 8.8a15 15 0 0 0-11.3-3.6',
    'm2 2 20 20',
  ],
  spinner: ['M21 12a9 9 0 1 1-6.2-8.56'],
  phone: [['r', 5, 2, 14, 20, 2], 'M12 18h.01'],
  sound: ['M11 5 6 9H2v6h4l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M19 5a10 10 0 0 1 0 14'],
  signOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  mail: [['r', 2, 4, 20, 16, 2], 'm22 7-10 6L2 7'],
  lock: [['r', 3, 11, 18, 11, 2], 'M7 11V7a5 5 0 0 1 10 0v4'],
  eye: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', ['c', 12, 12, 3]],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'm9 12 2 2 4-4'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  window: [['r', 2, 4, 20, 16, 2], 'M2 8h20'],
  box: [
    'M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
    'M3.3 7 12 12l8.7-5',
    'M12 22V12',
  ],
  trash: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  ],
  // drawn filled, not outlined
  play: ['m6 3 14 9-14 9z'],
};

const FILLED = { play: true };

/* <Icon name="check" size={22} stroke={2.8} color={colors.ink} />
   `size` is in design pixels and scales with the screen like text does. */
export function Icon({ name, size = 22, stroke = 2.2, color = colors.ink, style }) {
  const px = ms(size);
  const filled = FILLED[name];
  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {(ICONS[name] || []).map((shape, i) => {
        if (typeof shape === 'string') return <Path key={i} d={shape} />;
        if (shape[0] === 'c') {
          return <Circle key={i} cx={shape[1]} cy={shape[2]} r={shape[3]} />;
        }
        return (
          <Rect
            key={i}
            x={shape[1]}
            y={shape[2]}
            width={shape[3]}
            height={shape[4]}
            rx={shape[5]}
          />
        );
      })}
    </Svg>
  );
}
