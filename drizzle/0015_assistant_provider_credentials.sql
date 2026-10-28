-- Credentials are AES-256-GCM sealed by the Worker; this table never stores plaintext API keys.
CREATE TABLE assistant_provider_credentials (
  provider TEXT PRIMARY KEY NOT NULL CHECK (provider IN ('openrouter','openai','anthropic','gemini','groq','mistral','deepseek')),
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_version INTEGER NOT NULL CHECK (key_version > 0),
  revision INTEGER NOT NULL CHECK (revision > 0),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1) AND (enabled=0 OR provider='openrouter')),
  tested_at INTEGER NOT NULL DEFAULT 0,
  tested_version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
