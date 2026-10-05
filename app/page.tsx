import Link from "../components/crm/link";
import {
  ArrowUpRight,
  ArrowRight,
  Layers3,
  ShieldCheck,
  Network,
  ScanLine,
  GitBranch,
  Command,
} from "lucide-react";
export default function Home() {
  return (
    <main className="landing">
      <nav className="public-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">D</span> datrixon <small>AI CRM</small>
        </Link>
        <div>
          <a href="#architecture">Architecture</a>
          <a href="#thesis">The thesis</a>
          <Link href="/workspace/economics">Build vs buy</Link>
          <Link className="button light" href="/workspace">
            Explore the demo <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div className="eyebrow">
          <span className="live-dot" /> A REFERENCE IMPLEMENTATION FOR THE AI
          ERA
        </div>
        <h1>
          Your CRM should
          <br />
          help you <em>decide.</em>
        </h1>
        <p>
          Traditional CRMs record what happened.
          <br />A focused revenue platform that turns relationship data into
          evidence-backed action. Datrixon explains what changed, why it
          matters, and what to do next.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/workspace">
            Enter the workspace <ArrowRight size={18} />
          </Link>
          <a className="text-link" href="#thesis">
            Explore the thinking <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="hero-footnote">
          Portfolio / reference implementation · Fictional organizations ·
          Synthetic data
        </div>
        <div className="hero-preview">
          <div className="preview-top">
            <span className="brand-mark">D</span>
            <span>UNDERSTAND · DETECT · EXPLAIN · ACT</span>
            <span className="badge green">Evidence → decision → action</span>
          </div>
          <div className="preview-body">
            <div>
              <p className="eyebrow">THE QUESTION THAT MATTERS</p>
              <h2>
                What deserves our
                <br />
                attention next?
              </h2>
              <p>
                See the signals behind the number.
                <br />
                Understand the relationship behind the deal.
              </p>
            </div>
            <div className="story-signals">
              <div>
                <ScanLine />
                <span>
                  <b>Detect a change</b>
                  <small>A deal moves backward in the pipeline.</small>
                </span>
              </div>
              <div>
                <Network />
                <span>
                  <b>Connect the evidence</b>
                  <small>Activity, support and decision-maker coverage.</small>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <b>Recommend, then ask</b>
                  <small>A person decides what happens next.</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="thesis" className="public-section">
        <p className="eyebrow">THE THESIS</p>
        <h2>
          Built around the work.
          <br />
          Not around the subscription.
        </h2>
        <div className="three-col">
          <article>
            <span className="number">01</span>
            <h3>The problem</h3>
            <p>
              Customer context is fragmented. Teams enter data but struggle to
              act on it. More fields and more dashboards rarely solve the
              underlying workflow problem.
            </p>
          </article>
          <article>
            <span className="number">02</span>
            <h3>A focused alternative</h3>
            <p>
              Model the customer cleanly, capture meaningful activity, calculate
              what changed, and put the next useful action in front of a person.
            </p>
          </article>
          <article>
            <span className="number">03</span>
            <h3>An honest tradeoff</h3>
            <p>
              Custom software creates ownership and flexibility. It also creates
              maintenance, security, support and integration obligations.
              Evaluate both sides.
            </p>
            <Link href="/workspace/economics">Explore the cost model →</Link>
          </article>
        </div>
      </section>
      <section className="public-section tinted">
        <p className="eyebrow">ONE COHERENT PLATFORM</p>
        <h2>
          Capture the relationship.
          <br />
          Explain what matters.
        </h2>
        <div className="three-col feature-grid">
          {[
            [
              Layers3,
              "Customer 360",
              "A relationship timeline, stakeholders, commercial history, support and meeting preparation.",
            ],
            [
              Command,
              "Evidence-backed copilot",
              "Approved semantic queries with source records and visible logic. No unrestricted AI-generated SQL.",
            ],
            [
              GitBranch,
              "Governed automation",
              "Observable agents, prioritized recommendations, role checks and an auditable human decision loop.",
            ],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Layers3;
            return (
              <article key={String(title)}>
                <I />
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section id="architecture" className="public-section">
        <p className="eyebrow">TRANSPARENT BY DESIGN</p>
        <h2>
          A small system.
          <br />
          Serious boundaries.
        </h2>
        <div className="architecture-strip">
          {[
            "React workspace",
            "Validated API",
            "CRM + intelligence services",
            "Relational SQLite / D1",
          ].map((s, i) => (
            <div key={s}>
              <span>0{i + 1}</span>
              <b>{s}</b>
            </div>
          ))}
        </div>
        <p className="wide-copy">
          One modular TypeScript application. The server edition implements
          permissions and workspace isolation. Integer currency, relational
          constraints and transactional audit records. Deterministic
          intelligence works without an API key. The provider adapter is an
          extension point, not a hidden decision maker.
        </p>
      </section>
      <section className="public-section final-cta">
        <p className="eyebrow">EXPLORE THE REFERENCE IMPLEMENTATION</p>
        <h2>
          Less data entry.
          <br />
          More informed decisions.
        </h2>
        <Link className="button primary" href="/workspace">
          Open Datrixon AI CRM <ArrowRight size={18} />
        </Link>
        <p>
          This is not a certified Salesforce replacement. No enterprise
          deployment or measured savings are claimed.
        </p>
      </section>
      <footer>
        <span className="brand">
          datrixon <small>AI CRM</small>
        </span>
        <span>Customer Intelligence & Revenue Operations</span>
        <Link href="/workspace/governance">Security & governance →</Link>
        <Link href="https://github.com/Jithendra-data/datrixon-ai-crm">
          GitHub & documentation ↗
        </Link>
      </footer>
    </main>
  );
}
