create table public.ai_save_requests (
  request_id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  operation text not null check (operation in ('graph', 'quiz', 'notes')),
  resource_id uuid,
  created_at timestamptz not null default now()
);

alter table public.ai_save_requests enable row level security;
revoke all on public.ai_save_requests from public, anon, authenticated;

create or replace function public.save_generated_content(
  p_operation text,
  p_request_id uuid,
  p_user_id uuid,
  p_material_id uuid,
  p_title text,
  p_payload jsonb,
  p_metadata jsonb
)
returns table(resource_id uuid, resource_title text, item_count integer, resource_created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  saved_id uuid;
  saved_count integer;
  saved_created_at timestamptz;
  saved_request public.ai_save_requests%rowtype;
  job_id uuid;
  new_quiz_id uuid;
  new_graph_id uuid;
  node_value jsonb;
  edge_value jsonb;
  node_id_value uuid;
  concept_ids jsonb := '{}'::jsonb;
begin
  if p_operation is null or p_operation not in ('graph', 'quiz', 'notes') then raise exception 'invalid_save_operation'; end if;
  if not exists (select 1 from public.learning_materials m where m.id = p_material_id and m.user_id = p_user_id) then
    raise exception 'material_not_owned';
  end if;

  insert into public.ai_save_requests(request_id, user_id, material_id, operation)
  values (p_request_id, p_user_id, p_material_id, p_operation)
  on conflict (request_id) do nothing;
  if not found then
    select * into saved_request from public.ai_save_requests where request_id = p_request_id for update;
    if saved_request.user_id <> p_user_id or saved_request.material_id <> p_material_id or saved_request.operation <> p_operation then raise exception 'save_request_id_conflict'; end if;
    if saved_request.resource_id is null then raise exception 'save_request_incomplete'; end if;
    if p_operation = 'quiz' then
      select q.title, q.question_count, q.created_at into resource_title, item_count, saved_created_at from public.quizzes q where q.id = saved_request.resource_id and q.user_id = p_user_id;
    elsif p_operation = 'graph' then
      select g.title, count(n.id)::integer, g.created_at into resource_title, item_count, saved_created_at from public.knowledge_graphs g left join public.graph_nodes n on n.graph_id = g.id where g.id = saved_request.resource_id and g.user_id = p_user_id group by g.id;
    else
      select n.title, 1, n.created_at into resource_title, item_count, saved_created_at from public.generated_notes n where n.id = saved_request.resource_id and n.user_id = p_user_id;
    end if;
    return query select saved_request.resource_id, resource_title, item_count, saved_created_at;
    return;
  end if;

  if p_operation = 'quiz' then
    insert into public.ai_generation_jobs(user_id, material_id, job_type, status, model)
    values (p_user_id, p_material_id, 'quiz', 'completed', coalesce(p_metadata ->> 'model', 'unknown'))
    returning id into job_id;
    update public.ai_generation_jobs set input_tokens = nullif(p_metadata ->> 'inputTokens', 'null')::integer,
      output_tokens = nullif(p_metadata ->> 'outputTokens', 'null')::integer, completed_at = now()
    where id = job_id;
    if nullif(p_metadata ->> 'graphNodeId', '') is not null and not exists (
      select 1 from public.graph_nodes n join public.knowledge_graphs g on g.id = n.graph_id
      where n.id = (p_metadata ->> 'graphNodeId')::uuid and g.user_id = p_user_id and g.material_id = p_material_id
    ) then raise exception 'graph_node_not_owned'; end if;
    insert into public.quizzes(user_id, material_id, graph_node_id, title, description, difficulty, quiz_type, generation_model, status, question_count)
    values (p_user_id, p_material_id, nullif(p_metadata ->> 'graphNodeId', '')::uuid, p_title,
      coalesce(p_metadata ->> 'description', ''), p_metadata ->> 'difficulty', p_metadata ->> 'quizType',
      coalesce(p_metadata ->> 'model', 'unknown'), 'ready', jsonb_array_length(p_payload -> 'questions'))
    returning id, question_count into new_quiz_id, saved_count;
    insert into public.quiz_questions(quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty, concept_keys, source_references, position)
    select new_quiz_id, q.value ->> 'question', q.value ->> 'type',
      case when q.value ->> 'type' = 'true_false' then '[{"id":"true","text":"จริง"},{"id":"false","text":"ไม่จริง"}]'::jsonb else q.value -> 'options' end,
      q.value -> 'correctAnswer', q.value ->> 'explanation', q.value ->> 'difficulty',
      coalesce(q.value -> 'conceptKeys', '[]'::jsonb), coalesce(q.value -> 'sourceReferences', '[]'::jsonb), q.ordinality::integer
    from jsonb_array_elements(p_payload -> 'questions') with ordinality as q(value, ordinality);
    insert into public.learning_activity(user_id, activity_type, reference_id, metadata)
    values (p_user_id, 'quiz_generated', new_quiz_id, jsonb_build_object('materialId', p_material_id, 'questionCount', saved_count));
    saved_id := new_quiz_id;
  elsif p_operation = 'graph' then
    insert into public.ai_generation_jobs(user_id, material_id, job_type, status, model)
    values (p_user_id, p_material_id, 'graph', 'completed', coalesce(p_metadata ->> 'model', 'unknown'))
    returning id into job_id;
    update public.ai_generation_jobs set input_tokens = nullif(p_metadata ->> 'inputTokens', 'null')::integer,
      output_tokens = nullif(p_metadata ->> 'outputTokens', 'null')::integer, completed_at = now()
    where id = job_id;
    insert into public.knowledge_graphs(material_id, user_id, title, graph_data, generation_model)
    values (p_material_id, p_user_id, p_title, '{"layout":"dagre","positions":{}}'::jsonb, coalesce(p_metadata ->> 'model', 'unknown'))
    returning id into new_graph_id;
    for node_value in select value from jsonb_array_elements(p_payload -> 'graph' -> 'nodes') loop
      insert into public.graph_nodes(graph_id, concept_key, title, description, node_type, source_references)
      values (new_graph_id, node_value ->> 'conceptKey', node_value ->> 'title', node_value ->> 'description', node_value ->> 'nodeType', coalesce(node_value -> 'sourceReferences', '[]'::jsonb))
      returning id into node_id_value;
      concept_ids := concept_ids || jsonb_build_object(node_value ->> 'conceptKey', node_id_value);
    end loop;
    for edge_value in select value from jsonb_array_elements(p_payload -> 'graph' -> 'edges') loop
      if not (concept_ids ? (edge_value ->> 'sourceConceptKey')) or not (concept_ids ? (edge_value ->> 'targetConceptKey')) then raise exception 'graph_edge_concept_missing'; end if;
      insert into public.graph_edges(graph_id, source_node_id, target_node_id, relationship)
      values (new_graph_id, (concept_ids ->> (edge_value ->> 'sourceConceptKey'))::uuid, (concept_ids ->> (edge_value ->> 'targetConceptKey'))::uuid, edge_value ->> 'relationship');
    end loop;
    insert into public.learning_activity(user_id, activity_type, reference_id, metadata)
    values (p_user_id, 'graph_generated', new_graph_id, jsonb_build_object('materialId', p_material_id, 'nodeCount', jsonb_array_length(p_payload -> 'graph' -> 'nodes')));
    saved_id := new_graph_id;
    saved_count := jsonb_array_length(p_payload -> 'graph' -> 'nodes');
  else
    insert into public.generated_notes(user_id, material_id, title, content)
    values (p_user_id, p_material_id, p_title, p_payload -> 'notes') returning id, created_at into saved_id, saved_created_at;
    insert into public.learning_activity(user_id, activity_type, reference_id, metadata)
    values (p_user_id, 'note_generated', saved_id, jsonb_build_object('material_id', p_material_id));
    saved_count := 1;
  end if;

  update public.ai_save_requests set resource_id = saved_id where request_id = p_request_id;
  if saved_created_at is null then
    if p_operation = 'quiz' then select q.created_at into saved_created_at from public.quizzes q where q.id = saved_id;
    else select g.created_at into saved_created_at from public.knowledge_graphs g where g.id = saved_id;
    end if;
  end if;
  return query select saved_id, p_title, saved_count, saved_created_at;
end;
$$;

revoke all on function public.save_generated_content(text, uuid, uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_generated_content(text, uuid, uuid, uuid, text, jsonb, jsonb) to service_role;
