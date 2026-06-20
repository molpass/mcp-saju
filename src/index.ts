#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { calculateSaju, serializeSaju, type SajuInput } from "ssaju";

const inputSchema = {
  year: z.number().int().describe("양력/음력 연도 (예: 2001)"),
  month: z.number().int().min(1).max(12).describe("월 1-12"),
  day: z.number().int().min(1).max(31).describe("일 1-31"),
  hour: z.number().int().min(0).max(23).default(12).describe("시 0-23 (기본 12)"),
  minute: z.number().int().min(0).max(59).default(0).describe("분 0-59 (기본 0)"),
  gender: z
    .enum(["남", "여"])
    .optional()
    .describe("성별. 대운 방향에 영향 → 정확한 결과 위해 제공 권장"),
  calendar: z
    .enum(["solar", "lunar"])
    .default("solar")
    .describe("입력 달력 종류 (기본 solar)"),
  leap: z.boolean().default(false).describe("음력 윤달 여부 (calendar=lunar일 때만 의미)"),
  timezone: z.string().default("Asia/Seoul").describe("IANA 시간대 (기본 Asia/Seoul)"),
  longitude: z.number().optional().describe("경도. 진태양시 보정용"),
  applyLocalMeanTime: z
    .boolean()
    .optional()
    .describe("진태양시(지방평균시) 보정 적용 여부"),
  format: z
    .enum(["compact", "markdown", "json"])
    .default("compact")
    .describe(
      "출력 형식. compact=LLM용 압축(기본), markdown=사람용 상세, json=구조화 데이터(함수 필드 제외)",
    ),
};

const server = new McpServer({
  name: "saju-mcp",
  version: "1.0.0",
});

server.registerTool(
  "calculate_saju",
  {
    title: "사주/만세력 계산",
    description:
      "생년월일시로 사주·만세력을 계산한다. 원국(사주팔자)·십성·12운성·합충형파해·신살·격국·용신·대운·세운·월운·공망을 한 번에 산출한다. gender는 대운 방향에 영향을 주므로 정확한 결과를 위해 제공을 권장한다.",
    inputSchema,
  },
  async (args) => {
    const { format, ...rest } = args;
    const result = calculateSaju(rest as SajuInput);
    const text =
      format === "json"
        ? JSON.stringify(serializeSaju(result), null, 2)
        : format === "markdown"
          ? result.toMarkdown()
          : result.toCompact();
    return {
      content: [{ type: "text", text }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
