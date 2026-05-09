import { ChainBar } from '@/components/ChainBar';
import { CodeShowcase } from '@/components/CodeShowcase';
import { Comparison } from '@/components/Comparison';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';
import { GlobalScene } from '@/components/GlobalScene';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { LayersSection } from '@/components/Layers';
import { LiveFeed } from '@/components/LiveFeed';
import { LiveProtocol } from '@/components/LiveProtocol';
import { Manifesto } from '@/components/Manifesto';
import { PullQuote } from '@/components/PullQuote';
import { Reveal } from '@/components/Reveal';
import { SequenceDiagramSection } from '@/components/SequenceDiagram';
import { StatsStrip } from '@/components/StatsStrip';
import { TestPipeline } from '@/components/TestPipeline';
import { TopBar } from '@/components/TopBar';
import { TryLive } from '@/components/TryLive';
import { Why } from '@/components/Why';

export default function Home() {
  return (
    <>
      <GlobalScene />
      <main>
        <TopBar />
        <Hero />
        <ChainBar />

        <Reveal from="up">
          <HowItWorks />
        </Reveal>
        <Reveal from="up">
          <StatsStrip />
        </Reveal>
        <Reveal from="up" delay={60}>
          <LayersSection />
        </Reveal>

        <Reveal from="scale" duration={1000}>
          <PullQuote attribution="thesis · 2026">
            Six islands. None of them produce an economy.{' '}
            <span className="text-phosphor">An economy is the bridges.</span>
          </PullQuote>
        </Reveal>

        <Reveal from="up">
          <CodeShowcase />
        </Reveal>
        <Reveal from="up">
          <SequenceDiagramSection />
        </Reveal>
        <Reveal from="up">
          <TryLive />
        </Reveal>
        <Reveal from="up">
          <LiveProtocol />
        </Reveal>
        <Reveal from="up">
          <LiveFeed />
        </Reveal>
        <Reveal from="up">
          <TestPipeline />
        </Reveal>
        <Reveal from="up">
          <Manifesto />
        </Reveal>
        <Reveal from="up">
          <Comparison />
        </Reveal>
        <Reveal from="up">
          <Why />
        </Reveal>
        <Reveal from="up">
          <FAQ />
        </Reveal>
        <Footer />
      </main>
    </>
  );
}
