function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

/**
 * Extracts and cleans JSON from AI LLM responses
 */
function extractJsonFromAIResponse(rawText: string): any {
  let cleaned = rawText.trim();
  // Remove markdown code block fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Extract from first '[' or '{' to last ']' or '}'
  const startArr = cleaned.indexOf("[");
  const startObj = cleaned.indexOf("{");
  let startIdx = -1;
  if (startArr !== -1 && startObj !== -1) {
    startIdx = Math.min(startArr, startObj);
  } else if (startArr !== -1) {
    startIdx = startArr;
  } else if (startObj !== -1) {
    startIdx = startObj;
  }

  const endArr = cleaned.lastIndexOf("]");
  const endObj = cleaned.lastIndexOf("}");
  const endIdx = Math.max(endArr, endObj);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  return JSON.parse(cleaned);
}

export function runAIParserTests() {
  // Test 1: Clean JSON array
  const raw1 = '[{"character": "你好", "pinyin": "nǐ hǎo", "translation": "Xin chào"}]';
  const res1 = extractJsonFromAIResponse(raw1);
  assertStrictEqual(res1.length, 1);
  assertStrictEqual(res1[0].character, "你好");

  // Test 2: JSON wrapped in ```json ... ``` markdown
  const raw2 =
    'Here is the generated flashcard:\n```json\n[{"character": "谢谢", "pinyin": "xièxie", "translation": "Cảm ơn"}]\n```\nHope it helps!';
  const res2 = extractJsonFromAIResponse(raw2);
  assertStrictEqual(res2.length, 1);
  assertStrictEqual(res2[0].character, "谢谢");

  // Test 3: JSON single object wrapped in generic ``` ... ```
  const raw3 = '```\n{"character": "再见", "pinyin": "zàijiàn", "translation": "Tạm biệt"}\n```';
  const res3 = extractJsonFromAIResponse(raw3);
  assertStrictEqual(res3.character, "再见");
  assertStrictEqual(res3.pinyin, "zàijiàn");
}
