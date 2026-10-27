import { database } from "@/db";
import { contentPageId, defaultPageContent } from "./content-pages";
import { landingContentSchema, type ContentPageKey } from "./landing-content";

export async function publishedPageContent(page: ContentPageKey) {
  try {
    const row = await database().prepare("SELECT published_json FROM landing_content WHERE id=?").bind(contentPageId(page)).first<{ published_json: string }>();
    if (!row) return defaultPageContent(page);
    const result = landingContentSchema.safeParse(JSON.parse(row.published_json));
    if (result.success && (result.data.page ?? "home") === page) return result.data;
  } catch { console.error("Published content unavailable", page); }
  return defaultPageContent(page);
}
