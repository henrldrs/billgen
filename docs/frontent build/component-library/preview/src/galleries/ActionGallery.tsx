import { Button } from "../../../components/Button";
import { IconButton } from "../../../components/IconButton";
import { CreateBillButton } from "../../../components/CreateBillButton";
import { SearchIcon, NotificationsIcon, BackIcon, ForwardIcon } from "../../../components/icons";
import { Section, Row, Label, type GalleryProps } from "../ui";

const VARIANTS = ["primary", "secondary", "danger", "outline", "ghost", "link", "plain"] as const;
const SIZES = ["sm", "md", "lg", "xl"] as const;

export function ActionGallery({ onAction }: GalleryProps) {
  return (
    <>
      <Section title="Button — variants">
        <Row>
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} onClick={() => onAction(`Button variant="${variant}" clicked`)}>
              {variant}
            </Button>
          ))}
        </Row>
      </Section>

      <Section title="Button — sizes (primary)">
        <Row>
          {SIZES.map((size) => (
            <Button key={size} size={size} onClick={() => onAction(`Button size="${size}" clicked`)}>
              {size}
            </Button>
          ))}
        </Row>
      </Section>

      <Section title="IconButton">
        <Row>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Search" onClick={() => onAction("IconButton search clicked")}>
              <SearchIcon />
            </IconButton>
            <Label>no dot</Label>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Notifications" dot onClick={() => onAction("IconButton notifications clicked")}>
              <NotificationsIcon />
            </IconButton>
            <Label>with dot</Label>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Back" tone="navy" onClick={() => onAction("IconButton back clicked")}>
              <BackIcon />
            </IconButton>
            <Label>navy tone</Label>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconButton aria-label="Forward" tone="accent" onClick={() => onAction("IconButton forward clicked")}>
              <ForwardIcon />
            </IconButton>
            <Label>accent tone</Label>
          </div>
        </Row>
      </Section>

      <Section title="CreateBillButton — hover to grow, click to shine">
        <Row>
          <CreateBillButton onClick={() => onAction("CreateBillButton clicked (shine should play)")} />
        </Row>
      </Section>
    </>
  );
}
