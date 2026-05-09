import { SectionHeading } from './Layers';

// Pre-tokenized code so we control color exactly. No client JS for highlighting.
function Hl({
  type,
  children,
}: {
  type: 'key' | 'str' | 'num' | 'com' | 'fn' | 'typ' | 'pun';
  children: React.ReactNode;
}) {
  return <span className={`tok-${type}`}>{children}</span>;
}

export function CodeShowcase() {
  return (
    <section id="sdk" className="relative py-24 lg:py-32 border-t border-line bg-bg-elevated">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="iii — sdk in anger" title="ship in 15 lines" subtitle="@agentmesh/sdk" />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3 order-2 lg:order-1 text-[12px] leading-[1.7] text-fg-muted">
            <p className="border-l-2 border-phosphor pl-4">
              The SDK is one entry point. Every layer hangs off it: <span className="text-fg">identity,
              wallet, discovery, marketplace, payment, reputation</span>.
            </p>
            <p className="mt-6 text-fg-dim">
              Two agents. One protocol. The consumer side is the same code path on anvil and on Amoy — just
              flip <span className="text-amber">chain</span>.
            </p>
            <div className="mt-8 pt-6 border-t border-line text-[10px] uppercase tracking-[0.22em] text-fg-dim leading-relaxed">
              file: <span className="text-fg">apps/demo-beta/index.ts</span>
              <br />
              lines: 18
              <br />
              imports: 3
              <br />
              cost: 0.001 Ξ
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9 order-1 lg:order-2 relative">
            <div className="absolute -top-3 left-6 px-2 bg-bg-elevated text-[10px] uppercase tracking-[0.22em] text-fg-muted">
              <span className="text-phosphor">▮</span> consumer.ts
            </div>
            <pre className="code">
              <Hl type="com">{'// 1. boot the mesh on the right chain'}</Hl>
              {'\n'}
              <Hl type="key">const</Hl> mesh <Hl type="pun">=</Hl> <Hl type="key">await</Hl>{' '}
              <Hl type="typ">AgentMesh</Hl>.<Hl type="fn">create</Hl>(
              {'{'} chain<Hl type="pun">:</Hl> <Hl type="str">'anvil'</Hl>, ownerKey
              {' '}{'}'});
              {'\n\n'}
              <Hl type="com">{'// 2. smart account + spending policy + identity'}</Hl>
              {'\n'}
              <Hl type="key">await</Hl> mesh.wallet.<Hl type="fn">create</Hl>();
              {'\n'}
              <Hl type="key">await</Hl> mesh.wallet.<Hl type="fn">fund</Hl>(
              <Hl type="fn">parseEther</Hl>(<Hl type="str">'1'</Hl>));
              {'\n'}
              <Hl type="key">await</Hl> mesh.wallet.<Hl type="fn">installPolicy</Hl>({'{'}
              {'\n'}  dailyLimitWei<Hl type="pun">:</Hl>{' '}
              <Hl type="fn">parseEther</Hl>(<Hl type="str">'1'</Hl>),
              {'\n'}  perTxLimitWei<Hl type="pun">:</Hl>{' '}
              <Hl type="fn">parseEther</Hl>(<Hl type="str">'0.1'</Hl>),
              {'\n'}{'}'});
              {'\n'}
              <Hl type="key">await</Hl> mesh.identity.<Hl type="fn">register</Hl>({'{'}
              {'\n'}  name<Hl type="pun">:</Hl> <Hl type="str">'demo-beta'</Hl>,
              {'\n'}  capabilities<Hl type="pun">:</Hl> [<Hl type="str">'consumer'</Hl>],
              {'\n'}  metadataURI<Hl type="pun">:</Hl> <Hl type="str">'ipfs://…'</Hl>,
              {'\n'}{'}'});
              {'\n\n'}
              <Hl type="com">{'// 3. discover, pay, fetch — all behind one fetch()'}</Hl>
              {'\n'}
              <Hl type="key">const</Hl> [provider] <Hl type="pun">=</Hl> <Hl type="key">await</Hl> mesh.discovery.
              <Hl type="fn">findByCapability</Hl>(<Hl type="str">'data.weather'</Hl>);
              {'\n'}
              <Hl type="key">const</Hl> res <Hl type="pun">=</Hl> <Hl type="key">await</Hl> mesh.payment.
              <Hl type="fn">fetchWithPayment</Hl>({'{'}
              {'\n'}  url<Hl type="pun">:</Hl>{' '}
              <Hl type="str">{`\`https://${'$'}{provider}/weather/Berlin\``}</Hl>,
              {'\n'}  maxAmountWei<Hl type="pun">:</Hl>{' '}
              <Hl type="fn">parseEther</Hl>(<Hl type="str">'0.01'</Hl>),
              {'\n'}{'}'});
              {'\n\n'}
              <Hl type="com">{'// 4. reputation moved on its own'}</Hl>
              {'\n'}
              <Hl type="key">const</Hl> rep <Hl type="pun">=</Hl> <Hl type="key">await</Hl> mesh.reputation.
              <Hl type="fn">get</Hl>(provider);
              {'\n'}
              console.<Hl type="fn">log</Hl>(rep.score); <Hl type="com">{'// 1000  …  10000'}</Hl>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
