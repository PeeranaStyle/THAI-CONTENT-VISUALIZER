alter table public.ai_generation_jobs
  add column error_category text
  check (error_category is null or error_category in ('upstream', 'timeout', 'parsing', 'truncated', 'validation', 'persistence'));
