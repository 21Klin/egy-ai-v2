export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight mb-4 bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-transparent">
          Terms of Use
        </h1>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg backdrop-blur space-y-6 text-sm text-slate-300">
          <p>
            EGY AI is a student-built educational project. All trading shown on this
            platform is simulated — no real funds are used, and nothing on this site
            constitutes financial advice.
          </p>
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">No financial advice</h2>
            <p>
              The genetic algorithm, signals, and strategies shown here are for
              educational and demonstration purposes only. Do not make real trading
              decisions based on this simulator.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Open source</h2>
            <p>
              This project is released as open source software under the MIT License.
              You are free to use, study, and build on it, with attribution.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">No warranty</h2>
            <p>
              This software is provided &quot;as is&quot;, without warranty of any
              kind, express or implied.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
