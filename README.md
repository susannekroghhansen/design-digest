# Design digest

A weekly AI-curated digest covering service design, vibe coding, design systems, and the evolving skills landscape. Runs automatically every Friday morning via GitHub Actions and lands in your inbox as a formatted HTML email.

## How it works

A Node.js script calls the Anthropic API with the `web_search` tool enabled. Claude researches each of the four topic areas, finds 2–4 items from the past seven days, and synthesises them into a digest. The result is formatted as an HTML email and sent via Resend.

## Setup

### 1. Clone the repo and install dependencies

```bash
git clone <your-repo-url>
cd design-digest
npm install
```

### 2. Add GitHub Secrets

In your GitHub repo go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key — [console.anthropic.com](https://console.anthropic.com) |
| `RESEND_API_KEY` | Your Resend API key — [resend.com/api-keys](https://resend.com/api-keys) |
| `TO_EMAIL` | The email address to deliver the digest to |

### 3. Push to GitHub

Once the secrets are in place, push to `main`. The workflow runs automatically every Friday at 07:00 UTC.

### 4. Test manually

In your repo go to **Actions → Weekly Design Digest → Run workflow** to trigger a run immediately without waiting for Friday.

## Local testing

Create a `.env` file (it is gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
TO_EMAIL=you@example.com
```

Then run:

```bash
node --env-file=.env digest.js
```

> **Note:** `--env-file` requires Node.js 20.6+. If you're on an older version, use `dotenv` or export the variables manually.

## Topic areas

1. **Service & strategic design methods** — new frameworks, case studies, practice shifts
2. **Vibe coding & citizen development** — governance thinking, AI-assisted building, enterprise implications
3. **Design systems & Figma** — updates, new features, community developments
4. **What skills service designers need to stay relevant** — AI's impact on the profession, emerging role expectations

## Sender address

The digest is sent from `onboarding@resend.dev`, Resend's shared sandbox address. This works out of the box with no domain verification. To send from your own domain, verify it in the Resend dashboard and update the `from` field in `digest.js`.
