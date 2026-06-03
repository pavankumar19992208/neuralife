import React from 'react';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  text?: string;
  fontSize?: number;
  width?: number;
  height?: number;
}

/**
 * "NeuraLife" rendered with a metallic GOLD gradient (highlight → gold → deep),
 * plus a subtle darker drop layer for a solid, premium, engraved feel.
 */
export function GoldWordmark({ text = 'NeuraLife', fontSize = 44, width, height }: Props) {
  const w = width ?? text.length * fontSize * 0.64;
  const h = height ?? fontSize * 1.34;
  const id = `gold-${fontSize}`;
  const cx = w / 2;
  const cy = h * 0.74;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"    stopColor="#fff3c4" />
          <Stop offset="0.35" stopColor="#f6c548" />
          <Stop offset="0.7"  stopColor="#e89b1c" />
          <Stop offset="1"    stopColor="#b4690f" />
        </LinearGradient>
      </Defs>
      {/* depth layer */}
      <SvgText
        fill="#7a4708" fillOpacity={0.55}
        fontSize={fontSize} fontFamily="Manrope-ExtraBold" fontWeight="800"
        letterSpacing={-fontSize * 0.03}
        x={cx} y={cy + 1.5} textAnchor="middle">
        {text}
      </SvgText>
      {/* gold gradient face */}
      <SvgText
        fill={`url(#${id})`}
        fontSize={fontSize} fontFamily="Manrope-ExtraBold" fontWeight="800"
        letterSpacing={-fontSize * 0.03}
        x={cx} y={cy} textAnchor="middle">
        {text}
      </SvgText>
    </Svg>
  );
}
