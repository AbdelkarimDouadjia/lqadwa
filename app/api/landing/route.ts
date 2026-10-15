import { z } from "zod";
import { database } from "@/db";
import { emptyLandingContent, landingContentSchema, parseLandingContent } from "@/lib/landing-content";
import { audit, HttpError, identity, isRootAdmin } from "@/lib/access";
import { limitedJson, privateHeaders, requireMutationOrigin, rateLimit } from "@/lib/http-security";

export const dynamic = "force-dynamic";
const landingRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("load") }),
  z.object({ action: z.literal("save"), draftVersion: z.number().int().min(0), content: landingContentSchema }),
  z.object({ action: z.literal("publish"), draftVersion: z.number().int().min(0) }),
  z.object({ action: z.literal("restore"), draftVersion: z.number().int().min(0), revision: z.string().uuid() }),
]);
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: privateHeaders });
const emptyJson = JSON.stringify(emptyLandingContent);
type LandingRow = { draft_json: string; published_json: string; draft_version: number; published_version: number; updated_at: number; published_at: number };

async function current() {
  return database().prepare("SELECT draft_json,published_json,draft_version,published_version,updated_at,published_at FROM landing_content WHERE id='main'").first<LandingRow>();
}

export async function GET() {
  try {
    const row = await current();
    return json({ content: parseLandingContent(row?.published_json) });
  } catch {
    return json({ error: "Landing page content is temporarily unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const input = landingRequest.parse(await limitedJson(request, 524_288));
    const user = await identity(request);
    if (!isRootAdmin(user.userId)) throw new HttpError("صلاحية مالك المنصة مطلوبة.", 403);
    await rateLimit(user.userId, "landing-content", 30);
    const db = database();

    if (input.action === "load") {
      const row = await current();
      const revisions = await db.prepare("SELECT id,actor,created_at FROM landing_content_revisions ORDER BY created_at DESC LIMIT 25").all<{ id: string; actor: string; created_at: number }>();
      return json({
        draft: parseLandingContent(row?.draft_json), published: parseLandingContent(row?.published_json),
        draftVersion: row?.draft_version ?? 0, publishedVersion: row?.published_version ?? 0,
        updatedAt: row?.updated_at ?? 0, publishedAt: row?.published_at ?? 0, revisions: revisions.results,
      });
    }

    const row = await current();
    if ((row?.draft_version ?? 0) !== input.draftVersion) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل الحفظ.", 409);
    const now = Date.now();

    if (input.action === "save") {
      const saved = await db.prepare(`INSERT INTO landing_content
        (id,draft_json,published_json,draft_version,published_version,updated_by,updated_at,published_at)
        VALUES ('main',?,?,1,0,?,?,0)
        ON CONFLICT(id) DO UPDATE SET draft_json=excluded.draft_json,draft_version=landing_content.draft_version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at
        WHERE landing_content.draft_version=?`)
        .bind(JSON.stringify(input.content), emptyJson, user.userId, now, input.draftVersion).run();
      if (!saved.meta.changes) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل الحفظ.", 409);
      await audit(user.userId, "landing-draft-save", "main", "Landing page draft saved").run();
      return json({ ok: true, draftVersion: input.draftVersion + 1, updatedAt: now });
    }

    if (input.action === "publish") {
      if (!row) throw new HttpError("احفظ المسودة أولاً.", 409);
      if (row.draft_json === row.published_json) return json({ ok: true, unchanged: true, publishedVersion: row.published_version, publishedAt: row.published_at });
      const revisionId = crypto.randomUUID();
      const results = await db.batch([
        db.prepare("INSERT INTO landing_content_revisions (id,actor,created_at,content_json) SELECT ?,?,?,published_json FROM landing_content WHERE id='main' AND draft_version=?").bind(revisionId, user.userId, now, input.draftVersion),
        db.prepare("UPDATE landing_content SET published_json=draft_json,published_version=published_version+1,draft_version=draft_version+1,published_at=?,updated_at=?,updated_by=? WHERE id='main' AND draft_version=? AND draft_json<>published_json").bind(now, now, user.userId, input.draftVersion),
        audit(user.userId, "landing-publish", "main", "Landing page content published", true),
        db.prepare("DELETE FROM landing_content_revisions WHERE id IN (SELECT id FROM landing_content_revisions ORDER BY created_at DESC LIMIT -1 OFFSET 25)"),
      ]);
      if (!results[1].meta.changes) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل النشر.", 409);
      return json({ ok: true, draftVersion: input.draftVersion + 1, publishedVersion: row.published_version + 1, publishedAt: now });
    }

    const revision = await db.prepare("SELECT content_json FROM landing_content_revisions WHERE id=?").bind(input.revision).first<{ content_json: string }>();
    if (!revision) throw new HttpError("هذه النسخة غير موجودة أو لم تعد محفوظة.", 404);
    const content = parseLandingContent(revision.content_json), serialized = JSON.stringify(content), revisionId = crypto.randomUUID();
    const results = await db.batch([
      db.prepare("INSERT INTO landing_content_revisions (id,actor,created_at,content_json) SELECT ?,?,?,published_json FROM landing_content WHERE id='main' AND draft_version=?").bind(revisionId, user.userId, now, input.draftVersion),
      db.prepare("UPDATE landing_content SET draft_json=CASE WHEN draft_json=published_json THEN ? ELSE draft_json END,published_json=?,draft_version=draft_version+1,published_version=published_version+1,updated_by=?,updated_at=?,published_at=? WHERE id='main' AND draft_version=?").bind(serialized, serialized, user.userId, now, now, input.draftVersion),
      audit(user.userId, "landing-restore", input.revision, "Landing page revision restored", true),
      db.prepare("DELETE FROM landing_content_revisions WHERE id IN (SELECT id FROM landing_content_revisions ORDER BY created_at DESC LIMIT -1 OFFSET 25)"),
    ]);
    if (!results[1].meta.changes) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل الاستعادة.", 409);
    return json({ ok: true, draftVersion: input.draftVersion + 1, publishedVersion: (row?.published_version ?? 0) + 1, publishedAt: now });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return json({ error: "راجع الحقول المدخلة؛ بعض النصوص طويلة أو غير صالحة." }, 400);
    console.error("Landing content operation failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "تعذّر حفظ محتوى الصفحة. بيانات المسودة محفوظة؛ حاول مجدداً." }, 503);
  }
}
