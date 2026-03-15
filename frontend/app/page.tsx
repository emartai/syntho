export const dynamic = 'force-static';

import { Navbar } from './_components/Navbar';
import { Hero } from './_components/Hero';
import { SocialProofBar } from './_components/SocialProofBar';
import { HowItWorks } from './_components/HowItWorks';
import { Features } from './_components/Features';
import { PrivacyCompliance } from './_components/PrivacyCompliance';
import { Pricing } from './_components/Pricing';
import { FAQ } from './_components/FAQ';
import { FinalCTA } from './_components/FinalCTA';
import { Footer } from './_components/Footer';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#05030f] text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <SocialProofBar />
      <HowItWorks />
      <Features />
      <PrivacyCompliance />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
