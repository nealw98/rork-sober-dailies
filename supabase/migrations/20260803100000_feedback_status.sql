-- Feedback triage on soberdailies.com/admin: open/closed status + delete.
-- app_feedback previously had admin SELECT and anon INSERT only — the admin
-- account could read but never write, so status/delete need their own
-- policies (same has_role gate as the read).
alter table public.app_feedback
  add column if not exists status text not null default 'open'
  check (status in ('open', 'closed'));

drop policy if exists "Admins can update feedback" on public.app_feedback;
create policy "Admins can update feedback"
  on public.app_feedback for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete feedback" on public.app_feedback;
create policy "Admins can delete feedback"
  on public.app_feedback for delete
  using (public.has_role(auth.uid(), 'admin'));
