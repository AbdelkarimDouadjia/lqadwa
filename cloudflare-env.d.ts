declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    APP_ADMIN_IDS?: string;
    APP_OWNER_EMAIL?: string;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    RELEASE_MODE?: string;
    HEALTH_PROFILE_COLLECTION?: string;
    PRESCRIPTION_AI_ENABLED?: string;
    GROUNDED_ASSISTANT_ENABLED?: string;
  }
}
