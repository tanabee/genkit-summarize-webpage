import { defineTool, generate } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { defineFlow, startFlowsServer } from "@genkit-ai/flow";
import { gemini15Flash, googleAI } from "@genkit-ai/googleai";
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

export const mainFlow = defineFlow(
  {
    name: "mainFlow",
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    const llmResponse = await generate({
      prompt: prompt,
      model: gemini15Flash,
      tools: [webLoader],
      config: { temperature: 1 },
    });
    return llmResponse.text();
  },
);

startFlowsServer();
