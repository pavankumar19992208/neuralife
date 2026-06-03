import {Dimensions, Platform} from 'react-native';

const {width, height} = Dimensions.get('window');

export const screen = {
  width,
  height,
  isPhone: width < 600,
  isTabletSm: width >= 600 && width < 900,
  isTabletLg: width >= 900,
  isTablet: width >= 600,
  isLandscape: width > height,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};

/** Responsive value — picks phone value by default, upgrades for tablet. */
export function rv<T>(phone: T, tablet?: T, tabletLg?: T): T {
  if (screen.isTabletLg && tabletLg !== undefined) return tabletLg;
  if (screen.isTablet && tablet !== undefined) return tablet;
  return phone;
}
