import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";

const TEST_CONFIG_DIR = join(import.meta.dir, ".tmp-config-test");
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, "config.json");

// Importamos las funciones reales del módulo
import {
  _setConfigPathForTest,
  readConfig,
  writeConfig,
  type AppConfig,
} from "../src/config-file.ts";

beforeEach(async () => {
  // Redirigir la ruta de config al directorio temporal
  _setConfigPathForTest(TEST_CONFIG_PATH);
  // Limpiar el directorio si existe
  await Bun.$`rm -rf ${TEST_CONFIG_DIR}`.quiet();
});

afterEach(async () => {
  await Bun.$`rm -rf ${TEST_CONFIG_DIR}`.quiet();
  // Restaurar la ruta real al finalizar
  _setConfigPathForTest(join(process.env.HOME ?? "/tmp", ".acp-agent", "config.json"));
});

test("writeConfig crea el fichero con el contenido correcto", async () => {
  const config: AppConfig = {
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    model: "gemma4:latest",
  };

  await writeConfig(config);

  const file = Bun.file(TEST_CONFIG_PATH);
  const saved = await file.json() as AppConfig;

  expect(saved.provider).toBe("ollama");
  expect(saved.baseUrl).toBe("http://localhost:11434");
  expect(saved.model).toBe("gemma4:latest");
});

test("readConfig devuelve null cuando el fichero no existe", async () => {
  const result = await readConfig();
  expect(result).toBeNull();
});

test("readConfig devuelve la config guardada", async () => {
  const config: AppConfig = {
    provider: "lm-studio",
    baseUrl: "http://localhost:1234",
    model: "meta-llama-3-8b",
  };

  await writeConfig(config);
  const result = await readConfig();

  expect(result).not.toBeNull();
  expect(result!.provider).toBe("lm-studio");
  expect(result!.baseUrl).toBe("http://localhost:1234");
  expect(result!.model).toBe("meta-llama-3-8b");
});

test("AppConfig soporta el proveedor lm-studio", async () => {
  const config: AppConfig = {
    provider: "lm-studio",
    baseUrl: "http://localhost:1234",
    model: "meta-llama-3-8b",
  };

  await writeConfig(config);
  const saved = await readConfig();

  expect(saved?.provider).toBe("lm-studio");
  expect(saved?.model).toBe("meta-llama-3-8b");
});

test("AppConfig soporta el proveedor groq", async () => {
  const config: AppConfig = {
    provider: "groq",
    baseUrl: "",
    model: "qwen/qwen3-32b",
  };

  await writeConfig(config);
  const saved = await readConfig();

  expect(saved?.provider).toBe("groq");
  expect(saved?.model).toBe("qwen/qwen3-32b");
});

test("writeConfig sobreescribe una config preexistente", async () => {
  const first: AppConfig = { provider: "ollama", baseUrl: "http://localhost:11434", model: "old-model" };
  const second: AppConfig = { provider: "groq", baseUrl: "", model: "new-model" };

  await writeConfig(first);
  await writeConfig(second);

  const saved = await readConfig();
  expect(saved?.provider).toBe("groq");
  expect(saved?.model).toBe("new-model");
});
