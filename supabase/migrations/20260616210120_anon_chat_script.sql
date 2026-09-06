-- Allow anonymous visitors to read the live-chat script column so the chat
-- widget (Smartsupp, etc.) renders on public pages like the landing page.
GRANT SELECT (support_chat_script) ON public.app_settings TO anon;
