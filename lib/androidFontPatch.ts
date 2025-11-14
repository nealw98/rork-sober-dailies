import { Platform, StyleSheet } from 'react-native';

type NamedStyles = Record<string, any>;

if (Platform.OS === 'android') {
  const adjustFontSizes = (styleValue: any): any => {
    if (!styleValue) {
      return styleValue;
    }

    if (Array.isArray(styleValue)) {
      return styleValue.map(adjustFontSizes);
    }

    if (typeof styleValue === 'object') {
      const adjustedEntries: NamedStyles = {};

      Object.keys(styleValue).forEach((key) => {
        const value = styleValue[key];

        if (key === 'fontSize' && typeof value === 'number') {
          adjustedEntries[key] = value + 2;
        } else {
          adjustedEntries[key] = adjustFontSizes(value);
        }
      });

      return adjustedEntries;
    }

    return styleValue;
  };

  const originalCreate = StyleSheet.create.bind(StyleSheet) as typeof StyleSheet.create;

  StyleSheet.create = (<T extends NamedStyles | NamedStyles[]>(styles: T) => {
    const adjustedStyles: Record<string, any> = {};

    Object.keys(styles as NamedStyles).forEach((key) => {
      adjustedStyles[key] = adjustFontSizes((styles as NamedStyles)[key]);
    });

    return originalCreate(adjustedStyles) as T;
  }) as typeof StyleSheet.create;
}





