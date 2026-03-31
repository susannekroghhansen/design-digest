import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = process.env.TO_EMAIL;

const today = new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TOPICS = [
  "Search for recent developments in service design and strategic design methods. Try these angles separately: 'service design 2026', 'strategic design case study 2026', 'design thinking new framework 2026', 'service design practice shift'. Report everything relevant found in the last 2–3 weeks. If one angle returns nothing useful, try the next.",
  "Search for recent news about vibe coding, citizen development, and AI-assisted building in enterprise contexts. Try these angles: 'vibe coding 2026', 'citizen development AI enterprise', 'low code AI governance 2026', 'non-developer building tools AI'. Report everything relevant found in the last 2–3 weeks. If one angle returns nothing, try the next.",
  "Search for recent Figma news, design token developments, and component architecture discussions. Try these angles: 'Figma new feature 2026', 'design tokens standard 2026', 'Figma community release', 'component architecture design system 2026', 'design system practitioner writing 2026'. Look across the last 2–3 weeks, not just the last 7 days. Include notable community discussions and practitioner writing, not just product announcements. Find 2–3 distinct items from different sources before stopping.",
  "Search for recent writing about the future of service design as a profession and what skills designers need as AI develops. Try these angles: 'service designer skills AI 2026', 'UX designer job future AI', 'design profession AI impact 2026', 'what skills do designers need 2026'. Report everything relevant found in the last 2–3 weeks. If one angle returns nothing, try the next.",
];

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant. Use the web_search tool to find 2–3 relevant items published in the last 7 days on the topic given. Return only what you find — no preamble, no plans, no filler. If nothing relevant was published this week, say so in one sentence.

Do not stop after finding one article. Search multiple angles and find 2–3 distinct items per topic. Each item must be from a different source. Only stop when you have at least 2 items or have exhausted all search angles.

After each item, you must include the source URL on its own line in exactly this format: Source: https://... — this is required, do not omit it.`;

const WRITER_SYSTEM_PROMPT = `You are a design digest editor. You will receive a research summary organised by topic. Output only valid HTML — no markdown, no explanation, no wrapper text outside the HTML.

EDITORIAL SECTION — "This week in context":
At the top of the digest, before the topic sections, write a 250–300 word section headed "This week in context". This is not a summary of what follows — it is an editorial take on what the week's signals mean together, written for a strategic service designer working inside a large product organisation.

Write in this voice: observational, not declarative. Notice something across the topics and share it — do not hand down conclusions. Warm and direct, always substantive. One quiet provocation that lands after the reader has already nodded along. One moment of lightness — a parenthetical aside, an absurdly specific detail, or a rueful flat statement — that arrives and leaves without announcing itself.

Do not open with a thesis. Do not use any of these phrases: "Here's the truth", "Here's the provocation", "I've noticed something", "The moment X happens everything changes", "In my experience", "Somewhere along the way". Do not end with a tidy conclusion — end on an open thought or an unresolved tension.

The best version of this section makes two things that looked unrelated feel like the same story told from different angles.

TOPIC SECTIONS:
One section per topic, each with 2–3 items. Each item has a headline, 2–3 sentence summary, and one sentence on why it matters for a strategic service designer at a large company. Tone: direct, no hype, intellectually honest. If a topic section contains no findings, write one sentence saying nothing notable happened this week.

HTML DESIGN — use inline styles throughout (required for email clients):

Outer wrapper: max-width 600px, margin 0 auto, background #ffffff, border 1px solid #ED93B1, border-radius 8px, font-family sans-serif, overflow hidden.

Header block: background #993556, padding 28px 36px.
- Small label: display block, font-size 11px, font-weight 600, letter-spacing 0.08em, text-transform uppercase, color #ED93B1, margin-bottom 10px. Text: "Unruled Play — design digest".
- Title: font-size 22px, font-weight 700, color #ffffff, margin 0 0 8px 0, line-height 1.3. Text: "This week in digital product design".
- Date: font-size 12px, color #F4C0D1, margin 0. Insert the actual date.

"This week in context" block: background #FBEAF0, padding 28px 36px, border-bottom 1px solid #F4C0D1.
- Label: display block, font-size 11px, font-weight 600, letter-spacing 0.08em, text-transform uppercase, color #993556, margin-bottom 14px. Text: "This week in context".
- Body text: font-size 15px, line-height 1.8, color #2C2C2A, font-family Georgia serif, margin 0.

Topic sections: padding 24px 36px, each separated by border-top 0.5px solid #F4C0D1.
- Topic label: display block, font-size 11px, font-weight 600, letter-spacing 0.08em, text-transform uppercase, color #993556, margin-bottom 16px.
- Each item: border-left 2px solid #ED93B1, padding-left 14px, margin-bottom 18px.
  - Headline: font-size 15px, font-weight 700, color #1A1A18, margin 0 0 6px 0, font-family sans-serif.
  - Body: font-size 14px, color #444441, line-height 1.7, margin 0 0 5px 0.
  - "Why it matters" line: font-size 13px, color #72243E, font-style italic, margin 0 0 5px 0.
  - Source link: render as <a href="[url]" style="font-size: 12px; color: #993556; text-decoration: none; border-bottom: 1px solid #ED93B1;">Read more →</a>. Only include if a source URL is present in the research — omit entirely if missing or unclear. Do not guess URLs.
  - If nothing notable: output only the "nothing notable this week" sentence in font-size 14px, color #888780, font-style italic. No link, no placeholder, nothing else.

Footer: background #FBEAF0, padding 20px 36px, border-top 1px solid #F4C0D1.
- Text: font-size 11px, color #993556. Content: "Unruled Play — design digest".`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One focused API call per topic, sequential with a 20s gap between each.
async function runResearch() {
  console.log("Step 1: Researching topics…");
  const topicResults = [];

  const TOPIC_NAMES = [
    "Service & strategic design methods",
    "Vibe coding & citizen development",
    "Design systems & Figma",
    "Skills for service designers",
  ];

  for (let i = 0; i < TOPICS.length; i++) {
    const topicName = TOPIC_NAMES[i];
    console.log(`Searching topic ${i + 1}/4: ${topicName}…`);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: RESEARCH_SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Search for recent developments in: ${TOPICS[i]}`,
        },
      ],
    });

    const textBlock = response.content.findLast((b) => b.type === "text");
    const result = textBlock ? textBlock.text : "No findings returned.";
    topicResults.push(`## Topic ${i + 1}: ${topicName}\n\n${result}`);

    console.log(`Topic ${i + 1} complete.`);

    if (i < TOPICS.length - 1) {
      console.log("Waiting 65 seconds before next topic search…");
      await sleep(65000);
    }
  }

  return topicResults.join("\n\n---\n\n");
}

// Single non-agentic call with no tools — full token budget for writing.
async function runWriter(researchSummary) {
  console.log("Step 2: Writing HTML digest…");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: WRITER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the research summary for the week ending ${today}.\n\n${researchSummary}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Writer call returned no text.");
  return textBlock.text;
}

async function runDigest() {
  console.log(`Running digest for ${today}…`);

  const researchSummary = await runResearch();

  console.log(`Research summary character count: ${researchSummary.length}`);

  // Debug: print topic 2 and 3 raw output to verify Source: lines are present
  const topicSections = researchSummary.split("\n\n---\n\n");
  console.log("=== Topic 2 raw output (Vibe coding) ===\n", topicSections[1] ?? "(missing)");
  console.log("=== Topic 3 raw output (Design systems & Figma) ===\n", topicSections[2] ?? "(missing)");

  console.log("Waiting 30 seconds before writer call to avoid rate limit…");
  await sleep(30000);

  const htmlDigest = await runWriter(researchSummary);

  console.log("Digest generated. Sending email…");

  const plainText = htmlDigest.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, "\n").trim();

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: TO_EMAIL,
    subject: `Design digest — ${today}`,
    html: htmlDigest,
    text: plainText,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`Email sent. ID: ${data.id}`);
}

runDigest().catch((err) => {
  console.error(err);
  process.exit(1);
});
