export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight mb-4 bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          This Privacy Policy explains how EGY AI collects, processes, and protects your data.
        </p>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p className="text-slate-300 text-sm mb-6">
            EGY AI (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to
            protecting your privacy and handling personal data responsibly, in line
            with general data protection principles such as the GDPR and CCPA.
          </p>

          <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
          <p className="text-slate-300 text-sm mb-4">
            EGY AI collects only limited information necessary to operate the platform,
            which may include:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-1 text-sm text-slate-300">
            <li>Website usage data (pages visited, time spent)</li>
            <li>Technical data (browser, device type)</li>
            <li>Error logs for debugging and security purposes</li>
          </ul>

          <h2 className="text-xl font-semibold mb-2">3. How We Use Your Data</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1 text-sm text-slate-300">
            <li>To improve platform performance and security</li>
            <li>To analyze anonymous behavioral data</li>
            <li>To respond to support or business inquiries</li>
          </ul>

          <h2 className="text-xl font-semibold mb-2">4. Cookies & Tracking</h2>
          <p className="text-slate-300 text-sm mb-6">
            EGY AI may use cookies for analytics, security, and performance
            monitoring. We do not sell or share cookie data with third parties.
          </p>

          <h2 className="text-xl font-semibold mb-2">5. Data Security</h2>
          <p className="text-slate-300 text-sm mb-6">
            We implement reasonable safeguards to protect your information. No
            personal data is ever shared or sold.
          </p>

          <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
          <p className="text-slate-300 text-sm mb-3">Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-6 mb-6 space-y-1 text-sm text-slate-300">
            <li>Request access to your stored data</li>
            <li>Request deletion of your data</li>
            <li>Request correction of inaccurate data</li>
            <li>Opt out of data collection</li>
          </ul>

          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p className="text-slate-300 text-sm mb-4">
            If you have questions about this Privacy Policy, you may contact us through
            the official:
          </p>
          <a
            href="/contact"
            className="inline-block px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm hover:bg-emerald-500/30 transition"
          >
            Contact Page →
          </a>
        </div>
      </div>
    </div>
  );
}
