/** Settings → Appearance: theme, density, text size, motion, translucency.
 *
 *  All five are per person, per machine, and none touches the server — see
 *  `lib/preferences.ts` for why. The theme control here carries the system
 *  option; the top-bar shortcut does not, because three words do not fit
 *  beside the company switcher, and a shortcut is for flipping.
 *
 *  Not here, from `docs/appearance for saas.txt`: the accent picker (the
 *  accent is guard-pinned in BRAND_TOKENS and changing it is a decision, not a
 *  preference), colour-blind palettes (a design task), sidebar placement
 *  (there is no sidebar), and per-organization branding (blob storage, B2). */

import { Card, PageHeader, Segmented, Switch, ThemeSwitcher } from "@henrioutai/ui";

import { useAppearance, type ContainerWidth, type Density, type TextSize } from "../lib/preferences";
import { useTheme } from "../lib/theme";
import { t, type Lang } from "../lib/translations";

export interface AppearancePanelProps {
  lang?: Lang;
  title?: string;
}

function Pref({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-pref">
      <div className="bg-pref__text">
        <span className="bg-pref__label">{label}</span>
        {hint ? <span className="bg-pref__hint">{hint}</span> : null}
      </div>
      <div className="bg-pref__control">{children}</div>
    </div>
  );
}

export function AppearancePanel({ lang = "en", title }: AppearancePanelProps) {
  const [theme, setTheme] = useTheme();
  const [appearance, update] = useAppearance();

  return (
    <div className="bg-stack">
      <PageHeader title={title ?? t(lang, "settings.label.appearance")} subtitle={t(lang, "settings.desc.appearance")} />

      <Card>
        <Pref label={t(lang, "appearance.theme")} hint={t(lang, "appearance.themeHint")}>
          <ThemeSwitcher
            theme={theme}
            onChange={setTheme}
            labels={{
              light: t(lang, "appearance.light"),
              dark: t(lang, "appearance.dark"),
              system: t(lang, "appearance.system"),
              group: t(lang, "appearance.theme"),
            }}
          />
        </Pref>
        <Pref label={t(lang, "appearance.density")} hint={t(lang, "appearance.densityHint")}>
          <Segmented<Density>
            ariaLabel={t(lang, "appearance.density")}
            value={appearance.density}
            onChange={(density) => update({ density })}
            options={[
              { value: "compact", label: t(lang, "appearance.compact") },
              { value: "comfortable", label: t(lang, "appearance.comfortable") },
              { value: "spacious", label: t(lang, "appearance.spacious") },
            ]}
          />
        </Pref>
        <Pref label={t(lang, "appearance.textSize")} hint={t(lang, "appearance.textSizeHint")}>
          <Segmented<TextSize>
            ariaLabel={t(lang, "appearance.textSize")}
            value={appearance.textSize}
            onChange={(textSize) => update({ textSize })}
            options={[
              { value: "small", label: t(lang, "appearance.small") },
              { value: "medium", label: t(lang, "appearance.medium") },
              { value: "large", label: t(lang, "appearance.large") },
            ]}
          />
        </Pref>
        <Pref label={t(lang, "appearance.width")} hint={t(lang, "appearance.widthHint")}>
          <Segmented<ContainerWidth>
            ariaLabel={t(lang, "appearance.width")}
            value={appearance.containerWidth}
            onChange={(containerWidth) => update({ containerWidth })}
            options={[
              { value: "fluid", label: t(lang, "appearance.fluid") },
              { value: "boxed", label: t(lang, "appearance.boxed") },
            ]}
          />
        </Pref>
        <Pref label={t(lang, "appearance.motion")} hint={t(lang, "appearance.motionHint")}>
          <Switch
            checked={appearance.reducedMotion}
            onChange={(reducedMotion) => update({ reducedMotion })}
            aria-label={t(lang, "appearance.motion")}
          />
        </Pref>
        <Pref label={t(lang, "appearance.translucency")} hint={t(lang, "appearance.translucencyHint")}>
          <Switch
            checked={appearance.translucency}
            onChange={(translucency) => update({ translucency })}
            aria-label={t(lang, "appearance.translucency")}
          />
        </Pref>
      </Card>
    </div>
  );
}
