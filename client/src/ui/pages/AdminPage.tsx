import {
  Ban,
  BriefcaseBusiness,
  Building2,
  Database,
  Edit3,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Twitter,
  Upload,
  UserPlus,
  Youtube
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, deleteJson, patchJson, postForm, postJson, putJson } from "../../api.js";
import { isStaff, useAuth } from "../AuthContext.js";

type AdminItem = Record<string, any> & { _id: string };
type ContactLinkType =
  | "website"
  | "email"
  | "facebook"
  | "x"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "production"
  | "address"
  | "source"
  | "other";
type ContactLink = { label: string; type: ContactLinkType; url: string };
type ContactFormValues = {
  name: string;
  kind: "entity" | "person";
  organization: string;
  role: string;
  address: string;
  publicContactUrl: string;
  sourceUrl: string;
  imageUrl: string;
  imageSourceUrl: string;
  links: ContactLink[];
  priority: number;
  suggestedMessage: string;
  notes: string;
  status: "draft" | "published" | "archived";
};

const contactLinkOptions: Array<{ type: ContactLinkType; label: string; defaultLabel: string }> = [
  { type: "website", label: "Website", defaultLabel: "Website" },
  { type: "email", label: "Email", defaultLabel: "Email" },
  { type: "facebook", label: "Facebook", defaultLabel: "Facebook" },
  { type: "x", label: "X", defaultLabel: "X" },
  { type: "instagram", label: "Instagram", defaultLabel: "Instagram" },
  { type: "tiktok", label: "TikTok", defaultLabel: "TikTok" },
  { type: "youtube", label: "YouTube", defaultLabel: "YouTube" },
  { type: "linkedin", label: "LinkedIn", defaultLabel: "LinkedIn" },
  { type: "production", label: "Production contact", defaultLabel: "Production contact" },
  { type: "source", label: "Source", defaultLabel: "Source" },
  { type: "address", label: "Address", defaultLabel: "Address" },
  { type: "other", label: "Custom", defaultLabel: "Custom link" }
];

const contactLinkIcons = {
  website: Globe,
  email: Mail,
  facebook: Facebook,
  x: Twitter,
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  linkedin: Linkedin,
  production: BriefcaseBusiness,
  address: MapPin,
  source: ExternalLink,
  other: ExternalLink
};

const contactDefaults: ContactFormValues = {
  name: "",
  kind: "entity",
  organization: "",
  role: "",
  address: "",
  publicContactUrl: "",
  sourceUrl: "",
  imageUrl: "",
  imageSourceUrl: "",
  links: [],
  priority: 3,
  suggestedMessage: "",
  notes: "",
  status: "published"
};

const ContactLinkIcon = ({ type }: { type: ContactLinkType }) => {
  const Icon = contactLinkIcons[type] ?? ExternalLink;
  return (
    <span className={`contact-link-icon ${type}`}>
      <Icon size={15} />
    </span>
  );
};

const resources = [
  {
    key: "updates",
    title: "Updates",
    path: "/api/admin/updates",
    defaults: {
      title: "",
      summary: "",
      bodyMarkdown: "",
      tags: "",
      status: "draft",
      pinned: false,
      allowComments: true
    },
    fields: ["title", "summary", "bodyMarkdown", "tags", "status", "pinned", "allowComments"]
  },
  {
    key: "petitions",
    title: "Petitions",
    path: "/api/admin/petitions",
    defaults: {
      title: "",
      platform: "change.org",
      url: "",
      description: "",
      imageUrl: "",
      status: "active",
      currentCount: 0,
      goalCount: 0,
      latestUpdateTitle: "",
      latestUpdateBody: "",
      latestUpdateAt: "",
      displayOrder: 100,
      manualOverride: false,
      syncDisabledReason: ""
    },
    fields: [
      "title",
      "platform",
      "url",
      "description",
      "imageUrl",
      "status",
      "currentCount",
      "goalCount",
      "latestUpdateTitle",
      "latestUpdateBody",
      "latestUpdateAt",
      "displayOrder",
      "manualOverride",
      "syncDisabledReason"
    ]
  },
  {
    key: "contacts",
    title: "Contact Targets",
    path: "/api/admin/contacts",
    defaults: {
      name: "",
      kind: "entity",
      organization: "",
      role: "",
      address: "",
      publicContactUrl: "",
      sourceUrl: "",
      linksJson: "[]",
      priority: 3,
      suggestedMessage: "",
      notes: "",
      status: "published"
    },
    fields: ["name", "kind", "organization", "role", "address", "publicContactUrl", "sourceUrl", "linksJson", "priority", "suggestedMessage", "notes", "status"]
  },
  {
    key: "topics",
    title: "Community Topics",
    path: "/api/admin/topics",
    defaults: {
      title: "",
      bodyMarkdown: "",
      status: "published",
      pinned: false
    },
    fields: ["title", "bodyMarkdown", "status", "pinned"]
  },
  {
    key: "resources",
    title: "Resource Links",
    path: "/api/admin/resources",
    defaults: {
      title: "",
      type: "website",
      url: "",
      description: "",
      priority: 5,
      tags: "",
      status: "published"
    },
    fields: ["title", "type", "url", "description", "priority", "tags", "status"]
  }
] as const;

const normalizePayload = (values: Record<string, any>) => {
  const payload: Record<string, any> = {};
  Object.entries(values).forEach(([key, value]) => {
    if (key === "tags") payload[key] = String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    else if (key === "linksJson") {
      try {
        payload.links = JSON.parse(String(value || "[]"));
      } catch {
        payload.links = [];
      }
    }
    else if (["currentCount", "goalCount", "priority", "displayOrder"].includes(key)) payload[key] = Number(value);
    else payload[key] = value;
  });
  return payload;
};

const fieldLabel = (name: string) =>
  name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

type ResourceKey = (typeof resources)[number]["key"];

const Field = ({
  name,
  value,
  resourceKey,
  onChange
}: {
  name: string;
  value: any;
  resourceKey: ResourceKey;
  onChange: (name: string, value: any) => void;
}) => {
  if (typeof value === "boolean") {
    return (
      <label className="check-field">
        <input type="checkbox" checked={value} onChange={(event) => onChange(name, event.target.checked)} />
        {fieldLabel(name)}
      </label>
    );
  }

  const isLong = /body|summary|description|message|notes|reason/i.test(name);
  const statusOptions: Record<ResourceKey, string[]> = {
    updates: ["draft", "published", "archived"],
    petitions: ["active", "won", "paused", "archived"],
    contacts: ["draft", "published", "archived"],
    topics: ["draft", "published", "archived"],
    resources: ["draft", "published", "archived"]
  };
  const options: Record<string, string[]> = {
    status: statusOptions[resourceKey],
    type: ["youtube", "website", "podcast", "social", "press", "other"],
    platform: ["change.org"],
    kind: ["entity", "person"]
  };

  return (
    <label className={isLong ? "field-long" : undefined}>
      <span>{fieldLabel(name)}</span>
      {options[name] ? (
        <select value={value ?? ""} onChange={(event) => onChange(name, event.target.value)}>
          {options[name].map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : isLong ? (
        <textarea value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} />
      ) : (
        <input value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} />
      )}
    </label>
  );
};

const CrudPanel = ({ resource }: { resource: (typeof resources)[number] }) => {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [values, setValues] = useState<Record<string, any>>(resource.defaults);
  const [error, setError] = useState("");

  const load = () => api<{ items: AdminItem[] }>(resource.path).then((data) => setItems(data.items));

  useEffect(() => {
    load();
    setEditing(null);
    setValues(resource.defaults);
  }, [resource.key]);

  const change = (name: string, value: any) => setValues((current) => ({ ...current, [name]: value }));

  const startEdit = (item: AdminItem) => {
    setEditing(item);
    setValues({
      ...resource.defaults,
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags ?? "",
      linksJson: Array.isArray(item.links) ? JSON.stringify(item.links, null, 2) : "[]"
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const payload = normalizePayload(values);
      if (editing) await putJson(`${resource.path}/${editing._id}`, payload);
      else await postJson(resource.path, payload);
      setEditing(null);
      setValues(resource.defaults);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    await deleteJson(`${resource.path}/${id}`);
    await load();
  };

  const syncPetition = async (id: string) => {
    await postJson(`/api/admin/petitions/${id}/sync`, {});
    await load();
  };

  return (
    <section className="admin-panel">
      <div className="admin-list admin-resource-list">
        {items.map((item) => (
          <article className="card compact-card admin-resource-row" key={item._id}>
            <div>
              <strong>{item.title || item.name || item.email}</strong>
              <span>{item.status || item.role || item.type}</span>
              {item.summary && <p>{item.summary}</p>}
              {item.description && <p>{item.description}</p>}
            </div>
            <div className="button-row">
              {resource.key === "petitions" && (
                <button className="icon-button" type="button" onClick={() => syncPetition(item._id)} title="Sync petition">
                  <RefreshCw size={16} />
                </button>
              )}
              <button className="icon-button" type="button" onClick={() => startEdit(item)} title="Edit">
                <Edit3 size={16} />
              </button>
              <button className="icon-button danger" type="button" onClick={() => remove(item._id)} title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        {items.length === 0 && <p className="empty">No {resource.title.toLowerCase()} yet.</p>}
      </div>

      <form className="card admin-form admin-resource-form" onSubmit={submit}>
        <div className="section-heading">
          <span>{editing ? "Edit" : "Create"} {resource.title}</span>
          {editing && <button type="button" className="ghost-button" onClick={() => { setEditing(null); setValues(resource.defaults); }}>Cancel</button>}
        </div>
        <div className="admin-form-grid">
          {resource.fields.map((field) => (
            <Field key={field} name={field} value={values[field]} resourceKey={resource.key} onChange={change} />
          ))}
        </div>
        <button type="submit"><Plus size={16} /> {editing ? "Save changes" : "Create"}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
};

const ContactTargetsPanel = () => {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [values, setValues] = useState<ContactFormValues>(contactDefaults);
  const [newLinkType, setNewLinkType] = useState<ContactLinkType>("website");
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const load = () => api<{ items: AdminItem[] }>("/api/admin/contacts").then((data) => setItems(data.items));

  useEffect(() => {
    load();
  }, []);

  const change = <K extends keyof ContactFormValues>(name: K, value: ContactFormValues[K]) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setEditing(null);
    setValues(contactDefaults);
    setNewLinkType("website");
    setError("");
    setUploadError("");
  };

  const scrollToEditor = () => {
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const createNew = () => {
    resetForm();
    scrollToEditor();
  };

  const startEdit = (item: AdminItem) => {
    setEditing(item);
    setValues({
      ...contactDefaults,
      ...item,
      kind: item.kind === "person" ? "person" : "entity",
      links: Array.isArray(item.links) ? item.links : [],
      priority: Number(item.priority ?? 3),
      status: item.status ?? "published"
    });
    scrollToEditor();
  };

  const addContactOption = () => {
    const option = contactLinkOptions.find((entry) => entry.type === newLinkType) ?? contactLinkOptions[0];
    const url = option.type === "email" ? "mailto:" : "";
    change("links", [...values.links, { label: option.defaultLabel, type: option.type, url }]);
  };

  const updateContactOption = (index: number, patch: Partial<ContactLink>) => {
    change(
      "links",
      values.links.map((link, currentIndex) => (currentIndex === index ? { ...link, ...patch } : link))
    );
  };

  const removeContactOption = (index: number) => {
    change("links", values.links.filter((_link, currentIndex) => currentIndex !== index));
  };

  const uploadContactImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await postForm<{ imageUrl: string }>("/api/admin/uploads/contact-image", formData);
      change("imageUrl", result.imageUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const payload = {
      ...values,
      priority: Number(values.priority),
      links: values.links
        .map((link) => ({
          label: link.label.trim(),
          type: link.type,
          url: link.url.trim()
        }))
        .filter((link) => link.label && link.url)
    };

    try {
      if (editing) await putJson(`/api/admin/contacts/${editing._id}`, payload);
      else await postJson("/api/admin/contacts", payload);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    await deleteJson(`/api/admin/contacts/${id}`);
    if (editing?._id === id) resetForm();
    await load();
  };

  return (
    <section className="contact-admin-panel">
      <div className="section-heading contact-admin-heading">
        <span>Contact targets</span>
        <button type="button" className="secondary-button" onClick={createNew}>
          <Plus size={16} /> New contact
        </button>
      </div>
      <div className="admin-list contact-target-list">
        {items.map((item) => (
          <article className="card compact-card contact-target-row" key={item._id}>
            <div className="contact-target-summary">
              {item.imageUrl && (
                <div className={`contact-target-thumb ${item.kind === "entity" ? "logo" : ""}`}>
                  <img src={item.imageUrl} alt="" loading="lazy" />
                </div>
              )}
              <div>
                <div className="card-kicker">
                  {item.kind === "entity" ? <Building2 size={15} /> : <BriefcaseBusiness size={15} />}
                  {item.kind ?? "person"} · priority {item.priority ?? 3}
                </div>
                <strong>{item.name}</strong>
                <span>{item.role || item.organization || item.status}</span>
                {Array.isArray(item.links) && item.links.length > 0 && (
                  <div className="admin-contact-links">
                    {item.links.map((link: ContactLink) => (
                      <a className="admin-contact-link" href={link.url} target="_blank" rel="noreferrer" key={`${item._id}-${link.type}-${link.url}`}>
                        <ContactLinkIcon type={link.type} />
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="button-row contact-target-actions">
              <button className="icon-button" type="button" onClick={() => startEdit(item)} title="Edit">
                <Edit3 size={16} />
              </button>
              <button className="icon-button danger" type="button" onClick={() => remove(item._id)} title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <form className="card admin-form contact-admin-form" ref={formRef} onSubmit={submit}>
        <div className="section-heading">
          <span>{editing ? `Edit ${editing.name}` : "Create Contact Target"}</span>
          {editing && <button type="button" className="ghost-button" onClick={resetForm}>Cancel</button>}
        </div>

        <div className="contact-form-grid">
          <label>
            <span>Name</span>
            <input value={values.name} onChange={(event) => change("name", event.target.value)} required />
          </label>
          <label>
            <span>Type</span>
            <select value={values.kind} onChange={(event) => change("kind", event.target.value as ContactFormValues["kind"])}>
              <option value="entity">Entity</option>
              <option value="person">Person</option>
            </select>
          </label>
          <label>
            <span>Organization</span>
            <input value={values.organization} onChange={(event) => change("organization", event.target.value)} />
          </label>
          <label>
            <span>Role</span>
            <input value={values.role} onChange={(event) => change("role", event.target.value)} />
          </label>
          <label>
            <span>Address</span>
            <input value={values.address} onChange={(event) => change("address", event.target.value)} />
          </label>
          <label>
            <span>Main contact link</span>
            <input value={values.publicContactUrl} onChange={(event) => change("publicContactUrl", event.target.value)} placeholder="https://... or mailto:name@example.com" />
          </label>
          <label>
            <span>Source link</span>
            <input value={values.sourceUrl} onChange={(event) => change("sourceUrl", event.target.value)} placeholder="https://..." />
          </label>
          <div className="contact-image-field">
            <span>Image</span>
            <div className="contact-image-upload">
              {values.imageUrl && (
                <div className="contact-image-current">
                  <div className={`contact-target-thumb ${values.kind === "entity" ? "logo" : ""}`}>
                    <img src={values.imageUrl} alt="" />
                  </div>
                  <div>
                    <strong>Stored file</strong>
                    <span>{values.imageUrl}</span>
                  </div>
                  <button className="icon-button danger" type="button" onClick={() => change("imageUrl", "")} title="Remove image">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <label className="secondary-button contact-image-button">
                <Upload size={16} />
                {uploadingImage ? "Uploading..." : values.imageUrl ? "Replace image" : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadContactImage} disabled={uploadingImage} />
              </label>
              {uploadError && <p className="error">{uploadError}</p>}
            </div>
          </div>
          <label>
            <span>Image source</span>
            <input value={values.imageSourceUrl} onChange={(event) => change("imageSourceUrl", event.target.value)} placeholder="https://..." />
          </label>
          <label>
            <span>Priority</span>
            <input type="number" min={1} max={5} value={values.priority} onChange={(event) => change("priority", Number(event.target.value))} />
          </label>
          <label>
            <span>Status</span>
            <select value={values.status} onChange={(event) => change("status", event.target.value as ContactFormValues["status"])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <label>
          <span>Suggested message</span>
          <textarea value={values.suggestedMessage} onChange={(event) => change("suggestedMessage", event.target.value)} required />
        </label>
        <label>
          <span>Notes</span>
          <textarea value={values.notes} onChange={(event) => change("notes", event.target.value)} />
        </label>

        <div className="contact-options-editor">
          <div className="section-heading">
            <span>Contact options</span>
            <div className="add-contact-option">
              <select value={newLinkType} onChange={(event) => setNewLinkType(event.target.value as ContactLinkType)}>
                {contactLinkOptions.map((option) => (
                  <option key={option.type} value={option.type}>{option.label}</option>
                ))}
              </select>
              <button type="button" className="secondary-button" onClick={addContactOption}>
                <Plus size={16} /> Add contact option
              </button>
            </div>
          </div>

          <div className="contact-option-list">
            {values.links.map((link, index) => (
              <div className="contact-option-row" key={`${link.type}-${index}`}>
                <ContactLinkIcon type={link.type} />
                <select value={link.type} onChange={(event) => updateContactOption(index, { type: event.target.value as ContactLinkType })}>
                  {contactLinkOptions.map((option) => (
                    <option key={option.type} value={option.type}>{option.label}</option>
                  ))}
                </select>
                <input value={link.label} onChange={(event) => updateContactOption(index, { label: event.target.value })} placeholder="Label" />
                <input value={link.url} onChange={(event) => updateContactOption(index, { url: event.target.value })} placeholder="https://... or mailto:name@example.com" />
                <button className="icon-button danger" type="button" onClick={() => removeContactOption(index)} title="Remove contact option">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {values.links.length === 0 && <p className="empty">No contact options yet.</p>}
          </div>
        </div>

        <button type="submit"><Plus size={16} /> {editing ? "Save contact target" : "Create contact target"}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
};

const Dashboard = () => {
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    api<Record<string, any>>("/api/admin/dashboard").then(setData);
  }, []);

  const metrics = useMemo(
    () => [
      ["Active petitions", data?.petitionCount ?? 0],
      ["Failed syncs", data?.failedSyncs ?? 0],
      ["Reported comments", data?.reportedComments ?? 0],
      ["Draft updates", data?.draftUpdates ?? 0],
      ["New messages", data?.newContactMessages ?? 0]
    ],
    [data]
  );

  return (
    <section>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <article className="card metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="card">
        <h3>Recent comments</h3>
        {(data?.recentComments ?? []).map((comment: any) => (
          <p key={comment._id} className="list-line">{comment.body}</p>
        ))}
      </div>
    </section>
  );
};

const ContactMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = () =>
    api<{ messages: AdminItem[] }>("/api/admin/contact-messages").then((data) => {
      setMessages(data.messages);
      setNotes(Object.fromEntries(data.messages.map((message) => [message._id, message.adminNote ?? ""])));
    });

  useEffect(() => {
    load();
  }, []);

  const updateMessage = async (id: string, status: string) => {
    await patchJson(`/api/admin/contact-messages/${id}`, { status, adminNote: notes[id] ?? "" });
    await load();
  };

  const remove = async (id: string) => {
    await deleteJson(`/api/admin/contact-messages/${id}`);
    await load();
  };
  const statusOrder: Record<string, number> = { new: 0, read: 1, replied: 2, archived: 3 };
  const orderedMessages = [...messages].sort(
    (left, right) =>
      (statusOrder[left.status] ?? 9) - (statusOrder[right.status] ?? 9) ||
      new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
  );

  return (
    <section className="admin-list inbox-list">
      {orderedMessages.map((message) => (
        <article className="card inbox-card" key={message._id}>
          <div className="inbox-card-header">
            <div>
              <div className="card-kicker">{message.status} · {message.category}</div>
              <h3>{message.subject}</h3>
              <p>
                {message.name || "Anonymous"}
                {message.email ? ` · ${message.email}` : ""}
                {message.createdAt ? ` · ${new Date(message.createdAt).toLocaleString()}` : ""}
              </p>
            </div>
            <div className="button-row">
              <button type="button" className="small secondary-button" onClick={() => updateMessage(message._id, "read")}>Read</button>
              <button type="button" className="small secondary-button" onClick={() => updateMessage(message._id, "replied")}>Replied</button>
              <button type="button" className="small secondary-button" onClick={() => updateMessage(message._id, "archived")}>Archive</button>
              {(user?.role === "admin" || user?.role === "owner") && (
                <button type="button" className="icon-button danger" onClick={() => remove(message._id)} title="Delete message">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="inbox-message">{message.message}</p>
          <label>
            <span>Admin note</span>
            <textarea value={notes[message._id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [message._id]: event.target.value }))} />
          </label>
        </article>
      ))}
      {messages.length === 0 && <p className="empty">No incoming messages yet.</p>}
    </section>
  );
};

const Moderation = () => {
  const [comments, setComments] = useState<AdminItem[]>([]);
  const load = () => api<{ comments: AdminItem[] }>("/api/admin/moderation/comments").then((data) => setComments(data.comments));

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    await patchJson(`/api/admin/moderation/comments/${id}`, { status });
    await load();
  };

  return (
    <section className="admin-list">
      {comments.map((comment) => (
        <article className="card compact-card" key={comment._id}>
          <div>
            <strong>{comment.authorId?.email ?? "Unknown user"}</strong>
            <span>{comment.status} · {comment.reportCount} reports</span>
            <p>{comment.body}</p>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => setStatus(comment._id, "visible")}><ShieldCheck size={15} /> Visible</button>
            <button type="button" onClick={() => setStatus(comment._id, "hidden")}><Ban size={15} /> Hide</button>
            <button type="button" className="danger" onClick={() => setStatus(comment._id, "deleted")}><Trash2 size={15} /> Delete</button>
          </div>
        </article>
      ))}
    </section>
  );
};

const ContactSuggestions = () => {
  const [suggestions, setSuggestions] = useState<AdminItem[]>([]);
  const load = () => api<{ suggestions: AdminItem[] }>("/api/admin/contact-suggestions").then((data) => setSuggestions(data.suggestions));

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, status: "approved" | "rejected") => {
    await patchJson(`/api/admin/contact-suggestions/${id}`, { status });
    await load();
  };

  return (
    <section className="admin-list">
      {suggestions.map((suggestion) => (
        <article className="card compact-card suggestion-review-card" key={suggestion._id}>
          <div>
            <strong>{suggestion.targetName}</strong>
            <span>{suggestion.status} · {suggestion.suggestedType} · {suggestion.contactTargetId?.name ? `for ${suggestion.contactTargetId.name}` : "new contact"}</span>
            <p><a className="text-link" href={suggestion.suggestedUrl} target="_blank" rel="noreferrer">{suggestion.suggestedLabel}</a></p>
            <p>{suggestion.notes}</p>
            {(suggestion.submitterName || suggestion.submitterEmail) && (
              <p className="empty">Submitted by {suggestion.submitterName || "anonymous"} {suggestion.submitterEmail ? `(${suggestion.submitterEmail})` : ""}</p>
            )}
          </div>
          <div className="button-row">
            <button type="button" onClick={() => review(suggestion._id, "approved")}>Approve</button>
            <button type="button" className="danger" onClick={() => review(suggestion._id, "rejected")}>Reject</button>
          </div>
        </article>
      ))}
      {suggestions.length === 0 && <p className="empty">No contact suggestions yet.</p>}
    </section>
  );
};

const Users = () => {
  const [users, setUsers] = useState<AdminItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testError, setTestError] = useState("");
  const load = () => api<{ users: AdminItem[] }>("/api/admin/users").then((data) => setUsers(data.users));

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError("");
    setInviteLink("");
    try {
      const result = await postJson<{ inviteLink?: string }>("/api/admin/users/invites", { email: inviteEmail, role: "moderator" });
      setInviteLink(result.inviteLink ?? "");
      setInviteEmail("");
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    }
  };

  const sendTest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTestError("");
    setTestMessage("");
    try {
      await postJson("/api/admin/email/test", { email: testEmail });
      setTestMessage(`Test email sent to ${testEmail}`);
      setTestEmail("");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Test email failed");
    }
  };

  const updateUser = async (id: string, patch: Record<string, any>) => {
    await patchJson(`/api/admin/users/${id}`, patch);
    await load();
  };

  return (
    <section className="admin-panel">
      <div className="admin-list admin-resource-list">
        {users.map((user) => (
          <article className="card compact-card admin-resource-row" key={user._id}>
            <div>
              <strong>{user.email}</strong>
              <span>{user.role} · {user.status}</span>
            </div>
            <div className="button-row">
              <select value={user.role} onChange={(event) => updateUser(user._id, { role: event.target.value })}>
                <option value="user">user</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
              <button type="button" onClick={() => updateUser(user._id, { status: user.status === "banned" ? "active" : "banned" })}>
                {user.status === "banned" ? "Unban" : "Ban"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="admin-stack">
        <form className="card admin-form admin-resource-form" onSubmit={submit}>
          <h3><UserPlus size={17} /> Invite moderator</h3>
          <p>Send a one-time link that lets the moderator create their own password.</p>
          <div className="admin-form-grid">
            <label>
              <span>Email</span>
              <input type="email" required placeholder="moderator@example.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
            </label>
          </div>
          <button type="submit">Invite moderator</button>
          {inviteError && <p className="error">{inviteError}</p>}
          {inviteLink && (
            <p className="notice">
              Invite link: <a href={inviteLink}>{inviteLink}</a>
            </p>
          )}
        </form>

        <form className="card admin-form admin-resource-form" onSubmit={sendTest}>
          <h3><Mail size={17} /> Test email</h3>
          <p>Send a small delivery check before relying on moderator invites.</p>
          <div className="admin-form-grid">
            <label>
              <span>Email</span>
              <input type="email" required placeholder="you@example.com" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} />
            </label>
          </div>
          <button type="submit">Send test email</button>
          {testError && <p className="error">{testError}</p>}
          {testMessage && <p className="notice success">{testMessage}</p>}
        </form>
      </div>
    </section>
  );
};

export const AdminPage = () => {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("dashboard");

  if (loading) return <section className="page-section"><p className="empty">Checking access...</p></section>;
  if (!isStaff(user?.role)) {
    return (
      <section className="page-section">
        <div className="page-title">
          <span>Restricted</span>
          <h1>Admin access required</h1>
          <p>Log in with an invited moderator, admin, or owner account.</p>
        </div>
      </section>
    );
  }

  const currentResource = resources.find((resource) => resource.key === tab);

  return (
    <section className="page-section admin-page">
      <div className="page-title">
        <span><Database size={17} /> Admin</span>
        <h1>Admin Tools</h1>
        <p>Publish updates, track petitions, manage contact targets, moderate comments, and invite staff.</p>
      </div>
      <div className="tab-row">
        <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>Dashboard</button>
        {resources.map((resource) => (
          <button key={resource.key} className={tab === resource.key ? "active" : ""} onClick={() => setTab(resource.key)}>
            {resource.title}
          </button>
        ))}
        <button className={tab === "moderation" ? "active" : ""} onClick={() => setTab("moderation")}>Moderation</button>
        <button className={tab === "contact-messages" ? "active" : ""} onClick={() => setTab("contact-messages")}>Inbox</button>
        <button className={tab === "contact-suggestions" ? "active" : ""} onClick={() => setTab("contact-suggestions")}>Contact Suggestions</button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Users</button>
      </div>
      {tab === "dashboard" && <Dashboard />}
      {tab === "contacts" && <ContactTargetsPanel />}
      {currentResource && tab !== "contacts" && <CrudPanel resource={currentResource} />}
      {tab === "moderation" && <Moderation />}
      {tab === "contact-messages" && <ContactMessages />}
      {tab === "contact-suggestions" && <ContactSuggestions />}
      {tab === "users" && <Users />}
    </section>
  );
};
