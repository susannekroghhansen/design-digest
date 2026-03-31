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
  "Service & strategic design methods — new frameworks, case studies, or shifts in practice.",
  "Vibe coding & citizen development — governance thinking, AI-assisted building, or enterprise implications.",
  "Design systems & Figma — updates, new features, or community developments.",
  "What skills service designers need to stay relevant — AI's impact on the profession or emerging role expectations.",
];

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant. Use the web_search tool to find 2–3 relevant items published in the last 7 days on the topic given. Return only what you find — no preamble, no plans, no filler. If nothing relevant was published this week, say so in one sentence.`;

const WRITER_SYSTEM_PROMPT = `You are a design digest editor. You will receive a research summary organised by topic. Format it as a clean HTML email with these rules: one section per topic, each section has a heading and 2–3 items, each item has a headline, 2–3 sentence summary, and one sentence on why it matters for a strategic service designer at a large company. Tone: direct, no hype, intellectually honest. If a topic section contains no findings, write one sentence saying nothing notable happened this week. Output only valid HTML — no markdown, no explanation, no wrapper text outside the HTML.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One focused API call per topic, sequential with a 20s gap between each.
async function runResearch() {
  console.log("Step 1: Researching topics…");
  const topicResults = [];

  for (let i = 0; i < TOPICS.length; i++) {
    const topicName = TOPICS[i].split(" —")[0];
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

  console.log("Waiting 30 seconds before writer call to avoid rate limit…");
  await sleep(30000);

  const htmlDigest = await runWriter(researchSummary);

  console.log("Digest generated. Sending email…");

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: TO_EMAIL,
    subject: `Design digest — ${today}`,
    html: htmlDigest,
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
