import type { DeviceType, RenderMode } from '../types'
import { DEVICE_DIMENSIONS } from '../types'

interface DeviceFrameProps {
  deviceType: DeviceType
  renderMode: RenderMode
  children: React.ReactNode
}

const BEZEL_COLORS: Record<RenderMode, { outer: string; inner: string; screen: string }> = {
  color: {
    outer: '#1e293b',
    inner: '#0f172a',
    screen: '#ffffff',
  },
  eink: {
    outer: '#374151',
    inner: '#1f2937',
    screen: '#f5f5f0',
  },
}

export default function DeviceFrame({ deviceType, renderMode, children }: DeviceFrameProps) {
  const dim = DEVICE_DIMENSIONS[deviceType]
  const colors = BEZEL_COLORS[renderMode]

  // Scaled dimensions (what we actually display)
  const displayWidth = Math.round(dim.width * dim.scale)
  const displayHeight = Math.round(dim.height * dim.scale)

  if (deviceType === 'smartpad') {
    return (
      <SmartPadFrame
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        scale={dim.scale}
        colors={colors}
        renderMode={renderMode}
      >
        {children}
      </SmartPadFrame>
    )
  }

  if (deviceType === 'mobile') {
    return (
      <MobileFrame
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        scale={dim.scale}
        colors={colors}
        renderMode={renderMode}
      >
        {children}
      </MobileFrame>
    )
  }

  return (
    <TabletFrame
      displayWidth={displayWidth}
      displayHeight={displayHeight}
      scale={dim.scale}
      colors={colors}
      renderMode={renderMode}
    >
      {children}
    </TabletFrame>
  )
}

// ── SmartPad (landscape-ish tablet with prominent bezel) ──────────

function SmartPadFrame({ displayWidth, displayHeight, scale, colors, renderMode, children }: FrameProps) {
  const bezel = 20
  const screenW = displayWidth - bezel * 2
  const screenH = displayHeight - bezel * 3
  const frameW = displayWidth
  const frameH = displayHeight + 12

  return (
    <div
      style={{
        width: frameW,
        height: frameH,
        background: colors.outer,
        borderRadius: 20,
        padding: bezel,
        paddingTop: bezel + 4,
        paddingBottom: bezel + 8,
        boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Camera dot */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#374151' }} />

      {/* Screen area */}
      <div
        style={{
          width: screenW,
          height: screenH,
          background: colors.screen,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          filter: renderMode === 'eink' ? 'grayscale(100%) contrast(1.1)' : 'none',
        }}
      >
        <div style={{ width: `${Math.round(1404)}px`, height: `${Math.round(1872)}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>

      {/* Home bar */}
      <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 60, height: 4, borderRadius: 2, background: '#4b5563' }} />
    </div>
  )
}

// ── Mobile phone frame ────────────────────────────────────────────

function MobileFrame({ displayWidth, displayHeight, scale, colors, renderMode, children }: FrameProps) {
  const bezelH = 14
  const bezelV = 20
  const screenW = displayWidth - bezelH * 2
  const screenH = displayHeight - bezelV * 2
  const frameW = displayWidth
  const frameH = displayHeight + 10

  return (
    <div
      style={{
        width: frameW,
        height: frameH,
        background: colors.outer,
        borderRadius: 44,
        padding: `${bezelV}px ${bezelH}px`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Notch */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 90, height: 18, background: colors.outer, borderRadius: 10, zIndex: 10 }} />

      {/* Screen */}
      <div
        style={{
          width: screenW,
          height: screenH,
          background: colors.screen,
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
          filter: renderMode === 'eink' ? 'grayscale(100%)' : 'none',
        }}
      >
        <div style={{ width: '390px', height: '844px', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 100, height: 4, borderRadius: 2, background: '#6b7280' }} />
    </div>
  )
}

// ── Tablet frame ──────────────────────────────────────────────────

function TabletFrame({ displayWidth, displayHeight, scale, colors, renderMode, children }: FrameProps) {
  const bezel = 16
  const screenW = displayWidth - bezel * 2
  const screenH = displayHeight - bezel * 2

  return (
    <div
      style={{
        width: displayWidth,
        height: displayHeight + 8,
        background: colors.outer,
        borderRadius: 16,
        padding: bezel,
        boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Camera */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#374151' }} />

      {/* Screen */}
      <div
        style={{
          width: screenW,
          height: screenH,
          background: colors.screen,
          borderRadius: 6,
          overflow: 'hidden',
          filter: renderMode === 'eink' ? 'grayscale(100%) contrast(1.1)' : 'none',
        }}
      >
        <div style={{ width: '810px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

interface FrameProps {
  displayWidth: number
  displayHeight: number
  scale: number
  colors: { outer: string; inner: string; screen: string }
  renderMode: RenderMode
  children: React.ReactNode
}
