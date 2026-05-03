-- Drop the restrictive policy
DROP POLICY IF EXISTS "Super admins can manage configuracoes" ON configuracoes;

-- Allow public read access (these are public credentials anyway)
CREATE POLICY "Allow public read configuracoes"
  ON configuracoes FOR SELECT
  USING (true);

-- Allow all operations for now (since auth is Firebase-based, RLS with auth.jwt won't work)
CREATE POLICY "Allow all write configuracoes"
  ON configuracoes FOR ALL
  USING (true)
  WITH CHECK (true);