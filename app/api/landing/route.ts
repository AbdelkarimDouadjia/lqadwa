import { z } from "zod";
import { database } from "@/db";
import { contentPageKeys, landingContentSchema, parseLandingContent, type ContentPageKey } from "@/lib/landing-content";
import { defaultPageContent, contentPageId } from "@/lib/content-pages";
import { audit, HttpError, identity, isRootAdmin } from "@/lib/access";
import { limitedJson, privateHeaders, requireMutationOrigin, rateLimit } from "@/lib/http-security";
import { requirePrivilegedSession } from "@/lib/privileged-access";

export const dynamic = "force-dynamic";
const landingRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("load"), page: z.enum(contentPageKeys).default("home") }),
  z.object({ action: z.literal("save"), page: z.enum(contentPageKeys).default("home"), draftVersion: z.number().int().min(0), content: landingContentSchema }),
  z.object({ action: z.literal("publish"), page: z.enum(contentPageKeys).default("home"), draftVersion: z.number().int().min(0) }),
  z.object({ action: z.literal("restore"), page: z.enum(contentPageKeys).default("home"), draftVersion: z.number().int().min(0), revision: z.string().uuid() }),
]);
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: privateHeaders });
type LandingRow = { draft_json: string; published_json: string; draft_version: number; published_version: number; updated_at: number; published_at: number };

async function current(page: ContentPageKey) {
  return database().prepare("SELECT draft_json,published_json,draft_version,published_version,updated_at,published_at FROM landing_content WHERE id=?").bind(contentPageId(page)).first<LandingRow>();
}

export async function GET(request: Request) {
  const page = z.enum(contentPageKeys).safeParse(new URL(request.url).searchParams.get("page") ?? "home");
  if (!page.success) return json({ error: "Unknown content page." }, 400);
  try {
    const row = await current(page.data);
    return json({ content: row ? parseLandingContent(row.published_json) : defaultPageContent(page.data) });
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
    await requirePrivilegedSession(user.userId, request);
    await rateLimit(user.userId, "landing-content", 30);
    const db = database();
    const pageId = contentPageId(input.page), defaults = defaultPageContent(input.page);
    const emptyJson = JSON.stringify(defaults);

    if (input.action === "load") {
      const row = await current(input.page);
      const revisions = await db.prepare("SELECT id,actor,created_at FROM landing_content_revisions WHERE COALESCE(json_extract(content_json,'$.page'),'home')=? ORDER BY created_at DESC LIMIT 25").bind(input.page).all<{ id: string; actor: string; created_at: number }>();
      return json({
        draft: row ? parseLandingContent(row.draft_json) : defaults, published: row ? parseLandingContent(row.published_json) : defaults,
        draftVersion: row?.draft_version ?? 0, publishedVersion: row?.published_version ?? 0,
        updatedAt: row?.updated_at ?? 0, publishedAt: row?.published_at ?? 0, revisions: revisions.results,
      });
    }

    if (input.action === "save" && (input.content.page ?? "home") !== input.page) throw new HttpError("Draft belongs to a different page.", 400);
    const row = await current(input.page);
    if (input.action === "save" && row && row.draft_version === input.draftVersion + 1 && row.draft_json === JSON.stringify(input.content)) {
      return json({ ok: true, unchanged: true, draftVersion: row.draft_version, updatedAt: row.updated_at });
    }
    if ((row?.draft_version ?? 0) !== input.draftVersion) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل الحفظ.", 409);
    const now = Date.now();

    if (input.action === "save") {
      const saved = await db.batch([db.prepare(`INSERT INTO landing_content
        (id,draft_json,published_json,draft_version,published_version,updated_by,updated_at,published_at)
        VALUES (?,?,?,1,0,?,?,0)
        ON CONFLICT(id) DO UPDATE SET draft_json=excluded.draft_json,draft_version=landing_content.draft_version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at
        WHERE landing_content.draft_version=?`)
        .bind(pageId, JSON.stringify(input.content), emptyJson, user.userId, now, input.draftVersion),
        audit(user.userId, "landing-draft-save", pageId, "Content page draft saved", true)]);
      if (!saved[0].meta.changes) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل الحفظ.", 409);
      return json({ ok: true, draftVersion: input.draftVersion + 1, updatedAt: now });
    }

    if (input.action === "publish") {
      if (!row) throw new HttpError("احفظ المسودة أولاً.", 409);
      if (row.draft_json === row.published_json) return json({ ok: true, unchanged: true, publishedVersion: row.published_version, publishedAt: row.published_at });
      const revisionId = crypto.randomUUID();
      const results = await db.batch([
        db.prepare("INSERT INTO landing_content_revisions (id,actor,created_at,content_json) SELECT ?,?,?,published_json FROM landing_content WHERE id=? AND draft_version=?").bind(revisionId, user.userId, now, pageId, input.draftVersion),
        db.prepare("UPDATE landing_content SET published_json=draft_json,published_version=published_version+1,draft_version=draft_version+1,published_at=?,updated_at=?,updated_by=? WHERE id=? AND draft_version=? AND draft_json<>published_json").bind(now, now, user.userId, pageId, input.draftVersion),
        audit(user.userId, "landing-publish", pageId, "Content page published", true),
        db.prepare("DELETE FROM landing_content_revisions WHERE id IN (SELECT id FROM landing_content_revisions WHERE COALESCE(json_extract(content_json,'$.page'),'home')=? ORDER BY created_at DESC LIMIT -1 OFFSET 25)").bind(input.page),
      ]);
      if (!results[1].meta.changes) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل النشر.", 409);
      return json({ ok: true, draftVersion: input.draftVersion + 1, publishedVersion: row.published_version + 1, publishedAt: now });
    }

    const revision = await db.prepare("SELECT content_json FROM landing_content_revisions WHERE id=? AND COALESCE(json_extract(content_json,'$.page'),'home')=?").bind(input.revision, input.page).first<{ content_json: string }>();
    if (!revision) throw new HttpError("هذه النسخة غير موجودة أو لم تعد محفوظة.", 404);
    const snapshot = landingContentSchema.safeParse(JSON.parse(revision.content_json));
    if (!snapshot.success || (snapshot.data.page ?? "home") !== input.page) throw new HttpError("This saved revision cannot be restored safely. Export the current draft before recovery.", 409);
    const content = snapshot.data, serialized = JSON.stringify(content), revisionId = crypto.randomUUID();
    const results = await db.batch([
      db.prepare("INSERT INTO landing_content_revisions (id,actor,created_at,content_json) SELECT ?,?,?,published_json FROM landing_content WHERE id=? AND draft_version=?").bind(revisionId, user.userId, now, pageId, input.draftVersion),
      db.prepare("UPDATE landing_content SET draft_json=CASE WHEN draft_json=published_json THEN ? ELSE draft_json END,published_json=?,draft_version=draft_version+1,published_version=published_version+1,updated_by=?,updated_at=?,published_at=? WHERE id=? AND draft_version=?").bind(serialized, serialized, user.userId, now, now, pageId, input.draftVersion),
      audit(user.userId, "landing-restore", input.revision, "Landing page revision restored", true),
      db.prepare("DELETE FROM landing_content_revisions WHERE id IN (SELECT id FROM landing_content_revisions WHERE COALESCE(json_extract(content_json,'$.page'),'home')=? ORDER BY created_at DESC LIMIT -1 OFFSET 25)").bind(input.page),
    ]);
    if (!results[1].meta.changes) throw new HttpError("المسودة تغيّرت في نافذة أخرى. حدّث الصفحة قبل الاستعادة.", 409);
    return json({ ok: true, draftVersion: input.draftVersion + 1, publishedVersion: (row?.published_version ?? 0) + 1, publishedAt: now });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof z.ZodError) return json({ error: "راجع الحقول المدخلة؛ بعض النصوص طويلة أو غير صالحة." }, 400);
    console.error("Landing content operation failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "تعذّر حفظ محتوى الصفحة. بيانات المسودة محفوظة؛ حاول مجدداً." }, 503);
  }
}
