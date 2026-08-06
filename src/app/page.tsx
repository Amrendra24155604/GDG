import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Landing Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>E</div>
          <span>Employee Portal</span>
        </Link>
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#preview" className={styles.navLink}>Preview</a>
        </nav>
        <Link href="/dashboard" className={styles.navCta}>
          Launch Portal <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
        </Link>
      </header>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <span className={styles.tag}>Designed for efficiency</span>
          <h1 className={styles.heroTitle}>The modern workspace for productive teams</h1>
          <p className={styles.heroSubtitle}>
            Seamlessly manage your daily tasks. Request leaves, submit expense reports, and request procurement orders in a single, high-fidelity corporate portal.
          </p>
          <div className={styles.ctas}>
            <Link href="/dashboard" className={styles.primaryBtn}>
              <span className="material-symbols-outlined">dashboard</span>
              Go to Dashboard
            </Link>
            <a href="#features" className={styles.secondaryBtn}>
              Explore Features
            </a>
          </div>
        </section>

        {/* Dashboard Preview mockup */}
        <section id="preview" className={styles.previewContainer}>
          <div className={styles.previewFrame}>
            {/* Window bar */}
            <div className={styles.previewHeader}>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.previewBar}>localhost:3000/dashboard</div>
            </div>
            {/* Mockup dashboard content */}
            <div className={styles.previewContent}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h3 className="font-headline-md" style={{ color: "var(--on-surface)" }}>Welcome back, Alex!</h3>
                  <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>Here is your summary for today.</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>notifications</span>
              </div>

              {/* Bento Grid inside Mockup */}
              <div className={styles.simGrid}>
                {/* Procurement */}
                <div className={styles.simCard}>
                  <div className={styles.simCardHeader}>
                    <div className={styles.simTitleWrapper}>
                      <span className="material-symbols-outlined" style={{ color: "var(--secondary)" }}>shopping_cart</span>
                      <span>Procurement</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
                  </div>
                  <div className={styles.simValue} style={{ color: "var(--secondary)" }}>3</div>
                  <div className={styles.simDetail}>
                    Latest: Macbook Pro 14" (In Transit)
                  </div>
                </div>

                {/* Leave */}
                <div className={styles.simCard}>
                  <div className={styles.simCardHeader}>
                    <div className={styles.simTitleWrapper}>
                      <span className="material-symbols-outlined" style={{ color: "var(--on-surface)" }}>calendar_today</span>
                      <span>Leave</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
                  </div>
                  <div className={styles.simValue}>14</div>
                  <div className={styles.simDetail}>
                    Days remaining balance
                  </div>
                </div>

                {/* Expenses */}
                <div className={styles.simCard}>
                  <div className={styles.simCardHeader}>
                    <div className={styles.simTitleWrapper}>
                      <span className="material-symbols-outlined" style={{ color: "var(--secondary)" }}>receipt_long</span>
                      <span>Expenses</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
                  </div>
                  <div className={styles.simValue} style={{ color: "var(--secondary)" }}>₹450.00</div>
                  <div className={styles.simDetail}>
                    Awaiting manager approval
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Everything in one place</h2>
            <p className={styles.sectionSubtitle}>
              Features designed to reduce administrative overhead and help you focus on what really matters.
            </p>
          </div>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: "#e2e2e2" }}>
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <h3 className={styles.cardTitle}>Leave Management</h3>
              <p className={styles.cardDesc}>
                Easily track your remaining leave balance, request time off, and monitor pending approvals directly in your calendar.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: "#e3e2e2" }}>
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <h3 className={styles.cardTitle}>Expense Reimbursement</h3>
              <p className={styles.cardDesc}>
                Submit digital expense reports, upload receipts, and check reimbursement progress in real time.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: "#eeeeee" }}>
                <span className="material-symbols-outlined">shopping_cart</span>
              </div>
              <h3 className={styles.cardTitle}>Procurement & Hardware</h3>
              <p className={styles.cardDesc}>
                Request work equipment, view vendor delivery timelines, and track pending workspace shipments.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: "#e2e2e2" }}>
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <h3 className={styles.cardTitle}>Company Announcements</h3>
              <p className={styles.cardDesc}>
                Stay updated with modern townhall meetings, policy changes, and news announcements relative to your team.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>Ready to streamline your workday?</h2>
          <p className={styles.heroSubtitle}>
            Launch the portal dashboard now to see your updates, request time-off, or submit expense requests.
          </p>
          <Link href="/dashboard" className={styles.primaryBtn} style={{ marginTop: "16px" }}>
            Launch Portal Dashboard
            <span className="material-symbols-outlined">rocket_launch</span>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          &copy; 2026 Employee Portal. Built with Next.js &amp; Vanilla CSS.
        </p>
      </footer>
    </div>
  );
}
