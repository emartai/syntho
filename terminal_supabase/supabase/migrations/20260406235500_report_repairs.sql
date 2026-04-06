alter table public.privacy_scores
  add column if not exists singling_out_risk numeric(8,4),
  add column if not exists linkability_risk numeric(8,4);

alter table public.compliance_reports
  add column if not exists gdpr_passed boolean,
  add column if not exists hipaa_passed boolean;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quality_reports_synthetic_dataset_id_key'
  ) then
    alter table public.quality_reports
      add constraint quality_reports_synthetic_dataset_id_key unique (synthetic_dataset_id);
  end if;
end $$;
