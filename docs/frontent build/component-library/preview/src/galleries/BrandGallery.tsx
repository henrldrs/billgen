import { LogoMark } from "../../../components/LogoMark";
import { HomeButton } from "../../../components/HomeButton";
import { LoadingScreen } from "../../../components/LoadingScreen";
import { Section, Row, Label, type GalleryProps } from "../ui";

export function BrandGallery({ onAction }: GalleryProps) {
  return (
    <>
      <Section title="LogoMark">
        <Row>
          {[20, 32, 48, 72].map((size) => (
            <div key={size} style={{ textAlign: "center" }}>
              <LogoMark size={size} />
              <Label>{size}px</Label>
            </div>
          ))}
        </Row>
      </Section>

      <Section title="HomeButton (click it, hover it)">
        <Row>
          {(["sm", "md", "lg"] as const).map((size) => (
            <div key={size} style={{ textAlign: "center" }}>
              <HomeButton size={size} onNavigateHome={() => onAction(`HomeButton (${size}) clicked`)} />
              <Label>{size}</Label>
            </div>
          ))}
        </Row>
      </Section>

      <Section title="LoadingScreen — logo printing invoices">
        <div style={{ border: "1px solid var(--bg-line)", borderRadius: "var(--bg-radius)" }}>
          <LoadingScreen label="Fetching your invoices…" />
        </div>
      </Section>
    </>
  );
}
