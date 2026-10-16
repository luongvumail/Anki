function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

function cleanChineseSentence(sentence: string): string {
  return sentence.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?！。，？"']/g, "").replace(/\s+/g, "");
}

export function runSentenceBuilderLogicTests() {
  // Test 1: Punctuation stripping
  const raw1 = "我喜欢学中文！";
  const clean1 = cleanChineseSentence(raw1);
  assertStrictEqual(clean1, "我喜欢学中文", "Punctuation ！ must be stripped");

  const raw2 = "你好，世界。";
  const clean2 = cleanChineseSentence(raw2);
  assertStrictEqual(clean2, "你好世界", "Punctuation ， and 。 must be stripped");

  // Test 2: Whitespace and tab stripping
  const raw3 = " 他  在   看  书  ";
  const clean3 = cleanChineseSentence(raw3);
  assertStrictEqual(clean3, "他在看书", "Internal and trailing whitespaces must be stripped");

  // Test 3: Sentence validation (Assembled vs Target)
  const assembledWords = ["我", "想", "去", "北京"];
  const built = assembledWords.join("");
  const target = cleanChineseSentence("我想去北京。");
  assertStrictEqual(built === target, true, "Correct assembled words must match target");

  const wrongOrderWords = ["我想", "北京", "去"];
  const wrongBuilt = wrongOrderWords.join("");
  assertStrictEqual(wrongBuilt === target, false, "Wrong order words must fail");
}
