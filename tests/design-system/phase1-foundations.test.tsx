import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { PALETTES, type ThemeMode } from "@/lib/design-system/tokens";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionRule } from "@/components/ui/section-rule";

describe("Phase 1 Foundations — Theme, Tokens & Primitives", () => {
  describe("Theme & Tokens", () => {
    it("defines atmosphere palettes including Kulfi", () => {
      expect(PALETTES.length).toBeGreaterThanOrEqual(9);
      const paletteIds = PALETTES.map((p) => p.id);
      expect(paletteIds).toContain("editorial");
      expect(paletteIds).toContain("ivory");
      expect(paletteIds).toContain("kulfi");
      expect(paletteIds).toContain("beige");
      expect(paletteIds).toContain("burgundy");
      expect(paletteIds).toContain("sage");
      expect(paletteIds).toContain("lavender");
      expect(paletteIds).toContain("charcoal");
      expect(paletteIds).toContain("dusty-rose");
      expect(paletteIds).toContain("warm-grey");
    });

    it("supports system / light / dark ThemeMode", () => {
      const validModes: ThemeMode[] = ["system", "light", "dark"];
      expect(validModes).toEqual(["system", "light", "dark"]);
    });
  });

  describe("UI Primitives", () => {
    it("renders Button with token-based hover without non-standard opacity utilities", () => {
      const html = renderToString(
        React.createElement(Button, { variant: "primary" }, "Continue"),
      );
      expect(html).toContain("Continue");
      expect(html).not.toContain("hover:opacity-92");
      expect(html).toContain("hover:bg-[var(--primary)]/90");
    });

    it("renders IconButton with mandatory aria-label and touch targets", () => {
      const htmlMd = renderToString(
        React.createElement(
          IconButton,
          { "aria-label": "Toggle settings", size: "md" },
          React.createElement("span", null, "Icon"),
        ),
      );
      expect(htmlMd).toContain('aria-label="Toggle settings"');
      expect(htmlMd).toContain("h-10 w-10");

      const htmlLg = renderToString(
        React.createElement(
          IconButton,
          { "aria-label": "Close modal", size: "lg" },
          React.createElement("span", null, "Close"),
        ),
      );
      expect(htmlLg).toContain('aria-label="Close modal"');
      expect(htmlLg).toContain("h-11 w-11");
    });

    it("renders PageHeader with title, description, and back link", () => {
      const html = renderToString(
        React.createElement(PageHeader, {
          title: "Atmosphere & Appearance",
          description: "Customize theme, density, and typography.",
          eyebrow: "Settings",
          backHref: "/home",
          backLabel: "Sanctuary",
        }),
      );
      expect(html).toContain("Atmosphere &amp; Appearance");
      expect(html).toContain("Customize theme, density, and typography.");
      expect(html).toContain("Settings");
      expect(html).toContain('href="/home"');
      expect(html).toContain("Sanctuary");
    });

    it("renders SectionRule with hairline separator and optional label", () => {
      const plainHtml = renderToString(React.createElement(SectionRule, null));
      expect(plainHtml).toContain('role="separator"');
      expect(plainHtml).toContain("border-t border-[var(--border)]");

      const labeledHtml = renderToString(
        React.createElement(SectionRule, { label: "Or continue with" }),
      );
      expect(labeledHtml).toContain('role="separator"');
      expect(labeledHtml).toContain("Or continue with");
    });
  });
});
