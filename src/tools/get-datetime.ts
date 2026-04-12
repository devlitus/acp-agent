import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";

export const getDatetimeTool: Tool = {
  kind: "read",
  definition: {
    name: "get_datetime",
    description:
      "Returns the current date and time. Use whenever you need to know today's date, the current time, or the day of the week — for example before creating to-do lists, scheduling tasks, or answering time-sensitive questions.",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description:
            "IANA timezone name (e.g. 'Europe/Madrid', 'America/New_York'). Defaults to the system timezone.",
        },
      },
      required: [],
    },
  },
  execute(toolCall: ToolCall, _ctx: ToolContext): string {
    const tz = (toolCall.arguments.timezone as string | undefined) ?? undefined;

    let date: Date;
    let locale: string;
    let timeZone: string | undefined;

    try {
      // Validate the timezone if provided
      if (tz) {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        timeZone = tz;
      }
      date = new Date();
      locale = Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return `Error: invalid timezone "${tz}". Use an IANA name like "Europe/Madrid" or "America/New_York".`;
    }

    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { timeZone, ...opts }).format(date);

    const iso = date.toISOString();
    const humanDate = fmt({ weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const humanTime = fmt({ hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const resolvedTz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    return `Current date and time:
- ISO 8601: ${iso}
- Date: ${humanDate}
- Time: ${humanTime}
- Timezone: ${resolvedTz}`;
  },
};
