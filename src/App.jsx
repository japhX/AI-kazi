import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const HELP = [
  ['Tools & hard skills', 'Technical skills and frameworks to learn'],
  ['Proof & projects', 'Portfolio and real-world evidence'],
  ['Connections', 'Mentors, referrals and network'],
  ['Job search', 'Resume, LinkedIn and interviews'],
];
const TIMEFRAMES = ['3 Months', '6 Months', '12 Months'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [step, setStep] = useState(0); // 0 intro, 1-3 form, 4 loading, 5 result
  const [form, setForm] = useState({
    currentRole: '', skills: '', targetRole: '',
    helpNeeded: [], biggestChallenge: '', timeframe: '6 Months', email: '',
  });
  const [errors, setErrors] = useState({});
  const [roadmap, setRoadmap] = useState('');
  const [apiError, setApiError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleHelp = (h) =>
    set('helpNeeded', form.helpNeeded.includes(h) ? form.helpNeeded.filter((x) => x !== h) : [...form.helpNeeded, h]);

  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.currentRole.trim()) e.currentRole = 'Tell us what you do now.';
      if (!form.skills.trim()) e.skills = 'List a few of your skills.';
      if (!form.targetRole.trim()) e.targetRole = 'Tell us the role or goal you want.';
    }
    if (s === 2) {
      if (!form.helpNeeded.length) e.helpNeeded = 'Pick at least one area.';
      if (!form.biggestChallenge.trim()) e.biggestChallenge = 'Describe your biggest challenge.';
    }
    if (s === 3) {
      if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => validate(step) && setStep(step + 1);

  const generate = async () => {
    if (!validate(3)) return;
    setStep(4);
    setApiError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setRoadmap(data.roadmap);
      setStep(5);
    } catch (err) {
      setApiError(err.message);
      setStep(3);
    }
  };

  const restart = () => { setRoadmap(''); setErrors({}); setStep(1); };

  const Field = ({ label, error, children }) => (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {error && <span className="error">{error}</span>}
    </label>
  );

  return (
    <div className="app">
      <header className="top">
        <button className="brand" onClick={() => setStep(0)}>@i Kazi</button>
      </header>

      <main>
        {step === 0 && (
          <section className="intro">
            <h1>@i Kazi</h1>
            <p className="tagline">Map your career goal in three short questions.</p>
            <button className="btn primary" onClick={() => setStep(1)}>Start</button>
          </section>
        )}

        {step >= 1 && step <= 3 && (
          <section className="card">
            <div className="progress" aria-label={`Step ${step} of 3`}>
              <div style={{ width: `${(step / 3) * 100}%` }} />
            </div>
            <p className="step">Step {step} of 3</p>

            {step === 1 && (
              <>
                <h2>Where you stand</h2>
                <Field label="What do you do?" error={errors.currentRole}>
                  <input value={form.currentRole} onChange={(e) => set('currentRole', e.target.value)}
                    placeholder="e.g. Junior web developer, CS student, sales lead" />
                </Field>
                <Field label="What are your skills?" error={errors.skills}>
                  <textarea rows={3} value={form.skills} onChange={(e) => set('skills', e.target.value)}
                    placeholder="e.g. JavaScript, React basics, Git, SQL, communication" />
                </Field>
                <Field label="Where do you want to be?" error={errors.targetRole}>
                  <input value={form.targetRole} onChange={(e) => set('targetRole', e.target.value)}
                    placeholder="e.g. Full-stack engineer, AI product manager" />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <h2>Where you need support</h2>
                <fieldset className="field">
                  <legend className="label">Where do you need help?</legend>
                  <div className="options">
                    {HELP.map(([name, desc]) => (
                      <label key={name} className={`option ${form.helpNeeded.includes(name) ? 'on' : ''}`}>
                        <input type="checkbox" checked={form.helpNeeded.includes(name)} onChange={() => toggleHelp(name)} />
                        <span><strong>{name}</strong><small>{desc}</small></span>
                      </label>
                    ))}
                  </div>
                  {errors.helpNeeded && <span className="error">{errors.helpNeeded}</span>}
                </fieldset>
                <Field label="What is your biggest challenge right now?" error={errors.biggestChallenge}>
                  <textarea rows={3} value={form.biggestChallenge} onChange={(e) => set('biggestChallenge', e.target.value)}
                    placeholder="e.g. Not enough time, unsure what to build, getting filtered out by recruiters" />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <h2>Pace and delivery</h2>
                <div className="field">
                  <span className="label">How fast do you want to get there?</span>
                  <div className="segmented">
                    {TIMEFRAMES.map((t) => (
                      <button key={t} type="button" className={form.timeframe === t ? 'on' : ''} onClick={() => set('timeframe', t)}>{t}</button>
                    ))}
                  </div>
                </div>
                <Field label="Your email" error={errors.email}>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" />
                </Field>
                {apiError && (
                  <div className="alert" role="alert">
                    <strong>Couldn't generate your roadmap.</strong> {apiError}
                  </div>
                )}
              </>
            )}

            <div className="nav">
              {step > 1 ? <button className="btn" onClick={() => setStep(step - 1)}>Back</button> : <span />}
              {step < 3
                ? <button className="btn primary" onClick={next}>Next</button>
                : <button className="btn primary" onClick={generate}>{apiError ? 'Try again' : 'Generate my roadmap'}</button>}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="card loading" aria-live="polite">
            <div className="spinner" />
            <h2>Building your roadmap</h2>
            <p>From {form.currentRole} to {form.targetRole}, over {form.timeframe.toLowerCase()}. This takes up to a minute.</p>
          </section>
        )}

        {step === 5 && (
          <section className="card result">
            <div className="result-head">
              <div>
                <h2>Your career roadmap</h2>
                <p className="muted">{form.targetRole} · {form.timeframe}</p>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => window.print()}>Print</button>
                <button className="btn" onClick={restart}>Start over</button>
              </div>
            </div>
            <article className="prose"><ReactMarkdown>{roadmap}</ReactMarkdown></article>
          </section>
        )}
      </main>

      <footer>© 2026 @i Kazi. Roadmaps are generated by AI; treat them as a starting point.</footer>
    </div>
  );
}
