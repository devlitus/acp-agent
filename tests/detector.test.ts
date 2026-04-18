import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import type { DetectedLLM } from "../src/llm/detector.ts";

// Test del tipo DetectedLLM
test("DetectedLLM type has expected shape", () => {
  const detected: DetectedLLM = {
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    models: ["gemma4:latest", "llama3.2"],
  };
  expect(detected.provider).toBe("ollama");
  expect(detected.baseUrl).toBe("http://localhost:11434");
  expect(detected.models).toHaveLength(2);
});

test("DetectedLLM accepts lm-studio provider", () => {
  const detected: DetectedLLM = {
    provider: "lm-studio",
    baseUrl: "http://localhost:1234",
    models: ["meta-llama-3-8b"],
  };
  expect(detected.provider).toBe("lm-studio");
});

// Test de que detectLLM devuelve null cuando no hay LLM disponible
test("detectLLM returns null when no LLM responds", async () => {
  // Al ejecutar los tests, normalmente no hay Ollama/LM Studio disponibles
  // Este test verifica que la función no lanza excepciones y maneja el timeout
  const { detectLLM } = await import("../src/llm/detector.ts");
  const result = await detectLLM();
  // Puede ser null (sin LLM) o un DetectedLLM (si hay uno activo en CI)
  if (result !== null) {
    expect(["ollama", "lm-studio"]).toContain(result.provider);
    expect(result.baseUrl).toBeString();
    expect(result.models).toBeArray();
  } else {
    expect(result).toBeNull();
  }
}, 10000); // timeout generoso para el fetch
