-- Allow users to read company records for companies they have explicit access to via user_company_access
-- Avoid duplicates if re-run
select public._drop_policy_if_exists('public.companies', 'user_can_read_companies_with_access');

create policy "user_can_read_companies_with_access"
  on public.companies
  for select
  using (
    exists (
      select 1
        from public.user_company_access uca
       where uca.user_id = auth.uid()
         and uca.company_id = companies.id
    )
  );