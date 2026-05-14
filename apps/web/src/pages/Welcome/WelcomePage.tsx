import MainLogo from "@/assets/images/main_logo.png";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ── Deterministic particles so no hydration mismatch ── */
const PARTICLES = [
  { x: 12, y: 18, s: 3, c: "#60a5fa", d: 4.2, dl: 0.3 },
  { x: 85, y: 7, s: 2, c: "#34d399", d: 5.1, dl: 1.1 },
  { x: 67, y: 82, s: 4, c: "#fbbf24", d: 3.8, dl: 0.7 },
  { x: 33, y: 55, s: 2, c: "#60a5fa", d: 6.0, dl: 2.1 },
  { x: 78, y: 40, s: 3, c: "#34d399", d: 4.5, dl: 0.5 },
  { x: 5, y: 70, s: 2, c: "#a78bfa", d: 5.5, dl: 1.8 },
  { x: 90, y: 65, s: 3, c: "#60a5fa", d: 3.5, dl: 0.2 },
  { x: 45, y: 90, s: 2, c: "#fbbf24", d: 5.8, dl: 3.0 },
  { x: 22, y: 35, s: 4, c: "#34d399", d: 4.0, dl: 1.5 },
  { x: 58, y: 15, s: 2, c: "#a78bfa", d: 6.2, dl: 0.9 },
  { x: 70, y: 58, s: 3, c: "#60a5fa", d: 3.9, dl: 2.4 },
  { x: 15, y: 88, s: 2, c: "#34d399", d: 5.3, dl: 0.6 },
  { x: 92, y: 22, s: 3, c: "#fbbf24", d: 4.7, dl: 1.3 },
  { x: 38, y: 72, s: 2, c: "#60a5fa", d: 5.0, dl: 2.8 },
  { x: 55, y: 45, s: 4, c: "#a78bfa", d: 3.6, dl: 0.4 },
  { x: 8, y: 50, s: 2, c: "#fbbf24", d: 6.5, dl: 1.7 },
  { x: 80, y: 85, s: 3, c: "#34d399", d: 4.3, dl: 3.2 },
  { x: 48, y: 28, s: 2, c: "#60a5fa", d: 5.6, dl: 0.8 },
  { x: 25, y: 62, s: 3, c: "#a78bfa", d: 4.1, dl: 2.2 },
  { x: 63, y: 95, s: 2, c: "#fbbf24", d: 5.9, dl: 1.0 },
];

const FEATURES = [
  { icon: "🧠", label: "AI-Powered Insights" },
  { icon: "📱", label: "SmartPad Ready" },
  { icon: "🇮🇳", label: "Telugu & English" },
  { icon: "⚡", label: "Real-time Dashboard" },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
      return;
    }
    timer.current = setTimeout(
      () => navigate("/login", { replace: true }),
      4800,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, navigate]);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
      style={{
        background:
          "linear-gradient(145deg, #020817 0%, #0c1a3a 40%, #041226 80%, #020817 100%)",
      }}
      onClick={() => navigate("/login", { replace: true })}
    >
      {/* ══ LAYER 1: Deep space blobs ══ */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 900,
          height: 900,
          top: "-30%",
          left: "-25%",
          background:
            "radial-gradient(circle, rgba(30,64,175,0.32) 0%, rgba(30,64,175,0.06) 45%, transparent 70%)",
          filter: "blur(90px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 700,
          height: 700,
          bottom: "-25%",
          right: "-20%",
          background:
            "radial-gradient(circle, rgba(13,148,136,0.25) 0%, rgba(13,148,136,0.05) 45%, transparent 70%)",
          filter: "blur(90px)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: "30%",
          right: "5%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)",
          filter: "blur(70px)",
        }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      {/* ══ LAYER 2: Dot-grid background ══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* ══ LAYER 3: Perspective floor grid ══ */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden"
        style={{ height: "42%" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: [
              "linear-gradient(rgba(30,64,175,0.08) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(30,64,175,0.08) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "48px 48px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "bottom center",
            maskImage:
              "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ══ LAYER 4: Floating particles ══ */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.s,
            height: p.s,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.c,
            boxShadow: `0 0 ${p.s * 3}px ${p.c}`,
          }}
          animate={{
            y: [0, -32, 0],
            opacity: [0, 1, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.d,
            repeat: Infinity,
            delay: p.dl,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ══ LAYER 5: Horizontal scan line ══ */}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(30,64,175,0.4) 30%, rgba(13,148,136,0.4) 70%, transparent 100%)",
        }}
        animate={{ top: ["10%", "90%", "10%"], opacity: [0, 0.6, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* ══ MAIN CONTENT ══ */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── 3D Logo assembly ── */}
        <div
          className="relative flex items-center justify-center mb-10"
          style={{ width: 220, height: 220 }}
        >
          {/* Outermost rotating ring with dashes */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 210,
              height: 210,
              border: "1px dashed rgba(30,64,175,0.18)",
              boxShadow: "0 0 60px rgba(30,64,175,0.08)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />

          {/* Outer ring + glow pulse */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              border: "1px solid rgba(30,64,175,0.35)",
              boxShadow:
                "0 0 40px rgba(30,64,175,0.2), inset 0 0 40px rgba(30,64,175,0.05)",
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.7, 1, 0.7],
              boxShadow: [
                "0 0 40px rgba(30,64,175,0.2), inset 0 0 40px rgba(30,64,175,0.05)",
                "0 0 70px rgba(30,64,175,0.4), inset 0 0 60px rgba(30,64,175,0.12)",
                "0 0 40px rgba(30,64,175,0.2), inset 0 0 40px rgba(30,64,175,0.05)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Middle dashed teal ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 146,
              height: 146,
              border: "1px dashed rgba(13,148,136,0.4)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />

          {/* Inner solid ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 112,
              height: 112,
              border: "1px solid rgba(30,64,175,0.6)",
              boxShadow: "0 0 20px rgba(30,64,175,0.3)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />

          {/* Blue orbiting dot on outer ring */}
          <motion.div
            className="absolute"
            style={{ width: 180, height: 180 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 10,
                height: 10,
                top: "50%",
                left: "-5px",
                marginTop: "-5px",
                background: "#60a5fa",
                boxShadow:
                  "0 0 12px #60a5fa, 0 0 24px rgba(96,165,250,0.6), 0 0 40px rgba(96,165,250,0.3)",
              }}
            />
          </motion.div>

          {/* Teal orbiting dot on middle ring */}
          <motion.div
            className="absolute"
            style={{ width: 146, height: 146 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 7,
                height: 7,
                top: "-3.5px",
                left: "50%",
                marginLeft: "-3.5px",
                background: "#34d399",
                boxShadow: "0 0 10px #34d399, 0 0 20px rgba(52,211,153,0.5)",
              }}
            />
          </motion.div>

          {/* Purple orbiting dot on inner ring */}
          <motion.div
            className="absolute"
            style={{ width: 112, height: 112 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 6,
                height: 6,
                bottom: "-3px",
                left: "50%",
                marginLeft: "-3px",
                background: "#a78bfa",
                boxShadow: "0 0 8px #a78bfa, 0 0 16px rgba(167,139,250,0.5)",
              }}
            />
          </motion.div>

          {/* Core icon */}
          <motion.div
            className="relative flex items-center justify-center z-10"
            style={{ width: 100, height: 100 }}
            animate={{
              y: [0, -6, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={MainLogo}
              alt="NeuraLife Logo"
              className="relative h-full w-full object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Shadow beneath core */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 70,
              height: 12,
              bottom: 48,
              background: "rgba(30,64,175,0.5)",
              filter: "blur(12px)",
            }}
            animate={{ opacity: [0.4, 0.8, 0.4], scaleX: [0.8, 1, 0.8] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* ── Brand name (animated letter reveal) ── */}
        <motion.div
          className="mb-3 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.h1
            className="text-6xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, #ffffff 15%, #93c5fd 45%, #5eead4 70%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 100%",
              letterSpacing: "-0.02em",
            }}
            initial={{ y: 60 }}
            animate={{
              y: 0,
              backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
            }}
            transition={{
              y: { delay: 0.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
              backgroundPosition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5,
              },
            }}
          >
            NeuraLife
          </motion.h1>
        </motion.div>

        {/* ── Tagline ── */}
        <motion.p
          className="mb-10 text-sm font-medium tracking-[0.3em] uppercase"
          style={{ color: "rgba(148,163,184,0.55)" }}
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ delay: 0.95, duration: 0.8 }}
        >
          Intelligent School Management
        </motion.p>

        {/* ── Feature pill cards ── */}
        <motion.div
          className="mb-12 grid grid-cols-2 gap-2.5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.6 }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
              }}
              initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.08, duration: 0.4 }}
            >
              <span className="text-base">{f.icon}</span>
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(147,197,253,0.75)" }}
              >
                {f.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Progress bar ── */}
        <motion.div
          className="rounded-full overflow-hidden"
          style={{
            width: 220,
            height: 2,
            background: "rgba(255,255,255,0.07)",
          }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.35, duration: 0.4 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #1e40af, #0d9488, #60a5fa, #a78bfa)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.5, duration: 3.0, ease: [0.4, 0, 0.2, 1] }}
          />
        </motion.div>

        <motion.p
          className="mt-3 text-[11px]"
          style={{ color: "rgba(148,163,184,0.3)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          Tap anywhere to continue
        </motion.p>
      </motion.div>

      {/* ══ Bottom: school count badge ══ */}
      <motion.div
        className="absolute bottom-16 flex items-center gap-2 rounded-full px-4 py-2"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      >
        <div className="flex -space-x-1">
          {["#1e40af", "#0d9488", "#a78bfa"].map((c, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded-full border border-[#04091a]"
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
          Trusted by AP &amp; Telangana schools
        </span>
      </motion.div>

      <motion.div
        className="absolute bottom-6 flex items-center justify-center gap-1.5 text-[10px]"
        style={{ color: "rgba(148,163,184,0.18)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <span>Powered by NeuraLife</span>
        <img
          src={MainLogo}
          alt="NeuraLife"
          className="h-3 w-auto object-contain opacity-60 grayscale"
        />
        <span>© 2026</span>
      </motion.div>
    </div>
  );
}
