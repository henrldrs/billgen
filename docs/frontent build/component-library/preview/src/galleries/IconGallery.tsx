import {
  IconChip,
  DashboardIcon,
  SettingsUserIcon,
  HelpIcon,
  PolicyIcon,
  SupportIcon,
  BackIcon,
  ForwardIcon,
  CompanyIcon,
  UpgradeIcon,
  NotificationsIcon,
  LanguageIcon,
  SearchIcon,
  PlusIcon,
} from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

const ICONS = [
  { name: "DashboardIcon", Icon: DashboardIcon },
  { name: "SettingsUserIcon", Icon: SettingsUserIcon },
  { name: "HelpIcon", Icon: HelpIcon },
  { name: "PolicyIcon", Icon: PolicyIcon },
  { name: "SupportIcon", Icon: SupportIcon },
  { name: "BackIcon", Icon: BackIcon },
  { name: "ForwardIcon", Icon: ForwardIcon },
  { name: "CompanyIcon", Icon: CompanyIcon },
  { name: "UpgradeIcon", Icon: UpgradeIcon },
  { name: "NotificationsIcon", Icon: NotificationsIcon },
  { name: "LanguageIcon", Icon: LanguageIcon },
  { name: "SearchIcon", Icon: SearchIcon },
  { name: "PlusIcon", Icon: PlusIcon },
];

export function IconGallery(_props: GalleryProps) {
  return (
    <>
      <Section title="IconChip — tone x size">
        <Row>
          {(["neutral", "accent", "navy"] as const).map((tone) =>
            (["sm", "md", "lg"] as const).map((size) => (
              <div key={`${tone}-${size}`} style={{ textAlign: "center" }}>
                <IconChip tone={tone} size={size}>
                  <SettingsUserIcon />
                </IconChip>
                <Label>
                  {tone} / {size}
                </Label>
              </div>
            )),
          )}
        </Row>
      </Section>

      <Section title="Icon set (retokenized from docs/SVG icon .txt)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: "1rem",
          }}
        >
          {ICONS.map(({ name, Icon }) => (
            <div key={name} style={{ textAlign: "center" }}>
              <IconChip tone="neutral" size="md">
                <Icon />
              </IconChip>
              <Label>{name}</Label>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
