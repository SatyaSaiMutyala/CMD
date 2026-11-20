import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, ms } from '../../theme';

function LineIcon({ size = 24, color = colors.ink, children }) {
  const px = ms(size);
  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function BackIcon(props) {
  return (
    <LineIcon size={20} {...props}>
      <Path d="M19 12H5M11 6l-6 6 6 6" />
    </LineIcon>
  );
}

export function ApprovalsIcon(props) {
  return (
    <LineIcon {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="m8 12.5 3 3 5-6" />
    </LineIcon>
  );
}

export function HistoryIcon(props) {
  return (
    <LineIcon {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </LineIcon>
  );
}

export function BellIcon(props) {
  return (
    <LineIcon {...props}>
      <Path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />
    </LineIcon>
  );
}

export function HexIcon({ size = 26, color = colors.onBrand }) {
  const px = ms(size);
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      <Path d="M12 2 21 7v10l-9 5-9-5V7z" fill={color} />
    </Svg>
  );
}

export function UserIcon(props) {
  return (
    <LineIcon {...props}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </LineIcon>
  );
}

export function LockIcon(props) {
  return (
    <LineIcon {...props}>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </LineIcon>
  );
}

export function EyeIcon(props) {
  return (
    <LineIcon {...props}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </LineIcon>
  );
}

export function EyeOffIcon(props) {
  return (
    <LineIcon {...props}>
      <Path d="M3 3l18 18" />
      <Path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.1 6.1C3.5 7.9 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" />
    </LineIcon>
  );
}

export function LogoutIcon(props) {
  return (
    <LineIcon {...props}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </LineIcon>
  );
}
