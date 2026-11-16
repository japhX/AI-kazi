// Vercel serverless function. The Gemini key lives only here, as an env variable.
const SYSTEM_PROMPT = `You are a career architect for @i Kazi. Build a rigorous, actionable, 3-phase career roadmap from the user's baseline and goal.
Return valid Markdown with H2/H3 headings, bullet points and checklists. Use this structure:
## Executive summary and goal strategy
## Phase 1: Foundation and skill gap bridge
## Phase 2: Proof and portfolio
## Phase 3: Positioning and execution (networking, job search, interviews or promotion pitch)
## Key projects and tools
## Weekly routine and milestones (fit the user's timeframe)
Be specific, realistic and concise. Do not invent statistics.`;

const clean = (v, max = 1000) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' });

  const b = req.body || {};
  const d = {
    currentRole: clean(b.currentRole, 200),
    skills: clean(b.skills),
    targetRole: clean(b.targetRole, 200),
    helpNeeded: Array.isArray(b.helpNeeded) ? b.helpNeeded.map((x) => clean(x, 60)).slice(0, 8) : [],
    biggestChallenge: clean(b.biggestChallenge),
    timeframe: clean(b.timeframe, 30),
    email: clean(b.email, 200),
  };
  if (!d.currentRole || !d.skills || !d.targetRole || !d.email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const userQuery = `Create a personalized career roadmap:
- Current role/status: ${d.currentRole}
- Skills: ${d.skills}
- Target role/goal: ${d.targetRole}
- Support needed: ${d.helpNeeded.join(', ')}
- Biggest challenge: ${d.biggestChallenge}
- Timeframe: ${d.timeframe}`;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userQuery }] }],
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: data?.error?.message || `Gemini returned ${r.status}` });
    }
    const roadmap = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!roadmap) return res.status(502).json({ error: 'Gemini returned an empty response.' });

    // Optional: store the submission (does not block or fail the response)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      fetch(`${process.env.SUPABASE_URL}/rest/v1/user_submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          current_role: d.currentRole,
          learnings_so_far: d.skills,
          target_role: d.targetRole,
          help_needed: d.helpNeeded.join(', '),
          biggest_challenge: d.biggestChallenge,
          timeframe: d.timeframe,
          email: d.email,
        }),
      }).catch(() => {});
    }

    return res.status(200).json({ roadmap });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected server error.' });
  }
}
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
