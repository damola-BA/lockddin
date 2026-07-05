import {
  Body,
  Button,
  Container,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

// Warm-paper base for all LockdDin email. Keep it plain and kind.
export function EmailShell({
  preview,
  children,
  lang = "en",
}: {
  preview: string;
  children: ReactNode;
  lang?: string;
}) {
  return (
    <Html lang={lang}>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#faf6f0",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#2b2520",
          margin: 0,
          padding: "24px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#fffdf9",
            border: "1px solid #e8e0d4",
            borderRadius: "8px",
            padding: "32px 28px",
            maxWidth: "480px",
          }}
        >
          <Text style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7d6b", margin: "0 0 20px" }}>
            LOCKDDIN
          </Text>
          {children}
        </Container>
      </Body>
    </Html>
  );
}

export function EmailButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: "#2b2520",
          color: "#fffdf9",
          padding: "12px 24px",
          borderRadius: "6px",
          fontSize: "15px",
          textDecoration: "none",
        }}
      >
        {label}
      </Button>
    </Section>
  );
}

export const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 12px",
} as const;
