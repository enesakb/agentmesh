import { TopBar } from '@/components/TopBar';
import { ChainBar } from '@/components/ChainBar';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { StatsStrip } from '@/components/StatsStrip';
import { LayersSection } from '@/components/Layers';
import { CodeShowcase } from '@/components/CodeShowcase';
import { SequenceDiagramSection } from '@/components/SequenceDiagram';
import { LiveProtocol } from '@/components/LiveProtocol';
import { TryLive } from '@/components/TryLive';
import { LiveFeed } from '@/components/LiveFeed';
import { TestPipeline } from '@/components/TestPipeline';
import { Manifesto } from '@/components/Manifesto';
import { Comparison } from '@/components/Comparison';
import { Why } from '@/components/Why';
import { FAQ } from '@/components/FAQ';
import { PullQuote } from '@/components/PullQuote';
import { Footer } from '@/components/Footer';
import { GlobalScene } from '@/components/GlobalScene';
import { Reveal } from '@/components/Reveal';

export default function Home() {
  return (
    <>
      <GlobalScene />
      <main>
        <TopBar />
        <Hero />
        <ChainBar />

        <Reveal from="up"><HowItWorks /></Reveal>
        <Reveal from="up"><StatsStrip /></Reveal>
        <Reveal from="up" delay={60}><LayersSection /></Reveal>

        <Reveal from="scale" duration={1000}>
          <PullQuote attribution="thesis · 2026">
            Six islands. None of them produce an economy. <span className="text-phosphor">An economy is the bridges.</span>
          </PullQuote>
        </Reveal>

        <Reveal from="up"><CodeShowcase /></Reveal>
        <Reveal from="up"><SequenceDiagramSection /></Reveal>
        <Reveal from="up"><TryLive /></Reveal>
        <Reveal from="up"><LiveProtocol /></Reveal>
        <Reveal from="up"><LiveFeed /></Reveal>
        <Reveal from="up"><TestPipeline /></Reveal>
        <Reveal from="up"><Manifesto /></Reveal>
        <Reveal from="up"><Comparison /></Reveal>
        <Reveal from="up"><Why /></Reveal>
        <Reveal from="up"><FAQ /></Reveal>
        <Footer />
      </main>
    </>
  );
}
