import * as SecureStore from "expo-secure-store";
import { useColorScheme as useNativewindColorScheme } from "nativewind";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, type ColorSchemeName } from "react-native";

const THEME_STORAGE_KEY = "kabuchat_theme_preference";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeSystemScheme(
  scheme: ColorSchemeName | null | undefined,
): "light" | "dark" {
  return scheme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(
    normalizeSystemScheme(Appearance.getColorScheme()),
  );
  const { setColorScheme } = useNativewindColorScheme();

  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(normalizeSystemScheme(colorScheme));
    });

    return () => subscription.remove();
  }, []);

  const resolvedTheme = preference === "system" ? systemScheme : preference;

  useEffect(() => {
    setColorScheme(resolvedTheme);
  }, [resolvedTheme, setColorScheme]);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    SecureStore.setItemAsync(THEME_STORAGE_KEY, value).catch(() => {
      // no-op
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }

  return context;
}
