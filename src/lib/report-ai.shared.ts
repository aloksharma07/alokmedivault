export const REPORT_AI_MAX_TEXT_CHARS = 3200;
export const REPORT_AI_MAX_QUESTION_CHARS = 240;
export const REPORT_AI_MAX_MESSAGES = 6;
export const REPORT_AI_MAX_OUTPUT_TOKENS = 1024;

export function limitReportAiText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, REPORT_AI_MAX_TEXT_CHARS);
}