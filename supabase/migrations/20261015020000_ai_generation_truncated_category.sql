alter table public.ai_generation_jobs
  drop constraint if exists ai_generation_jobs_error_category_check;

alter table public.ai_generation_jobs
  add constraint ai_generation_jobs_error_category_check
  check (error_category is null or error_category in ('upstream', 'timeout', 'parsing', 'truncated', 'validation', 'persistence'));
