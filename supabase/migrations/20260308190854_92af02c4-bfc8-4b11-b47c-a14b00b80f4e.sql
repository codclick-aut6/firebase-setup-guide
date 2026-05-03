INSERT INTO configuracoes (chave, valor) VALUES
  ('supabase_project_id', 'aealgiyzbenbhhftwkxb'),
  ('supabase_project_url', 'https://aealgiyzbenbhhftwkxb.supabase.co'),
  ('supabase_publishable_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlYWxnaXl6YmVuYmhoZnR3a3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDM1MTUsImV4cCI6MjA4Nzg3OTUxNX0.2v1ZhTmAbpcAk5jyiiH9oCz5Yd5sFwjtPdq4irIg-uE'),
  ('firebase_credentials', '{"apiKey":"AIzaSyB0BSql846hMmBa_WYiwpTdc5MDWEmDHP8","authDomain":"fb-aut6.firebaseapp.com","projectId":"fb-aut6","storageBucket":"fb-aut6.firebasestorage.app","messagingSenderId":"908504345671","appId":"1:908504345671:web:d4d624f3c6a5c4612a5562"}')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();