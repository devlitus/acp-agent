import type { LLMProvider, Message } from "../llm/types.ts";
import { memoryStore } from "./memory-store.ts";

const EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract facts worth remembering for future sessions.

Rules:
- Extract ONLY: user preferences, personal details, recurring tasks, explicit requests to remember, important context about the user or their projects
- Ignore: greetings, small talk, temporary questions, general knowledge, code snippets
- Return each fact on a separate line, prefixed with "- "
- If nothing worth remembering, respond with exactly: NONE
- Keep facts concise (one sentence each)
- Do NOT extract facts the user already asked to forget`;

export async function extractAndSave(
  history: Message[],
  llm: LLMProvider,
): Promise<void> {
  const recent = history
    .filter(m => m.role !== "system" && m.content)
    .slice(-8);

  if (recent.length < 2) return;

  const messages: Message[] = [
    { role: "system", content: EXTRACTION_PROMPT },
    ...recent.map(m => ({ role: m.role as Message["role"], content: m.content ?? "" })),
    { role: "user", content: "Extract facts worth remembering from the above conversation. One per line, or NONE." },
  ];

  let response = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    await llm.call(messages, [], controller.signal, async (chunk) => {
      response += chunk;
    });
  } catch {
    return;
  } finally {
    clearTimeout(timeout);
  }

  const trimmed = response.trim();
  if (!trimmed || trimmed === "NONE") return;

  const facts = trimmed
    .split("\n")
    .map(line => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(line => line.length > 5 && line.length < 500);

  for (const fact of facts) {
    if (!memoryStore.hasSimilar(fact)) {
      memoryStore.save(fact, "auto");
    }
  }
}
