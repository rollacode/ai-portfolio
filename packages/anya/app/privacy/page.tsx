'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-8 inline-block"
        >
          &larr; Back
        </button>

        <h1 className="text-2xl font-semibold mb-8">Privacy Policy</h1>

        {/* 1. Introduction */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">1. Introduction</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            This website is operated by Andrey Kovalev, based in Riga, Latvia. It
            serves as a personal portfolio and features an AI-powered chatbot for
            interactive exploration of my work and experience. This Privacy Policy
            explains what data is collected, how it is used, and what rights you
            have regarding your information.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">
            2. Information We Collect
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            We collect minimal data, split into two categories:
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              Automatic (browser-side):
            </span>
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-1 mb-3">
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Theme preference
              </span>{' '}
              &mdash; stored in localStorage ({`"dark"`} or {`"light"`})
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Visitor ID
              </span>{' '}
              &mdash; a random UUID stored in sessionStorage, cleared when you
              close the tab
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Chat data
              </span>{' '}
              &mdash; messages, panel state, and cached AI insights stored in
              IndexedDB (the{' '}
              <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">
                portfolio-agent
              </code>{' '}
              database)
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              Voluntary (shared via AI chat):
            </span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            If you choose to share personal details in conversation with the AI
            chatbot (such as your name, company, role, or contact information),
            the chatbot may store this data server-side. See{' '}
            <a href="#visitor-data" className="text-gray-900 dark:text-gray-100 underline underline-offset-2">
              Section 5
            </a>{' '}
            for details.
          </p>
        </section>

        {/* 3. Local Storage Technologies */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">
            3. Local Storage Technologies
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            This site does not use traditional HTTP cookies. Instead, it uses
            browser-native storage mechanisms:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-2">
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                IndexedDB
              </span>{' '}
              &mdash; a browser database ({`"portfolio-agent"`}) that stores your
              chat history, UI panel state, and cached AI-generated insights with a
              1-hour TTL. This data persists until you clear your browser data.
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                sessionStorage
              </span>{' '}
              &mdash; holds a randomly generated visitor ID (UUID) used to
              associate your session with any voluntarily provided information. It
              is automatically cleared when you close the browser tab.
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                localStorage
              </span>{' '}
              &mdash; stores your theme preference ({`"dark"`} or {`"light"`}) so
              the site remembers your display choice between visits.
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
            All of these are stored locally in your browser. You can clear them at
            any time through your browser settings.
          </p>
        </section>

        {/* 4. AI Chat Service */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">4. AI Chat Service</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            The interactive chatbot on this site uses a third-party AI API (such as
            xAI/Grok or another OpenAI-compatible provider) to process and respond
            to your messages. When you send a message:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-1 mb-3">
            <li>
              Your message and conversation history are sent to the AI provider for
              processing
            </li>
            <li>
              The AI provider may process and temporarily store this data according
              to their own privacy policies
            </li>
            <li>
              Responses are streamed back to your browser in real time
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            I do not control how the third-party AI provider handles data on their
            servers. If you are concerned about sharing sensitive information, please
            avoid including it in chat messages.
          </p>
        </section>

        {/* 5. Visitor Data */}
        <section id="visitor-data">
          <h2 className="text-lg font-medium mt-8 mb-3">5. Visitor Data</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            When you voluntarily share personal details during a conversation, the
            AI chatbot may use its{' '}
            <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">
              remember_visitor
            </code>{' '}
            function to save the following information server-side:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-1 mb-3">
            <li>Name, company, and role</li>
            <li>Area of interest or reason for visiting</li>
            <li>Contact details (email, Telegram, phone, LinkedIn) if provided</li>
            <li>Freeform notes about the conversation</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            This data is stored in a server-side JSON file and is used solely by me
            to understand who is visiting my portfolio and to follow up on
            professional inquiries. It is not shared with or sold to third parties.
          </p>
        </section>

        {/* 6. Third-Party Services */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">
            6. Third-Party Services
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            This site relies on the following third-party services:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-2">
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                AI API Provider
              </span>{' '}
              &mdash; processes chat messages. The specific provider may be xAI
              (Grok), OpenAI, Groq, or another OpenAI-compatible service.
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Vercel
              </span>{' '}
              &mdash; hosts the website and handles server-side request processing.
              Vercel may collect standard server logs (IP addresses, request
              timestamps). See{' '}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-gray-100 underline underline-offset-2"
              >
                Vercel&apos;s Privacy Policy
              </a>
              .
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
            No analytics or tracking services (such as Google Analytics) are used on
            this site.
          </p>
        </section>

        {/* 7. Data Retention */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">7. Data Retention</h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-2">
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Browser storage
              </span>{' '}
              (IndexedDB, sessionStorage, localStorage) &mdash; you are in full
              control. Clear it at any time via your browser settings.
              sessionStorage is automatically cleared when you close the tab. Cached
              AI insights expire after 1 hour.
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Server-side visitor data
              </span>{' '}
              &mdash; retained until manually deleted by me. You may request
              deletion at any time (see Section 8).
            </li>
          </ul>
        </section>

        {/* 8. Your Rights */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">8. Your Rights</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Under the General Data Protection Regulation (GDPR) and similar
            legislation, you have the following rights regarding any personal data I
            hold:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed list-disc list-inside ml-2 space-y-1 mb-3">
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Right of access
              </span>{' '}
              &mdash; request a copy of any personal data stored about you
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Right to rectification
              </span>{' '}
              &mdash; request corrections to inaccurate data
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Right to erasure
              </span>{' '}
              &mdash; request deletion of your personal data
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Right to data portability
              </span>{' '}
              &mdash; request your data in a structured, machine-readable format
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Right to object
              </span>{' '}
              &mdash; object to the processing of your personal data
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Right to restrict processing
              </span>{' '}
              &mdash; request limitation of how your data is used
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            To exercise any of these rights, contact me at{' '}
            <a
              href="mailto:g.andry90@gmail.com"
              className="text-gray-900 dark:text-gray-100 underline underline-offset-2"
            >
              g.andry90@gmail.com
            </a>
            . I will respond within 30 days.
          </p>
        </section>

        {/* 9. Children's Privacy */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">
            9. Children&apos;s Privacy
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            This site is not directed at individuals under the age of 16. I do not
            knowingly collect personal information from children. If you believe a
            child has provided personal data through this site, please contact me
            and I will promptly delete it.
          </p>
        </section>

        {/* 10. Changes to This Policy */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">
            10. Changes to This Policy
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            I may update this Privacy Policy from time to time to reflect changes in
            how the site works or to comply with legal requirements. Any changes
            will be posted on this page with an updated revision date. Continued use
            of the site after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        {/* 11. Contact */}
        <section>
          <h2 className="text-lg font-medium mt-8 mb-3">11. Contact</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            If you have any questions about this Privacy Policy or your personal
            data, reach out to:
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
            <p>Andrey Kovalev</p>
            <p>Riga, Latvia</p>
            <p>
              <a
                href="mailto:g.andry90@gmail.com"
                className="text-gray-900 dark:text-gray-100 underline underline-offset-2"
              >
                g.andry90@gmail.com
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-white/10 mt-12 pt-6 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
          <p>Last updated: February 2026</p>
          <Link
            href="/terms"
            className="text-gray-900 dark:text-gray-100 underline underline-offset-2"
          >
            Terms of Use
          </Link>
        </div>
      </div>
    </div>
  );
}
