/**
 * SetupPage — mostrada cuando no se detecta ningún LLM local.
 * Guía al usuario para instalar/arrancar Ollama o LM Studio.
 */

import { useState } from "react";

type SetupStatus = "idle" | "checking" | "success" | "error";

type DetectResponse = {
  ok: boolean;
  provider?: string;
  model?: string;
};

export function SetupPage() {
  const [status, setStatus] = useState<SetupStatus>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleRetry() {
    setStatus("checking");
    setMessage("");

    try {
      const res = await fetch("/api/setup/detect");
      const data: DetectResponse = await res.json();

      if (data.ok) {
        setStatus("success");
        setMessage(`Detectado: ${data.provider} con ${data.model}`);
        // Recargar la app tras 1.5 s para que el agente esté disponible
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus("error");
        setMessage("Todavía no se detecta ningún LLM. ¿Está Ollama o LM Studio en ejecución?");
      }
    } catch {
      setStatus("error");
      setMessage("Error de red al intentar la detección. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-white">
            Configura tu asistente
          </h1>
          <p className="text-gray-400">
            No se detectó ningún modelo de lenguaje local activo.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-medium text-gray-200">Opción A — Ollama (recomendado)</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
            <li>
              Descarga Ollama desde{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline hover:text-blue-300"
              >
                ollama.com
              </a>
            </li>
            <li>Instálalo y ábrelo (aparece en la barra de menú)</li>
            <li>
              En un terminal ejecuta:{" "}
              <code className="bg-gray-800 px-1 rounded text-green-400">
                ollama run gemma4
              </code>
            </li>
            <li>Haz clic en "Reintentar" cuando el modelo esté listo</li>
          </ol>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-medium text-gray-200">Opción B — LM Studio</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
            <li>
              Descarga LM Studio desde{" "}
              <a
                href="https://lmstudio.ai"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline hover:text-blue-300"
              >
                lmstudio.ai
              </a>
            </li>
            <li>Descarga un modelo desde el catálogo</li>
            <li>
              Activa el servidor local en la sección <strong>Local Server</strong>
            </li>
            <li>Haz clic en "Reintentar" cuando el servidor esté activo</li>
          </ol>
        </div>

        {message && (
          <p
            className={`text-sm text-center ${
              status === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleRetry}
          disabled={status === "checking" || status === "success"}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     disabled:cursor-not-allowed text-white font-medium rounded-lg
                     transition-colors duration-150"
        >
          {status === "checking" ? "Detectando..." : "Reintentar"}
        </button>
      </div>
    </div>
  );
}
