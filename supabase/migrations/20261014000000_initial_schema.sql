create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  display_name text not null,
  avatar_path text,
  role text not null default 'student' check (role in ('student','teacher','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index users_username_lower_unique on public.users (lower(username));
create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now()
);
create index user_sessions_active_lookup on public.user_sessions (token_hash, expires_at) where revoked_at is null;

create table public.auth_rate_limits (
  bucket_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);
create or replace function public.consume_auth_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
  insert into public.auth_rate_limits(bucket_key, request_count, window_started_at, blocked_until)
  values (p_key, 1, now(), case when p_max <= 1 then now() + make_interval(secs => p_window_seconds) else null end)
  on conflict (bucket_key) do update set
    request_count = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else public.auth_rate_limits.request_count + 1 end,
    window_started_at = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else public.auth_rate_limits.window_started_at end,
    blocked_until = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then case when p_max <= 1 then now() + make_interval(secs => p_window_seconds) else null end
      when public.auth_rate_limits.blocked_until is not null then public.auth_rate_limits.blocked_until
      when public.auth_rate_limits.request_count + 1 >= p_max then now() + make_interval(secs => p_window_seconds)
      else null end;
  select blocked_until is null into allowed from public.auth_rate_limits where bucket_key = p_key;
  return allowed;
end;
$$;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  color_identifier text not null default 'blue',
  created_at timestamptz not null default now(),
  unique(user_id, name)
);
create index subjects_user_id_idx on public.subjects(user_id);

create table public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text not null default '',
  source_type text not null check (source_type in ('pasted_text','pdf','document')),
  original_text text not null default '',
  extracted_text text not null default '',
  processing_status text not null default 'ready' check (processing_status in ('queued','processing','ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learning_materials_owner_recent_idx on public.learning_materials(user_id, created_at desc);
create index learning_materials_subject_idx on public.learning_materials(user_id, subject_id);
create trigger learning_materials_updated_at before update on public.learning_materials for each row execute function public.set_updated_at();

create table public.material_files (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  bucket_name text not null default 'learning-materials',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);
create index material_files_owner_material_idx on public.material_files(user_id, material_id);

create table public.knowledge_graphs (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  graph_data jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  generation_model text not null,
  created_at timestamptz not null default now()
);
create index knowledge_graphs_owner_idx on public.knowledge_graphs(user_id, material_id, created_at desc);

create table public.graph_nodes (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.knowledge_graphs(id) on delete cascade,
  concept_key text not null,
  title text not null,
  description text not null default '',
  node_type text not null default 'concept',
  source_references jsonb not null default '[]'::jsonb,
  unique(graph_id, concept_key)
);
create index graph_nodes_graph_idx on public.graph_nodes(graph_id);

create table public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.knowledge_graphs(id) on delete cascade,
  source_node_id uuid not null references public.graph_nodes(id) on delete cascade,
  target_node_id uuid not null references public.graph_nodes(id) on delete cascade,
  relationship text not null,
  check (source_node_id <> target_node_id),
  unique(graph_id, source_node_id, target_node_id, relationship)
);
create index graph_edges_graph_idx on public.graph_edges(graph_id);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  graph_node_id uuid references public.graph_nodes(id) on delete set null,
  title text not null,
  description text not null default '',
  difficulty text not null check (difficulty in ('easy','medium','hard','mixed')),
  quiz_type text not null check (quiz_type in ('multiple_choice','true_false','mixed')),
  generation_model text not null,
  status text not null default 'ready' check (status in ('generating','ready','failed')),
  question_count integer not null default 0 check (question_count >= 0),
  created_at timestamptz not null default now()
);
create index quizzes_owner_recent_idx on public.quizzes(user_id, created_at desc);
create index quizzes_material_idx on public.quizzes(user_id, material_id, created_at desc);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice','true_false')),
  options jsonb not null,
  correct_answer jsonb not null,
  explanation text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  concept_keys jsonb not null default '[]'::jsonb,
  source_references jsonb not null default '[]'::jsonb,
  position integer not null check (position > 0),
  unique(quiz_id, position)
);
create index quiz_questions_quiz_idx on public.quiz_questions(quiz_id, position);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer,
  total_questions integer not null,
  accuracy numeric(5,2),
  duration_seconds integer not null default 0,
  mode text not null default 'exam' check (mode in ('practice','exam')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  unique(id, quiz_id, user_id)
);
create index quiz_attempts_owner_recent_idx on public.quiz_attempts(user_id, started_at desc);
create index quiz_attempts_quiz_user_idx on public.quiz_attempts(quiz_id, user_id, status);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer jsonb,
  is_correct boolean,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  answered_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);
create index quiz_answers_attempt_idx on public.quiz_answers(attempt_id);

create table public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  concept_key text not null,
  mastery_score numeric(5,2) not null default 0 check (mastery_score between 0 and 100),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  last_practiced_at timestamptz not null default now(),
  unique(user_id, material_id, concept_key)
);
create index topic_mastery_owner_score_idx on public.topic_mastery(user_id, mastery_score asc);

create table public.study_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  attempt_id uuid references public.quiz_attempts(id) on delete set null,
  recommendation_type text not null,
  title text not null,
  description text not null,
  concept_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index study_recommendations_owner_idx on public.study_recommendations(user_id, created_at desc);

create table public.generated_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  title text not null,
  content jsonb not null,
  storage_path text,
  created_at timestamptz not null default now()
);
create index generated_notes_owner_idx on public.generated_notes(user_id, created_at desc);

create table public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index learning_activity_owner_recent_idx on public.learning_activity(user_id, created_at desc);
create index learning_activity_owner_day_idx on public.learning_activity(user_id, ((created_at at time zone 'UTC')::date));

create table public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  material_id uuid references public.learning_materials(id) on delete set null,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  model text not null,
  input_tokens integer,
  output_tokens integer,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index ai_generation_jobs_owner_idx on public.ai_generation_jobs(user_id, created_at desc);
create unique index ai_generation_jobs_one_active on public.ai_generation_jobs(user_id, material_id, job_type) where status in ('queued','processing');

create table public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  default_quiz_count integer not null default 10 check (default_quiz_count between 5 and 20),
  default_difficulty text not null default 'mixed' check (default_difficulty in ('easy','medium','hard','mixed')),
  graph_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.register_user_with_session(
  p_username text, p_password_hash text, p_display_name text, p_token_hash text, p_expires_at timestamptz
)
returns table(id uuid, username text, display_name text)
language plpgsql security definer set search_path = '' as $$
declare new_user_id uuid;
begin
  insert into public.users(username, password_hash, display_name)
  values (lower(trim(p_username)), p_password_hash, trim(p_display_name))
  returning users.id into new_user_id;
  insert into public.user_settings(user_id) values (new_user_id);
  insert into public.user_sessions(user_id, token_hash, expires_at)
  values (new_user_id, p_token_hash, p_expires_at);
  insert into public.learning_activity(user_id, activity_type, metadata)
  values (new_user_id, 'account_created', '{}'::jsonb);
  return query select u.id, u.username, u.display_name from public.users u where u.id = new_user_id;
end;
$$;

create or replace function public.create_user_session(p_user_id uuid, p_token_hash text, p_expires_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.users set last_login_at = now() where id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;
  insert into public.user_sessions(user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);
end;
$$;

create or replace function public.get_user_learning_summary(p_user_id uuid)
returns table(
  material_count bigint,
  completed_quiz_count bigint,
  total_correct bigint,
  total_questions bigint,
  graph_count bigint,
  note_count bigint,
  current_streak integer
)
language plpgsql security definer set search_path = '' as $$
declare
  local_today date := (now() at time zone 'Asia/Bangkok')::date;
  day_cursor date;
  active_days date[];
  streak_value integer := 0;
begin
  select coalesce(array_agg(day_value order by day_value desc), array[]::date[]) into active_days
  from (
    select distinct (la.created_at at time zone 'Asia/Bangkok')::date as day_value
    from public.learning_activity la
    where la.user_id = p_user_id
      and la.created_at >= now() - interval '370 days'
  ) days;
  day_cursor := local_today;
  if not (day_cursor = any(active_days)) then day_cursor := local_today - 1; end if;
  foreach day_cursor in array active_days loop
    exit when day_cursor < local_today - 365;
    if day_cursor = local_today - streak_value or day_cursor = local_today - 1 - streak_value then
      streak_value := streak_value + 1;
    else
      exit;
    end if;
  end loop;
  if (local_today = any(active_days)) then
    null;
  elsif (local_today - 1 = any(active_days)) then
    streak_value := greatest(0, streak_value);
  else
    streak_value := 0;
  end if;
  return query select
    (select count(*) from public.learning_materials m where m.user_id = p_user_id),
    (select count(*) from public.quiz_attempts a where a.user_id = p_user_id and a.status = 'completed'),
    coalesce((select sum(a.score) from public.quiz_attempts a where a.user_id = p_user_id and a.status = 'completed'), 0)::bigint,
    coalesce((select sum(a.total_questions) from public.quiz_attempts a where a.user_id = p_user_id and a.status = 'completed'), 0)::bigint,
    (select count(*) from public.knowledge_graphs g where g.user_id = p_user_id),
    (select count(*) from public.generated_notes n where n.user_id = p_user_id),
    streak_value;
end;
$$;

create or replace function public.persist_generated_quiz(
  p_job_id uuid,
  p_user_id uuid,
  p_material_id uuid,
  p_graph_node_id uuid,
  p_title text,
  p_description text,
  p_difficulty text,
  p_quiz_type text,
  p_model text,
  p_questions jsonb,
  p_input_tokens integer,
  p_output_tokens integer
)
returns table(quiz_id uuid, question_count integer)
language plpgsql security definer set search_path = '' as $$
declare new_quiz_id uuid; question_total integer;
begin
  if not exists (
    select 1 from public.ai_generation_jobs j
    where j.id = p_job_id and j.user_id = p_user_id and j.material_id = p_material_id
      and j.job_type = 'quiz' and j.status = 'processing'
  ) then raise exception 'generation_job_not_active'; end if;
  if not exists (select 1 from public.learning_materials m where m.id = p_material_id and m.user_id = p_user_id) then
    raise exception 'material_not_owned';
  end if;
  if p_graph_node_id is not null and not exists (
    select 1 from public.graph_nodes n
    join public.knowledge_graphs g on g.id = n.graph_id
    where n.id = p_graph_node_id and g.user_id = p_user_id and g.material_id = p_material_id
  ) then raise exception 'graph_node_not_owned'; end if;

  question_total := jsonb_array_length(p_questions);
  if question_total < 1 or question_total > 20 then raise exception 'invalid_question_count'; end if;
  insert into public.quizzes(user_id, material_id, graph_node_id, title, description, difficulty, quiz_type, generation_model, status, question_count)
  values (p_user_id, p_material_id, p_graph_node_id, p_title, p_description, p_difficulty, p_quiz_type, p_model, 'ready', question_total)
  returning id into new_quiz_id;

  insert into public.quiz_questions(quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty, concept_keys, source_references, position)
  select
    new_quiz_id,
    q.value ->> 'question',
    q.value ->> 'type',
    case when q.value ->> 'type' = 'true_false'
      then '[{"id":"true","text":"จริง"},{"id":"false","text":"ไม่จริง"}]'::jsonb
      else q.value -> 'options' end,
    q.value -> 'correctAnswer',
    q.value ->> 'explanation',
    q.value ->> 'difficulty',
    coalesce(q.value -> 'conceptKeys', '[]'::jsonb),
    coalesce(q.value -> 'sourceReferences', '[]'::jsonb),
    q.ordinality::integer
  from jsonb_array_elements(p_questions) with ordinality as q(value, ordinality);

  update public.ai_generation_jobs set status = 'completed', input_tokens = p_input_tokens,
    output_tokens = p_output_tokens, completed_at = now(), error_message = null
  where id = p_job_id and user_id = p_user_id;
  insert into public.learning_activity(user_id, activity_type, reference_id, metadata)
  values (p_user_id, 'quiz_generated', new_quiz_id, jsonb_build_object('materialId', p_material_id, 'questionCount', question_total));
  return query select new_quiz_id, question_total;
end;
$$;

create or replace function public.submit_quiz_attempt(p_attempt_id uuid, p_user_id uuid, p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempt_row public.quiz_attempts%rowtype;
  correct_total integer;
  accuracy_value numeric(5,2);
  material_id_value uuid;
  concept_row record;
begin
  select * into attempt_row from public.quiz_attempts
  where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'attempt_not_found'; end if;
  if attempt_row.status = 'completed' then
    return jsonb_build_object('score', attempt_row.score, 'totalQuestions', attempt_row.total_questions,
      'accuracy', attempt_row.accuracy, 'completedAt', attempt_row.completed_at, 'alreadyCompleted', true);
  end if;
  if attempt_row.status <> 'in_progress' then raise exception 'attempt_not_active'; end if;
  if greatest(0, least(p_duration_seconds, 86400)) < 0 then raise exception 'invalid_duration'; end if;

  update public.quiz_answers qa set is_correct = (qa.selected_answer is not distinct from q.correct_answer)
  from public.quiz_questions q
  where qa.attempt_id = p_attempt_id and q.id = qa.question_id and q.quiz_id = attempt_row.quiz_id;
  select count(*) filter (where qa.is_correct is true)::integer into correct_total
  from public.quiz_answers qa where qa.attempt_id = p_attempt_id;
  accuracy_value := case when attempt_row.total_questions = 0 then 0
    else round((correct_total::numeric / attempt_row.total_questions::numeric) * 100, 2) end;
  select q.material_id into material_id_value from public.quizzes q
  where q.id = attempt_row.quiz_id and q.user_id = p_user_id;
  if material_id_value is null then raise exception 'quiz_not_owned'; end if;

  update public.quiz_attempts set status = 'completed', completed_at = now(), score = correct_total,
    accuracy = accuracy_value, duration_seconds = greatest(0, least(p_duration_seconds, 86400))
  where id = p_attempt_id and user_id = p_user_id;

  for concept_row in
    select concept_key,
      count(*) filter (where qa.is_correct is true)::integer as correct_count,
      count(*) filter (where qa.is_correct is false)::integer as incorrect_count
    from public.quiz_answers qa
    join public.quiz_questions q on q.id = qa.question_id
    cross join lateral jsonb_array_elements_text(q.concept_keys) as keys(concept_key)
    where qa.attempt_id = p_attempt_id
    group by concept_key
  loop
    insert into public.topic_mastery(user_id, material_id, concept_key, mastery_score, correct_count, incorrect_count, last_practiced_at)
    values (p_user_id, material_id_value, concept_row.concept_key,
      round((concept_row.correct_count::numeric / greatest(1, concept_row.correct_count + concept_row.incorrect_count)) * 100, 2),
      concept_row.correct_count, concept_row.incorrect_count, now())
    on conflict (user_id, material_id, concept_key) do update set
      correct_count = public.topic_mastery.correct_count + excluded.correct_count,
      incorrect_count = public.topic_mastery.incorrect_count + excluded.incorrect_count,
      mastery_score = round(((public.topic_mastery.correct_count + excluded.correct_count)::numeric /
        greatest(1, public.topic_mastery.correct_count + excluded.correct_count + public.topic_mastery.incorrect_count + excluded.incorrect_count)) * 100, 2),
      last_practiced_at = now();
  end loop;

  insert into public.learning_activity(user_id, activity_type, reference_id, metadata)
  values (p_user_id, 'quiz_completed', p_attempt_id,
    jsonb_build_object('quizId', attempt_row.quiz_id, 'score', correct_total, 'totalQuestions', attempt_row.total_questions, 'accuracy', accuracy_value));
  return jsonb_build_object('score', correct_total, 'totalQuestions', attempt_row.total_questions,
    'accuracy', accuracy_value, 'completedAt', now(), 'alreadyCompleted', false);
end;
$$;

create or replace function public.persist_generated_graph(
  p_job_id uuid, p_user_id uuid, p_material_id uuid, p_title text, p_model text, p_graph jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_graph_id uuid;
  concept_ids jsonb := '{}'::jsonb;
  node_value jsonb;
  edge_value jsonb;
  node_id_value uuid;
begin
  if not exists (
    select 1 from public.ai_generation_jobs j where j.id = p_job_id and j.user_id = p_user_id
      and j.material_id = p_material_id and j.job_type = 'graph' and j.status = 'processing'
  ) then raise exception 'generation_job_not_active'; end if;
  if not exists (select 1 from public.learning_materials m where m.id = p_material_id and m.user_id = p_user_id) then raise exception 'material_not_owned'; end if;

  insert into public.knowledge_graphs(material_id,user_id,title,graph_data,generation_model)
  values (p_material_id,p_user_id,p_title,'{"layout":"dagre","positions":{}}'::jsonb,p_model)
  returning id into new_graph_id;

  for node_value in select value from jsonb_array_elements(p_graph -> 'nodes') loop
    insert into public.graph_nodes(graph_id,concept_key,title,description,node_type,source_references)
    values (new_graph_id,node_value ->> 'conceptKey',node_value ->> 'title',node_value ->> 'description',node_value ->> 'nodeType',coalesce(node_value -> 'sourceReferences','[]'::jsonb))
    returning id into node_id_value;
    concept_ids := concept_ids || jsonb_build_object(node_value ->> 'conceptKey',node_id_value);
  end loop;

  for edge_value in select value from jsonb_array_elements(p_graph -> 'edges') loop
    if not (concept_ids ? (edge_value ->> 'sourceConceptKey')) or not (concept_ids ? (edge_value ->> 'targetConceptKey')) then raise exception 'graph_edge_concept_missing'; end if;
    insert into public.graph_edges(graph_id,source_node_id,target_node_id,relationship)
    values (new_graph_id,(concept_ids ->> (edge_value ->> 'sourceConceptKey'))::uuid,(concept_ids ->> (edge_value ->> 'targetConceptKey'))::uuid,edge_value ->> 'relationship');
  end loop;

  update public.ai_generation_jobs set status = 'completed', completed_at = now(), error_message = null
  where id = p_job_id and user_id = p_user_id;
  insert into public.learning_activity(user_id,activity_type,reference_id,metadata)
  values (p_user_id,'graph_generated',new_graph_id,jsonb_build_object('materialId',p_material_id,'nodeCount',jsonb_array_length(p_graph -> 'nodes')));
  return new_graph_id;
end;
$$;

-- Custom auth is enforced by the application server. The anon and authenticated
-- roles have no table policies; only the server's service-role client may access data.
do $$ declare t text; begin
  foreach t in array array[
    'users','user_sessions','auth_rate_limits','subjects','learning_materials','material_files',
    'knowledge_graphs','graph_nodes','graph_edges','quizzes','quiz_questions','quiz_attempts',
    'quiz_answers','topic_mastery','study_recommendations','generated_notes','learning_activity',
    'ai_generation_jobs','user_settings'
  ] loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.register_user_with_session(text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.create_user_session(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_user_learning_summary(uuid) from public, anon, authenticated;
revoke all on function public.persist_generated_quiz(uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, integer, integer) from public, anon, authenticated;
revoke all on function public.submit_quiz_attempt(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.persist_generated_graph(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;
grant execute on function public.register_user_with_session(text, text, text, text, timestamptz) to service_role;
grant execute on function public.create_user_session(uuid, text, timestamptz) to service_role;
grant execute on function public.get_user_learning_summary(uuid) to service_role;
grant execute on function public.persist_generated_quiz(uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, integer, integer) to service_role;
grant execute on function public.submit_quiz_attempt(uuid, uuid, integer) to service_role;
grant execute on function public.persist_generated_graph(uuid, uuid, uuid, text, text, jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('learning-materials', 'learning-materials', false, 25000000, array['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('generated-assets', 'generated-assets', false, 12000000, array['image/png','image/jpeg','application/pdf']),
  ('user-avatars', 'user-avatars', false, 5000000, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are created: client roles cannot read or write private files.
