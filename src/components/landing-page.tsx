import { Link } from "@tanstack/react-router";
import {
  Activity, ArrowDown, ArrowRight, Check, Clock3, FileHeart, FileSearch2, HeartPulse,
  LockKeyhole, Share2, ShieldCheck, Star, Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: FileHeart, title: "One private record", copy: "Keep reports from different clinics and laboratories together." },
  { icon: FileSearch2, title: "Find it quickly", copy: "Search by title, hospital, doctor, date, or category." },
  { icon: Share2, title: "Share one report", copy: "Give a clinician access for a set time, then revoke it whenever you choose." },
  { icon: Activity, title: "See the timeline", copy: "Follow your health history by date and compare reports in the same category." },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="brand-lockup"><span className="brand-mark"><HeartPulse size={20} /></span><strong>MediVault</strong></Link>
        <nav aria-label="Main navigation"><a href="#features">What you can do</a><a href="#privacy">Privacy</a></nav>
        <div className="landing-actions"><Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button><Button asChild><Link to="/register">Create account <ArrowRight size={16} /></Link></Button></div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={15} /> YOUR RECORDS, YOUR CONTROL</span>
          <h1>Every report.<br /><span>One clear history.</span></h1>
          <p>Bring your medical reports together, find what you need, and share only what matters with the people caring for you.</p>
          <div className="hero-actions"><Button size="lg" asChild><Link to="/register">Get started <ArrowRight size={17} /></Link></Button><Button size="lg" variant="outline" asChild><Link to="/login">Sign in</Link></Button></div>
          <div className="hero-proof"><span><LockKeyhole size={15} /> Private by default</span><span><Clock3 size={15} /> Access can expire</span></div>
        </div>

        <div className="landing-visual" aria-label="MediVault report overview preview">
          <div className="visual-topline"><div className="visual-brand"><span className="brand-mark"><HeartPulse size={16} /></span><strong>MediVault</strong></div><span className="visual-avatar">A</span></div>
          <div className="visual-intro"><div><small>YOUR HEALTH RECORD</small><strong>Good afternoon, Alex</strong></div><span className="visual-private"><ShieldCheck size={14} /> PRIVATE</span></div>
          <div className="visual-stats"><div><span>REPORTS</span><strong>12</strong></div><div><span>IMPORTANT</span><strong>3</strong></div><div><span>SHARED</span><strong>1</strong></div></div>
          <div className="visual-report-heading"><strong>Recently added</strong><a href="#features">View all <ArrowRight size={13} /></a></div>
          <div className="visual-report"><span className="visual-report-icon"><Activity size={18} /></span><span className="visual-report-name"><strong>Blood panel</strong><small>Northside Clinic · 12 Jun</small></span><span className="visual-star"><Star size={15} fill="currentColor" /></span></div>
          <div className="visual-report"><span className="visual-report-icon coral"><FileHeart size={18} /></span><span className="visual-report-name"><strong>Chest X-ray</strong><small>City Hospital · 04 May</small></span><ArrowRight size={15} /></div>
          <div className="visual-share"><span><Stethoscope size={17} /></span><div><strong>Shared with Dr. Meena</strong><small>Access ends in 6 days</small></div><Check size={16} /></div>
          <div className="visual-sparkline"><span>YOUR REPORT TIMELINE</span><div><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
        </div>
      </section>

      <section className="landing-next" id="features">
        <div className="section-intro"><span className="eyebrow">A calmer way to keep track</span><h2>Your health history, organized around you.</h2><p>From a quick search to a time-limited share, the essentials stay close at hand.</p></div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, copy }) => <article className="feature-item" key={title}><span className="feature-icon"><Icon size={19} /></span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
        <a className="scroll-cue" href="#privacy">See how access works <ArrowDown size={14} /></a>
      </section>

      <section className="privacy-band" id="privacy">
        <div className="privacy-mark"><LockKeyhole size={22} /></div>
        <div><span className="eyebrow">Privacy comes first</span><h2>You decide what a doctor can see.</h2><p>Share a single report with an active clinician, set an expiry, and revoke access at any time. QR access can be turned off by regenerating your code.</p></div>
        <div className="privacy-points"><span><Check size={16} /> Your reports stay private</span><span><Check size={16} /> Shared access is time-limited</span><span><Check size={16} /> No medical advice or diagnosis</span></div>
      </section>
      <footer className="landing-footer"><Link to="/" className="brand-lockup"><span className="brand-mark"><HeartPulse size={18} /></span><strong>MediVault</strong></Link><span>Medical records, kept in your hands.</span><Link to="/register">Create your account <ArrowRight size={14} /></Link></footer>
    </main>
  );
}