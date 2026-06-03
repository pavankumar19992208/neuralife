import React from 'react';
import {Text as RNText, TextStyle, TextProps} from 'react-native';
import {Typography} from '@constants/typography';
import {Colors} from '@constants/colors';
import {TextColor} from '@constants/theme';

export type TextVariant =
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4'
  | 'body' | 'bodyMedium' | 'small' | 'smallMedium'
  | 'caption' | 'label' | 'num' | 'numLg' | 'mono' | 'monoLg' | 'power'
  // legacy alias
  | 'bodySmall';

const VARIANT_STYLES: Record<TextVariant, TextStyle> = {
  display: Typography.display,
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  h4: Typography.h4,
  body: Typography.body,
  bodyMedium: Typography.bodyMedium,
  small: Typography.small,
  smallMedium: Typography.smallMedium,
  caption: Typography.caption,
  label: Typography.label,
  num: Typography.num,
  numLg: Typography.numLg,
  mono: Typography.mono,
  monoLg: Typography.monoLg,
  power: Typography.power,
  bodySmall: Typography.small, // legacy alias
};

interface CustomTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  onDark?: boolean;
  telugu?: boolean;
}

export function Text({
  variant = 'body',
  color,
  onDark = false,
  telugu = false,
  style,
  children,
  ...props
}: CustomTextProps) {
  const baseStyle = VARIANT_STYLES[variant];
  const textColor = color ?? (onDark ? TextColor.primary : TextColor.lightPrimary);

  return (
    <RNText
      allowFontScaling={true}
      style={[
        baseStyle,
        { color: textColor },
        telugu ? { fontFamily: 'NotoSansTelugu' } : undefined,
        style,
      ]}
      {...props}>
      {children}
    </RNText>
  );
}