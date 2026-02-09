import LandingHeader from "@/components/landing/LandingHeader";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import Problem from "@/components/landing/Problem";
import Outcomes from "@/components/landing/Outcomes";
import Modules from "@/components/landing/Modules";
import HowItWorks from "@/components/landing/HowItWorks";
import Screenshots from "@/components/landing/Screenshots";
import ROI from "@/components/landing/ROI";
import Security from "@/components/landing/Security";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--bg-base))]">
      <LandingHeader />
      <Hero />
      <SocialProof />
      <Problem />
      <Outcomes />
      <Modules />
      <HowItWorks />
      <Screenshots />
      <ROI />
      <Security />
      <FAQ />
      <FinalCTA />
      <LandingFooter />
    </main>
  );
}
