import {useSchoolStore} from '@store/schoolStore';

export function useBranding() {
  const s = useSchoolStore();
  const initials = s.schoolName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();

  return {
    schoolName:   s.schoolName,
    logoUrl:      s.logoUrl,
    accentColor:  s.accentColor,
    headerBg:     s.accentColor,
    headerTint:   s.accentColor + '22',
    initials,
  };
}
