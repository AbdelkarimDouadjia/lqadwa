"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ShieldCheck, History, Users, Package, Pencil, LockKeyhole, Crown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { AppData, PharmacyApplication } from "@/lib/domain";
import type { Language } from "@/lib/i18n";
import { adminPermissions, type AdminPermission } from "@/lib/admin-permissions";
type Admin = NonNullable<AppData["admin"]>;
const words = {
 owner: ["مالك المنصة", "Propriétaire de la plateforme", "Platform owner", "Bab n tɣerɣert"],
 allAccess: ["كامل صلاحيات الإدارة · إضافة المديرين وتحديد صلاحياتهم محصورة بالمالك", "Tous les accès · Seul le propriétaire gère les administrateurs", "Full administrative access · Only the owner manages admins", "Meṛṛa izerfan · D bab kan i issefraken inedbalen"],
 granted: ["صلاحياتك الممنوحة", "Vos autorisations", "Your granted permissions", "Izerfan-ik"],
 permissions: ["الصلاحيات", "Autorisations", "Permissions", "Izerfan"],
 pharmacies: ["إدارة الصيدليات والمخزون", "Gérer pharmacies et stocks", "Manage pharmacies and inventory", "Sefrek tisaymitin d uxezzen"],
 analytics: ["مؤشرات الخدمة", "Indicateurs du service", "Service totals", "Imḍanen n umeẓlu"],
 email: ["البريد الإلكتروني للمدير الجديد", "E-mail du nouvel administrateur", "New admin’s email", "Imayl n unedbal amaynut"],
 invite: ["إنشاء دعوة مدير", "Créer une invitation", "Create admin invitation", "Rnu taneɛruḍt"],
 inviteHelp: ["الدعوة مرتبطة بهذا البريد، صالحة 7 أيام ولمرة واحدة. يسجل المدير بحسابه الشخصي، ولا تشارك معه كلمة مرور المالك.", "Invitation liée à cet e-mail, valable 7 jours et une seule fois. Chaque administrateur utilise son propre compte.", "Bound to this email, valid for 7 days and one use. Each admin uses their own account; never share the owner password.", "Taneɛruḍt teqqen ɣer yimayl-a, 7 n wussan, yiwet n tikkelt. Yal anedbal yesɛa amiḍan-is."],
 inviteReady: ["رابط الدعوة جاهز؛ شاركه مع صاحب البريد المحدد فقط", "Lien prêt : partagez-le uniquement avec le destinataire", "Invitation ready; share only with the named recipient", "Aseɣwen yehegga; azn-it i umɣer kan"],
 copy: ["نسخ الرابط", "Copier le lien", "Copy link", "Nɣel aseɣwen"],
 copyFailed: ["حدد الرابط وانسخه يدوياً؛ المتصفح لم يسمح بالنسخ التلقائي.", "Sélectionnez et copiez le lien manuellement.", "Select and copy the link manually; automatic copying was blocked.", "Fren aseɣwen, nɣel-it s ufus."],
 editPermissions: ["تعديل الصلاحيات", "Modifier les autorisations", "Edit permissions", "Beddel izerfan"],
 permissionHelp: ["اختر صلاحية واحدة على الأقل. تُطبّق التغييرات على الطلب التالي؛ لا يستطيع المدير تعديل صلاحياته أو صلاحيات المالك.", "Choisissez au moins une autorisation. Les changements s’appliquent à la prochaine requête.", "Choose at least one permission. Changes apply on the next request; admins cannot change their own or the owner’s access.", "Fren ma drus yiwen n uzref. Ibeddilen ad ddun deg usuter i d-iteddun."],
 admin: ["مدير", "Administrateur", "Admin", "Anedbal"],
 title: ["مركز التحكم الخاص", "Centre de contrôle privé", "Private control center", "Amas n usenqed uslig"],
 privacy: ["تُسجّل العمليات الحساسة. صور الوصفات والنص الكامل والموقع الشخصي ليست متاحة للإدارة.", "Les actions sensibles sont journalisées. Les ordonnances et positions personnelles ne sont pas accessibles ici.", "Sensitive actions are audited. Prescription images, full text and personal live locations are not available here.", "Tigawin ttwaseklasent. Tiwlafin n tmedyazin d yimukan usligen ur d-ttbanen ara dagi."],
 accounts: ["الحسابات", "Comptes", "Accounts", "Imiḍanen"], team: ["فريق الإدارة", "Équipe admin", "Admin team", "Agraw n tedbelt"],
 audit: ["سجل العمليات", "Journal des actions", "Audit trail", "Aɣmis n tigawin"], inventory: ["مخزون الصيدليات", "Inventaire des pharmacies", "Pharmacy inventory", "Axezzen n tsaymitin"],
 find: ["تصفية بالاسم أو المرجع", "Filtrer par nom ou référence", "Filter by name or reference", "Sizdeg s yisem"],
 active: ["نشط", "Actif", "Active", "Yermed"], suspended: ["معلّق", "Suspendu", "Suspended", "Yettwaḥbes"],
 suspend: ["تعليق الحساب", "Suspendre le compte", "Suspend account", "Ḥbes amiḍan"], restore: ["إعادة التفعيل", "Réactiver", "Reactivate", "Rmed"],
 revoke: ["سحب صلاحية الإدارة", "Retirer l’accès admin", "Revoke admin access", "Kkes anekcum n tedbelt"],
 revokeInvites: ["إبطال الدعوات غير المستخدمة", "Révoquer les invitations en attente", "Revoke pending invitations", "Kkes tineɛruḍin ur nettwaseqdec"],
 confirm: ["تأكيد العملية", "Confirmer l’action", "Confirm action", "Sentem tigawt"], cancel: ["إلغاء", "Annuler", "Cancel", "Sefsex"],
 reason: ["سبب العملية (إلزامي)", "Motif obligatoire", "Reason (required)", "Taɣẓint ilaq"],
 warning: ["قد يفقد الحساب وصوله فوراً. التعليق يوقف الصيدلية أيضاً، ولا تعيد إعادة تفعيل الحساب اعتمادها تلقائياً.", "L’accès peut être retiré immédiatement. La réactivation du compte ne réapprouve pas automatiquement sa pharmacie.", "Access may end immediately. Account reactivation does not automatically reapprove its pharmacy.", "Anекcum yezmer ad yeḥbes. Ales n urmad n umiḍan ur yesermad ara tasaymit."],
 edit: ["تعديل بيانات الصيدلية", "Modifier la pharmacie", "Edit pharmacy", "Beddel tasaymit"], name: ["الاسم", "Nom", "Name", "Isem"], address: ["العنوان", "Adresse", "Address", "Tansa"], phone: ["الهاتف", "Téléphone", "Phone", "Asawal"], hours: ["ساعات العمل", "Horaires", "Opening hours", "Isragen"], save: ["حفظ", "Enregistrer", "Save", "Sekles"],
 empty: ["لا توجد عناصر", "Aucun élément", "No records", "Ulac iferdisen"], bounded: ["عرض آخر 200 حساب/عنصر مخزون و100 عملية إدارية.", "200 comptes/articles et 100 actions récents maximum.", "Showing up to 200 accounts/stock items and 100 recent actions.", "Ar 200 imiḍanen/iferdisen d 100 tigawin."],
} as const;
export function AdminControls({ admin, language, busy, mutate }: { admin: Admin; language: Language; busy: boolean; mutate: (body: Record<string, unknown>, message?: string) => Promise<unknown> }) {
 const i = language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3, t = (key: keyof typeof words) => words[key][i];
 const can = (permission: AdminPermission) => admin.access.permissions.includes(permission);
 const tabs = ([ ["accounts", Users], ["team", ShieldCheck], ["inventory", Package], ["audit", History] ] as const).filter(([key]) => key === "team" ? admin.access.isOwner : can(key === "inventory" ? "pharmacies" : key));
 const [tab, setTab] = useState<"accounts" | "team" | "inventory" | "audit">(admin.access.isOwner ? "team" : tabs[0]?.[0] || "accounts"), [query, setQuery] = useState("");
 const [pending, setPending] = useState<Record<string, unknown> | null>(null), [reason, setReason] = useState("");
 const [editing, setEditing] = useState<PharmacyApplication | null>(null);
 const [permissionMember, setPermissionMember] = useState<Admin["members"][number] | null>(null), [grants, setGrants] = useState<AdminPermission[]>([]);
 const [inviteGrants, setInviteGrants] = useState<AdminPermission[]>(["pharmacies"]), [inviteLink, setInviteLink] = useState(""), [copied, setCopied] = useState(false), [copyFailed, setCopyFailed] = useState(false), [inviteRecipient, setInviteRecipient] = useState("");
 const inviteForm = useForm({defaultValues:{email:""}});
 useEffect(() => { if(!tabs.some(([key]) => key === tab)) setTab(tabs[0]?.[0] || "accounts"); }, [admin.access.permissions, admin.access.isOwner, tab]);
 const matches = (v: string) => v.toLocaleLowerCase().includes(query.toLocaleLowerCase());
 const permissionFields = (value: AdminPermission[], change: (v: AdminPermission[]) => void, prefix: string) => <fieldset className="permission-options"><legend>{t("permissions")}</legend>{adminPermissions.map(p => <label key={p} htmlFor={`${prefix}-${p}`}><Checkbox id={`${prefix}-${p}`} checked={value.includes(p)} disabled={busy} onCheckedChange={checked => change(checked === true ? [...value,p] : value.filter(v => v !== p))} /><span>{t(p)}</span></label>)}</fieldset>;
 if (!tabs.length && !can("pharmacies")) return null;
 return <section className="panel operations-panel"><div className="operations-title"><LockKeyhole /><h2>{t("title")}</h2></div><p className="muted">{t("privacy")}</p><div className="operations-tabs">{tabs.map(([key, Icon]) => <Button key={key} variant={key === tab ? "default" : "outline"} onClick={() => {setTab(key); setQuery("");}} aria-pressed={tab === key}><Icon />{t(key)}</Button>)}</div>{tabs.length > 0 && <><Input value={query} onChange={e => setQuery(e.target.value)} aria-label={t("find")} placeholder={t("find")} /><p className="muted">{t("bounded")}</p></>}
 {tab === "accounts" && can("accounts") && <div className="operations-list">{admin.accounts.filter(a => matches(`${a.name} ${a.id}`)).map(a => <article key={a.id}><div><strong>{a.name}</strong><small dir="ltr">{a.id}</small><span>{a.suspended ? t("suspended") : t("active")}</span>{a.reason && <p>{a.reason}</p>}</div>{!a.protected && <Button variant="outline" disabled={busy} onClick={() => {setPending({ action: "admin-account", owner: a.id, suspended: !a.suspended }); setReason("");}}>{a.suspended ? t("restore") : t("suspend")}</Button>}</article>)}{!admin.accounts.some(a => matches(`${a.name} ${a.id}`)) && <p>{t("empty")}</p>}</div>}
 {tab === "team" && admin.access.isOwner && <>
   <div className="operations-list">{admin.owners.map(a => <article className="owner-team-row" key={a.id}><Crown aria-hidden="true" /><div><strong>{a.name || t("owner")}</strong><span>{t("owner")}</span><small>{t("allAccess")}</small></div></article>)}{admin.members.filter(a => matches(`${a.name} ${a.owner} ${a.email}`)).map(a => <article key={a.owner}><div><strong>{a.name || a.email || a.owner}</strong><small dir="ltr">{a.email}</small><p>{a.permissions.map(p => t(p)).join(" · ")}</p><small>{new Date(a.created).toLocaleDateString()}</small></div><div className="row"><Button variant="outline" disabled={busy} onClick={() => {setPermissionMember(a);setGrants([...a.permissions]);}}><Pencil />{t("editPermissions")}</Button><Button variant="outline" disabled={busy} onClick={() => setPending({action:"admin-revoke",owner:a.owner})}>{t("revoke")}</Button></div></article>)}</div>
   <Form {...inviteForm}><form className="admin-invite-form" onSubmit={inviteForm.handleSubmit(async values => {setInviteLink("");setCopied(false);setCopyFailed(false);const result = await mutate({action:"admin-invite-create",email:values.email,permissions:inviteGrants}) as (AppData & {invite?:string}) | null;if(result?.invite){setInviteLink(`${window.location.origin}/?admin_invite=${result.invite}#admin`);setInviteRecipient(values.email.trim().toLowerCase());}})}>
     <h3>{t("invite")}</h3><p className="muted">{t("inviteHelp")}</p>
     <FormField control={inviteForm.control} name="email" rules={{required:t("email"),pattern:{value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,message:t("email")},maxLength:254}} render={({field}) => <FormItem><FormLabel>{t("email")}</FormLabel><FormControl><Input {...field} type="email" dir="ltr" autoComplete="off" disabled={busy} /></FormControl><FormMessage /></FormItem>} />
     {permissionFields(inviteGrants,setInviteGrants,"invite")}
     <Button type="submit" disabled={busy || inviteForm.formState.isSubmitting || !inviteGrants.length}><ShieldCheck />{t("invite")}</Button>
   </form></Form>
   {inviteLink && <div className="invite-link" role="status"><span>{t("inviteReady")}</span><strong dir="ltr">{inviteRecipient}</strong><Input dir="ltr" readOnly value={inviteLink} onFocus={e=>e.target.select()} aria-label={t("inviteReady")} /><Button variant="outline" onClick={async () => {try{await navigator.clipboard.writeText(inviteLink);setCopied(true);setCopyFailed(false);}catch{setCopied(false);setCopyFailed(true);}}}><Copy />{copied ? "✓ " : ""}{t("copy")}</Button>{copyFailed && <p>{t("copyFailed")}</p>}</div>}
   <Button variant="outline" disabled={busy} onClick={() => setPending({action:"admin-invites-revoke"})}>{t("revokeInvites")}</Button>
 </>}
 {tab === "inventory" && can("pharmacies") && <div className="operations-list">{admin.inventory.filter(s => matches(`${s.name} ${s.pharmacyName}`)).map(s => <article key={s.id}><div><strong>{s.name}</strong><small>{s.pharmacyName}</small><small>{new Date(s.updated).toLocaleString()}</small></div><span>{s.quantity}</span></article>)}{!admin.inventory.some(s => matches(`${s.name} ${s.pharmacyName}`)) && <p>{t("empty")}</p>}</div>}
 {tab === "audit" && can("audit") && <div className="operations-list">{admin.activity.filter(a => matches(`${a.actor} ${a.action} ${a.detail}`)).map(a => <article key={a.id}><div><strong>{a.action}</strong><p>{a.detail}</p><small>{a.actor} · {new Date(a.created).toLocaleString()}</small></div></article>)}{!admin.activity.some(a => matches(`${a.actor} ${a.action} ${a.detail}`)) && <p>{t("empty")}</p>}</div>}
 {can("pharmacies") && <details className="operations-edit"><summary>{t("edit")}</summary><div className="operations-list">{admin.applications.map(a => <article key={a.id}><strong>{a.name}</strong><Button variant="outline" disabled={busy} onClick={() => setEditing(a)}><Pencil />{t("edit")}</Button></article>)}</div></details>}
 <Dialog open={admin.access.isOwner && !!permissionMember} onOpenChange={v => !v && setPermissionMember(null)}><DialogContent className="app-dialog" dir={language === "ar" ? "rtl" : "ltr"}><DialogTitle>{t("editPermissions")}</DialogTitle><DialogDescription>{t("permissionHelp")}</DialogDescription><strong>{permissionMember?.name || permissionMember?.email}</strong>{permissionFields(grants,setGrants,"edit-permission")}<div className="row"><Button variant="outline" onClick={() => setPermissionMember(null)}>{t("cancel")}</Button><Button disabled={busy || !grants.length} onClick={async () => {if(permissionMember && await mutate({action:"admin-permissions",owner:permissionMember.owner,permissions:grants},t("save")))setPermissionMember(null);}}>{t("save")}</Button></div></DialogContent></Dialog>
 <Dialog open={!!pending && (pending.action === "admin-account" ? can("accounts") : admin.access.isOwner)} onOpenChange={v => !v && setPending(null)}><DialogContent className="app-dialog"><DialogTitle>{t("confirm")}</DialogTitle><DialogDescription>{t("warning")}</DialogDescription>{pending?.action === "admin-account" && <><label htmlFor="admin-reason">{t("reason")}</label><Input id="admin-reason" maxLength={200} value={reason} onChange={e => setReason(e.target.value)} /></>}<div className="row"><Button variant="outline" onClick={() => setPending(null)}>{t("cancel")}</Button><Button disabled={busy || (pending?.action === "admin-account" && reason.trim().length < 3)} onClick={async () => {if (pending && await mutate({...pending, ...(pending.action === "admin-account" ? {reason} : {})}, t("confirm"))) setPending(null);}}>{t("confirm")}</Button></div></DialogContent></Dialog>
 <Dialog open={can("pharmacies") && !!editing} onOpenChange={v => !v && setEditing(null)}><DialogContent className="app-dialog"><DialogTitle>{t("edit")}</DialogTitle><DialogDescription>{t("privacy")}</DialogDescription>{editing && <form onSubmit={async e => {e.preventDefault(); if(await mutate({action:"admin-pharmacy-edit",pharmacy:editing.id,name:editing.name,address:editing.address,phone:editing.phone,hours:editing.hours},t("save"))) setEditing(null);}}>{(["name","address","phone","hours"] as const).map(key => <label key={key}>{t(key)}<Input required value={editing[key]} maxLength={key === "address" ? 160 : 100} onChange={e=>setEditing({...editing,[key]:e.target.value})} /></label>)}<Button disabled={busy} type="submit">{t("save")}</Button></form>}</DialogContent></Dialog>
 </section>;
}

export function AdminIdentity({admin,language}:{admin:Admin;language:Language}) {
 const i = language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3;
 return <section className="admin-identity panel"><span className="admin-owner-icon">{admin.access.isOwner ? <Crown aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}</span><div><strong>{words[admin.access.isOwner ? "owner" : "admin"][i]}</strong><p>{admin.access.isOwner ? words.allAccess[i] : `${words.granted[i]}: ${admin.access.permissions.map(p => words[p][i]).join(" · ")}`}</p></div></section>;
}
