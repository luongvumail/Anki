ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS example_zh TEXT,
  ADD COLUMN IF NOT EXISTS example_pinyin TEXT,
  ADD COLUMN IF NOT EXISTS example_vi TEXT;

NOTIFY pgrst, 'reload schema';
