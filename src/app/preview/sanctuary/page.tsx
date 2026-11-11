"use client";

import * as React from "react";
import { Phone, Video, Palette } from "lucide-react";
import {
  PrivateShell,
  type SanctuarySection,
} from "@/components/sanctuary/private-shell";
import { ChatBubble } from "@/components/sanctuary/chat-bubble";
import { ChatComposer, type DisappearingPreset } from "@/components/sanctuary/chat-composer";
import { TypingIndicator } from "@/components/sanctuary/typing-indicator";
import { useDesignSystem } from "@/components/providers/design-system-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PALETTES, type PaletteId } from "@/lib/design-system/tokens";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface DemoMessage {
  id: string;
  direction: "sent" | "received";
  text: string;
  timestamp: string;
  voiceDurationSeconds?: number;
  disappearingLabel?: string;
}

const INITIAL_MESSAGES: DemoMessage[] = [
  {
    id: "m1",
    direction: "received",
    text: "Just landed safely. Thinking about that walk along the river earlier.",
    timestamp: "19:42",
  },
  {
    id: "m2",
    direction: "sent",
    text: "Glad you made it back smoothly. Sending a quick voice note for your train ride.",
    voiceDurationSeconds: 19,
    timestamp: "19:44",
    disappearingLabel: "5m · 04:18",
  },
];

export default function SanctuaryShellPreviewPage() {
  const ds = useDesignSystem();
  const { notify } = useToast();
  const [section, setSection] = React.useState<SanctuarySection>("messages");
  const [activeSpaceId, setActiveSpaceId] = React.useState("space-1");
  const [messages, setMessages] = React.useState<DemoMessage[]>(INITIAL_MESSAGES);

  React.useEffect(() => {
    ds.setEnvironment("private");
    if (ds.palette === "editorial") {
      ds.setPalette("ivory");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = (text: string, timer: DisappearingPreset) => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        direction: "sent",
        text,
        timestamp: `${hh}:${mm}`,
        disappearingLabel: timer === "off" ? undefined : `Timer: ${timer}`,
      },
    ]);
  };

  const privatePalettes = PALETTES.filter((p) => p.environment === "private");

  return (
    <PrivateShell
      activeSection={section}
      onSelectSection={setSection}
      activeSpaceId={activeSpaceId}
      onSwitchSpace={(id) => {
        setActiveSpaceId(id);
        notify({ title: "Switched isolated private space" });
      }}
      headerSubtitle="Private Space Shell Preview"
      headerActions={
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Start voice call"
            onClick={() => notify({ title: "Voice call UI builds in Phase 8" })}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Start video call"
            onClick={() => notify({ title: "Video call UI builds in Phase 8" })}
          >
            <Video className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-5 space-y-5">
        {/* Compact Palette Switcher Strip for Live Preview */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[var(--border)]">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] mr-1">
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            Theme:
          </span>
          {privatePalettes.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => ds.setPalette(item.id as PaletteId)}
              aria-pressed={ds.palette === item.id}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs border cursor-pointer transition-colors",
                ds.palette === item.id
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]",
              )}
            >
              {item.name.replace("Warm ", "").replace("Beige ", "").replace("Muted ", "").replace("Botanical ", "").replace("Soft ", "").replace("Architectural ", "")}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={ds.toggleMode} className="ml-auto h-8 text-xs">
            {ds.mode === "light" ? "Dark mode" : "Light mode"}
          </Button>
        </div>

        {section === "messages" ? (
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-[var(--ds-radius)] border border-[var(--border)] p-4 sm:p-6 min-h-[360px] flex flex-col justify-between gap-6",
                ds.chatBackground === "linen"
                  ? "chat-bg-linen"
                  : ds.chatBackground === "botanical"
                    ? "chat-bg-botanical"
                    : "chat-bg-solid",
              )}
            >
              <div className="space-y-3">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    id={msg.id}
                    direction={msg.direction}
                    text={msg.text}
                    timestamp={msg.timestamp}
                    bubbleStyle={ds.bubbleStyle}
                    voiceDurationSeconds={msg.voiceDurationSeconds}
                    disappearingLabel={msg.disappearingLabel}
                    readReceipt={msg.direction === "sent" ? "read" : undefined}
                    onReply={() => notify({ title: "Reply target selected" })}
                  />
                ))}
                <TypingIndicator partnerName="Avery" />
              </div>
            </div>

            <ChatComposer
              onSend={handleSend}
              onAttachMedia={() => notify({ title: "Media uploader builds in Phase 4b" })}
              onRecordVoice={() => notify({ title: "Voice recorder builds in Phase 4b" })}
            />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{section} Module Shell</CardTitle>
              <CardDescription>
                Placeholder shell for the {section} experience. Full module features are intentionally
                deferred to their dedicated implementation phases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setSection("messages")}>
                Return to Messages preview
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PrivateShell>
  );
}

