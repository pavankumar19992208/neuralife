import MainLogo from "@/assets/images/main_logo.png";
import { useSendOtp } from "@/hooks/useAuth";
import { slideUp } from "@/lib/animations";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const VALID_MOBILE = /^[6-9]\d{9}$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [touched, setTouched] = useState(false);
  const [apiError, setApiError] = useState("");

  const sendOtp = useSendOtp();

  const isValid = VALID_MOBILE.test(mobile);
  const showValidationError = touched && mobile.length > 0 && !isValid;

  const handleSend = () => {
    setTouched(true);
    if (!isValid || sendOtp.isPending) return;
    setApiError("");
    sendOtp.mutate(
      { mobile: `+91${mobile}` },
      {
        onSuccess: (data) => {
          const params = new URLSearchParams({ mobile: `+91${mobile}` });
          if (data.devOtp) params.set("devOtp", data.devOtp);
          navigate(`/otp-verify?${params.toString()}`);
        },
        onError: (err) =>
          setApiError(
            err instanceof Error ? err.message : "Something went wrong",
          ),
      },
    );
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background:
          "linear-gradient(145deg, #04091a 0%, #0a1535 45%, #061220 100%)",
      }}
    >
      {/* ── Ambient blobs ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: "-20%",
          left: "-15%",
          background:
            "radial-gradient(circle, rgba(30,64,175,0.35) 0%, transparent 68%)",
          filter: "blur(72px)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          bottom: "-15%",
          right: "-12%",
          background:
            "radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 68%)",
          filter: "blur(72px)",
        }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* ── Dot grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "52px 52px",
        }}
      />

      {/* ── Card ── */}
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-[400px]"
      >
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.038)",
            border: "1px solid rgba(255,255,255,0.075)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="relative mb-4 flex items-center justify-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  border: "1px solid rgba(255,255,255,0.4)",
                  boxShadow: "0 0 24px rgba(255,255,255,0.3)",
                }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="relative flex h-20 w-20 items-center justify-center p-2 z-10">
                <img
                  src={MainLogo}
                  alt="NeuraLife Logo"
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </div>
            </motion.div>

            <motion.h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #ffffff 35%, #93c5fd 75%, #5eead4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              NeuraLife
            </motion.h1>
            <motion.p
              className="mt-1 text-xs font-medium tracking-widest uppercase"
              style={{ color: "rgba(148,163,184,0.45)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              School Management Platform
            </motion.p>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-white">
              Welcome to NeuraLife
            </h2>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "rgba(148,163,184,0.55)" }}
            >
              Sign in to manage your school
            </p>
          </div>

          {/* Mobile input */}
          <div className="mb-5 space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              Mobile Number
            </label>
            <div
              className="flex items-center overflow-hidden rounded-xl transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.055)",
                border: showValidationError
                  ? "1px solid rgba(239,68,68,0.65)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                className="flex items-center self-stretch border-r px-3.5 text-sm font-semibold select-none"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(148,163,184,0.7)",
                }}
              >
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                  setApiError("");
                }}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={sendOtp.isPending}
                aria-label="Mobile number"
                className="flex-1 bg-transparent px-3.5 py-3 text-sm text-white outline-none placeholder-white/20 disabled:opacity-50"
              />
            </div>
            <AnimatePresence>
              {showValidationError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-400"
                  role="alert"
                >
                  Enter a valid 10-digit number starting with 6–9
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Send OTP */}
          <button
            onClick={handleSend}
            disabled={sendOtp.isPending}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
              boxShadow:
                "0 4px 20px rgba(30,64,175,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {/* Shimmer sweep */}
            {!sendOtp.isPending && (
              <motion.div
                className="absolute inset-0 -skew-x-12 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
                }}
                animate={{ x: ["-120%", "220%"] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 1.8,
                }}
              />
            )}
            {sendOtp.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending OTP…
              </>
            ) : (
              <>
                Send OTP <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>

          <AnimatePresence>
            {apiError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-center text-xs text-red-400"
                role="alert"
              >
                {apiError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Trust badge */}
        <motion.div
          className="mt-5 flex items-center justify-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Sparkles
            className="h-3 w-3"
            style={{ color: "rgba(96,165,250,0.4)" }}
          />
          <span
            className="text-[11px]"
            style={{ color: "rgba(148,163,184,0.3)" }}
          >
            Trusted by AP &amp; Telangana schools
          </span>
        </motion.div>
      </motion.div>

      <div
        className="absolute bottom-5 flex items-center justify-center gap-1.5 text-[10px]"
        style={{ color: "rgba(148,163,184,0.2)" }}
      >
        <span>Powered by NeuraLife</span>
        <img
          src={MainLogo}
          alt="NeuraLife"
          className="h-3 w-auto object-contain opacity-60 grayscale"
        />
        <span>© 2026</span>
      </div>
    </div>
  );
}
