import { connectDatabase } from "./db.js";
import { CommunityTopic } from "./models/CommunityTopic.js";
import { ContactTarget } from "./models/ContactTarget.js";
import { ResourceLink } from "./models/ResourceLink.js";
import { UpdatePost } from "./models/UpdatePost.js";
import { ensureHistoricalPetitions, ensurePrimaryPetition } from "./services/primaryPetition.js";

await connectDatabase();

await UpdatePost.updateOne(
  { slug: "where-things-stand" },
  {
    $setOnInsert: {
      title: "Where things stand",
      slug: "where-things-stand",
      summary: "A starting point for petitions, contacts, and useful links.",
      bodyMarkdown:
        "# Welcome\n\nThis site keeps the practical stuff in one place: the main petition, older petitions, public contact links, updates, and fan discussion.\n\n- Sign the current petition\n- Use public or work contact channels\n- Share sources when you find them",
      tags: ["campaign", "launch"],
      status: "published",
      pinned: true,
      allowComments: true,
      publishedAt: new Date()
    }
  },
  { upsert: true }
);
await UpdatePost.deleteOne({ slug: "the-signal-is-open", title: "The signal is open" });

await ensurePrimaryPetition();
await ensureHistoricalPetitions();

await ContactTarget.updateOne(
  { name: "Amazon MGM Studios" },
  {
    $setOnInsert: {
      name: "Amazon MGM Studios",
      kind: "entity",
      organization: "Amazon MGM Studios",
      role: "Studio and production company",
      address: "MGM Studios, 245 N Beverly Dr., Beverly Hills, CA 90210",
      publicContactUrl: "https://www.mgm.com/",
      sourceUrl: "https://www.mgm.com/",
      imageUrl: "/uploads/contacts/amazon-mgm-studios-logo.png",
      imageSourceUrl: "https://en.wikipedia.org/wiki/Amazon_MGM_Studios",
      links: [
        { label: "MGM website", type: "website", url: "https://www.mgm.com/" },
        { label: "Facebook", type: "facebook", url: "https://www.facebook.com/AmazonMGMStudios/" },
        { label: "X", type: "x", url: "https://x.com/amazonmgmstudio" },
        { label: "Instagram", type: "instagram", url: "https://www.instagram.com/amazonmgmstudios/" },
        { label: "TikTok", type: "tiktok", url: "https://www.tiktok.com/@amazonmgmstudios" },
        { label: "YouTube", type: "youtube", url: "https://www.youtube.com/@AmazonMGMStudios" },
        { label: "Production contact", type: "production", url: "https://www.productionlist.com/production-contact/amazon-mgm-studios" },
        { label: "LinkedIn", type: "linkedin", url: "https://www.linkedin.com/company/primevideoamazonstudios/" }
      ],
      priority: 1,
      suggestedMessage: "Please reconsider the decision on Stargate. There is still a large audience ready for a new series.",
      notes: "Official site, social profiles, production contact page, and public company profile.",
      status: "published"
    }
  },
  { upsert: true }
);

await ContactTarget.updateOne(
  { name: "Amazon" },
  {
    $setOnInsert: {
      name: "Amazon",
      kind: "entity",
      organization: "Amazon",
      role: "Parent company",
      publicContactUrl: "https://www.amazon.com/",
      sourceUrl: "https://www.amazon.com/",
      imageUrl: "/uploads/contacts/amazon-logo.png",
      imageSourceUrl: "https://en.wikipedia.org/wiki/Amazon_(company)",
      links: [
        { label: "Amazon website", type: "website", url: "https://www.amazon.com/" },
        { label: "Amazon Studios contact", type: "email", url: "mailto:amazonstudioscontactus@amazon.com" },
        { label: "Amazon PR", type: "email", url: "mailto:amazon-pr@amazon.com" },
        { label: "Amazon Studios support", type: "email", url: "mailto:support@amazonstudios.com" }
      ],
      priority: 1,
      suggestedMessage: "Please reconsider the decision on Stargate. Fans want Amazon to give the franchise a real chance.",
      notes: "Parent company contact channels and public company site.",
      status: "published"
    }
  },
  { upsert: true }
);

await ContactTarget.updateOne(
  { name: "Peter Friedlander" },
  {
    $setOnInsert: {
      name: "Peter Friedlander",
      kind: "person",
      organization: "Amazon MGM Studios",
      role: "Head of Global Television",
      publicContactUrl: "https://www.linkedin.com/in/pfriedlander/",
      sourceUrl: "https://www.linkedin.com/in/pfriedlander/",
      imageUrl: "/uploads/contacts/peter-friedlander.jpg",
      imageSourceUrl: "https://www.thewrap.com/amazon-mgm-studios-scripted-team-restructuring/",
      links: [{ label: "LinkedIn", type: "linkedin", url: "https://www.linkedin.com/in/pfriedlander/" }],
      priority: 2,
      suggestedMessage: "Please look at the current petition and support a new Stargate series.",
      notes: "Listed from public LinkedIn profile and industry coverage identifying him as Head of Global Television at Amazon MGM Studios.",
      status: "published"
    }
  },
  { upsert: true }
);

await ContactTarget.updateOne(
  { name: "Blair Fetter" },
  {
    $setOnInsert: {
      name: "Blair Fetter",
      kind: "person",
      organization: "Prime Video & Amazon MGM Studios",
      role: "Head, Worldbuilding Series",
      publicContactUrl: "mailto:blair.fetter@amazonstudios.com",
      sourceUrl: "https://www.linkedin.com/in/blair-fetter-ba7aa250/",
      imageUrl: "/uploads/contacts/blair-fetter.jpg",
      imageSourceUrl: "https://www.thewrap.com/industry-news/business/amazon-mgm-studios-scripted-team-restructuring/",
      links: [
        { label: "LinkedIn", type: "linkedin", url: "https://www.linkedin.com/in/blair-fetter-ba7aa250/" },
        { label: "Amazon Studios email", type: "email", url: "mailto:blair.fetter@amazonstudios.com" },
        { label: "Amazon Studios alias", type: "email", url: "mailto:blairf@amazonstudios.com" },
        { label: "Amazon email", type: "email", url: "mailto:bfetter@amazon.com" },
        { label: "Amazon Jobs email", type: "email", url: "mailto:bfetter@amazon.jobs" },
        { label: "Amazon Jobs alias", type: "email", url: "mailto:blair.fetter@amazon.jobs" }
      ],
      priority: 2,
      suggestedMessage: "Please reconsider the Stargate decision. Fans want the franchise to continue.",
      notes: "Listed from public LinkedIn profile and industry coverage identifying him with Prime Video/Amazon MGM Studios Worldbuilding & Genre Series.",
      status: "published"
    }
  },
  { upsert: true }
);

await ContactTarget.updateOne(
  { name: "Mike Hopkins" },
  {
    $setOnInsert: {
      name: "Mike Hopkins",
      kind: "person",
      organization: "Prime Video & Amazon MGM Studios",
      role: "Head of Prime Video & Amazon MGM Studios",
      publicContactUrl: "mailto:mike.hopkins@amazonstudios.com",
      sourceUrl: "https://www.linkedin.com/in/mike-hopkins-543a214/",
      imageUrl: "/uploads/contacts/mike-hopkins.jpg",
      imageSourceUrl: "https://observer.com/2024/01/amazon-prime-video-mgm-studio-layoff/",
      links: [
        { label: "LinkedIn", type: "linkedin", url: "https://www.linkedin.com/in/mike-hopkins-543a214/" },
        { label: "Amazon Studios email", type: "email", url: "mailto:mike.hopkins@amazonstudios.com" }
      ],
      priority: 2,
      suggestedMessage: "Please look at the current petition and support a new Stargate series.",
      notes: "Listed from public LinkedIn profile and public references identifying him as Head of Prime Video & Amazon MGM Studios.",
      status: "published"
    }
  },
  { upsert: true }
);

await CommunityTopic.updateOne(
  { slug: "where-should-fans-focus-first" },
  {
    $setOnInsert: {
      title: "Where should fans focus first?",
      slug: "where-should-fans-focus-first",
      bodyMarkdown: "Share useful links, contact sources, and practical ideas for getting attention on the current petition.",
      status: "published",
      pinned: true
    }
  },
  { upsert: true }
);

await ResourceLink.updateOne(
  { title: "GateWorld" },
  {
    $setOnInsert: {
      title: "GateWorld",
      type: "website",
      url: "https://www.gateworld.net/",
      description: "Long-running Stargate news and fan resource.",
      priority: 1,
      tags: ["news", "reference"],
      status: "published"
    }
  },
  { upsert: true }
);

console.log("Seed data ready.");
process.exit(0);
