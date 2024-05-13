import { defineTool, generate } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { defineFlow, startFlowsServer } from "@genkit-ai/flow";
import { gemini15Pro, googleAI } from "@genkit-ai/googleai";
import * as cheerio from "cheerio";
import * as z from "zod";

configureGenkit({
  plugins: [googleAI({ apiVersion: ["v1beta"] })],
  logLevel: "info",
  enableTracingAndMetrics: true,
});

const webLoader = defineTool(
  {
    name: "webLoader",
    description:
      "When a URL is received, it accesses the URL and retrieves the content inside.",
    inputSchema: z.object({ url: z.string() }),
    outputSchema: z.string(),
  },
  async ({ url }) => {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();
    if ($("article")) {
      return $("article").text();
    }
    return $("body").text();
  },
);

export const summarize = defineFlow(
  {
    name: "summarize",
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (url) => {
    const llmResponse = await generate({
      prompt: `First, fetch this link: "${url}". Then, summarize the content within 300 words in Japanese.`,
      model: gemini15Pro,
      tools: [webLoader],
      config: { temperature: 1 },
    });
    return llmResponse.text();
  },
);

startFlowsServer();
