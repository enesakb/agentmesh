import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AgentMesh — six-layer protocol stack for the agent economy';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#07090a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        color: '#ecece6',
        padding: '64px 72px',
        position: 'relative',
      }}
    >
      {/* grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(184,255,58,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(184,255,58,0.06) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* phosphor halo top-left */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184,255,58,0.18), transparent 70%)',
        }}
      />

      {/* top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 18,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#7a7a73',
          zIndex: 1,
        }}
      >
        <span style={{ color: '#b8ff3a' }}>▮</span>
        <span style={{ color: '#ecece6' }}>agentmesh.protocol</span>
        <span>v0.1 · mvp</span>
        <span style={{ marginLeft: 'auto', color: '#b8ff3a' }}>● 99 tests green</span>
      </div>

      {/* wordmark */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 48,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: 32,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#ffb84d',
            marginBottom: 24,
          }}
        >
          ▮ six layers · one mesh
        </div>
        <div
          style={{
            fontSize: 168,
            fontWeight: 300,
            letterSpacing: -6,
            lineHeight: 0.9,
            color: '#ecece6',
            fontFamily: 'serif',
          }}
        >
          AgentMesh
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#7a7a73',
            marginTop: 16,
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          <span style={{ color: '#b8ff3a' }}>/</span> the agent economy, fully on-chain
        </div>
      </div>

      {/* layer ribbon */}
      <div
        style={{
          display: 'flex',
          gap: 36,
          marginTop: 'auto',
          paddingTop: 32,
          borderTop: '1px solid #2c3134',
          fontSize: 18,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#7a7a73',
          zIndex: 1,
        }}
      >
        {['identity', 'wallet', 'payment', 'discovery', 'marketplace', 'reputation'].map((l, i) => (
          <span key={l}>
            <span style={{ color: '#b8ff3a', marginRight: 8 }}>0{i + 1}</span>
            {l}
          </span>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
