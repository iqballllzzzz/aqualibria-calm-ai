import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { config } from "../config.js";
import { log } from "../utils/log.js";
import { MASTER_ARCHITECT_PROMPT } from "./prompts.js";

export interface AgentChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
}

let _model: ChatGoogleGenerativeAI | null = null;

function getModel(): ChatGoogleGenerativeAI | null {
  if (_model) return _model;
  if (!config.GEMINI_API_KEY) {
    log.warn("GEMINI_API_KEY not set — agent will run in echo/dev mode.");
    return null;
  }
  _model = new ChatGoogleGenerativeAI({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    temperature: 0.4,
    maxOutputTokens: 8192,
  });
  return _model;
}

function toMessages(turns: AgentChatTurn[]): BaseMessage[] {
  const msgs: BaseMessage[] = [new SystemMessage(MASTER_ARCHITECT_PROMPT)];
  for (const t of turns) {
    if (t.role === "user") msgs.push(new HumanMessage(t.content));
    else if (t.role === "assistant") msgs.push(new AIMessage(t.content));
    else msgs.push(new HumanMessage(`[tool-result]\n${t.content}`));
  }
  return msgs;
}

/**
 * Stream the next agent turn token-by-token. Yields chunks of plain text
 * as the model produces them. The caller is responsible for parsing tool
 * calls out of the final string (see agent/tools.ts).
 */
export async function* streamAgentTurn(turns: AgentChatTurn[]): AsyncGenerator<string, string, void> {
  const model = getModel();
  if (!model) {
    const fallback =
      "[dev-mode] GEMINI_API_KEY is not set. Configure it in server/.env to enable Master Architect mode.";
    yield fallback;
    return fallback;
  }
  const stream = await model.stream(toMessages(turns));
  let full = "";
  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    if (text) {
      full += text;
      yield text;
    }
  }
  return full;
}

/** Non-streaming variant, used by tests + simple callers. */
export async function generateAgentTurn(turns: AgentChatTurn[]): Promise<string> {
  let buf = "";
  const it = streamAgentTurn(turns);
  while (true) {
    const r = await it.next();
    if (r.done) {
      buf = (r.value as string) || buf;
      break;
    }
    buf += r.value;
  }
  return buf;
}
