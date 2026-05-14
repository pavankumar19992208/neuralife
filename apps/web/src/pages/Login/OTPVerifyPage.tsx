import MainLogo from "@/assets/images/main_logo.png";
import { useSendOtp, useVerifyOtp } from "@/hooks/useAuth";
import { slideUp } from "@/lib/animations";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function maskMobile(mobile: string): string {
  if (!mobile.startsWith("+91") || mobile.length < 10) return mobile;
  const d = mobile.slice(3);
  return `+91 ${d.slice(0, 2)}XXX X${d.slice(6)}`;
}

export default function OTPVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mobile = searchParams.get("mobile") ?? "";
  const devOtp = searchParams.get("devOtp") ?? "";

  const [otp, setOtp] = useState<string[]>(
    devOtp.length === 6 ? devOtp.split("") : Array(6).fill(""),
  );
  const [seconds, setSeconds] = useState(60);
  const [errorMsg, setErrorMsg] = useState("");

  const verifyOtp = useVerifyOtp();
  const sendOtp = useSendOtp();

  useEffect(() => {
    if (!mobile) navigate("/login", { replace: true });
  }, [mobile, navigate]);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.getElementById("otp-0");
      if (el) (el as HTMLInputElement).focus();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setErrorMsg("");
    if (digit && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`);
      if (el) (el as HTMLInputElement).focus();
    }
    if (digit && index === 5) {
      const full = next.join("");
      if (full.length === 6) submitOtp(full);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const next = [...otp];
        next[index] = "";
        setOtp(next);
      } else if (index > 0) {
        const el = document.getElementById(`otp-${index - 1}`);
        if (el) (el as HTMLInputElement).focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    if (!text) return;
    const next = Array(6).fill("");
    text.split("").forEach((d, i) => {
      next[i] = d;
    });
    setOtp(next);
    const el = document.getElementById(`otp-${Math.min(text.length, 5)}`);
    if (el) (el as HTMLInputElement).focus();
    if (text.length === 6) submitOtp(text);
  };

  const submitOtp = (value: string) => {
    setErrorMsg("");
    verifyOtp.mutate(
      { mobile, otp: value },
      {
        onError: (err) =>
          setErrorMsg(
            err instanceof Error ? err.message : "Verification failed",
          ),
      },
    );
  };

  const handleResend = () => {
    if (seconds > 0 || sendOtp.isPending) return;
    setOtp(Array(6).fill(""));
    setErrorMsg("");
    setSeconds(60);
    sendOtp.mutate({ mobile });
    setTimeout(() => {
      const el = document.getElementById("otp-0");
      if (el) (el as HTMLInputElement).focus();
    }, 100);
  };

  const otpValue = otp.join("");
  const hasError = !!errorMsg;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background:
          "linear-gradient(145deg, #04091a 0%, #0a1535 45%, #061220 100%)",
      }}
    >
      {/* Blobs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: "-20%",
          right: "-15%",
          background:
            "radial-gradient(circle, rgba(30,64,175,0.32) 0%, transparent 68%)",
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
          left: "-12%",
          background:
            "radial-gradient(circle, rgba(13,148,136,0.22) 0%, transparent 68%)",
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
          {/* Back */}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mb-6 flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
            style={{ color: "rgba(148,163,184,0.5)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(147,197,253,0.9)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(148,163,184,0.5)")
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Change number
          </button>

          {/* Logo mini */}
          <div className="mb-6 flex flex-col items-center">
            <motion.div
              className="mb-4 flex h-20 w-20 items-center justify-center p-2 z-10"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <img
                src={MainLogo}
                alt="NeuraLife Logo"
                className="h-full w-full object-contain drop-shadow-lg"
              />
            </motion.div>
            <h2 className="text-lg font-semibold text-white">
              Verify your number
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              OTP sent to{" "}
              <span
                className="font-semibold"
                style={{ color: "rgba(147,197,253,0.8)" }}
              >
                {maskMobile(mobile)}
              </span>
            </p>
          </div>

          {/* Dev OTP banner */}
          {devOtp && (
            <div
              className="mb-5 rounded-lg border px-4 py-2.5 text-center"
              style={{
                borderColor: "rgba(234,179,8,0.3)",
                background: "rgba(234,179,8,0.08)",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(253,224,71,0.8)" }}
              >
                Dev OTP:{" "}
              </span>
              <span
                className="font-mono text-sm font-bold tracking-widest"
                style={{ color: "rgba(253,224,71,1)" }}
              >
                {devOtp}
              </span>
            </div>
          )}

          {/* OTP boxes */}
          <div className="mb-5">
            <motion.div
              className="flex justify-center gap-2.5"
              animate={hasError ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
              transition={{ duration: 0.45 }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i]}
                  disabled={verifyOtp.isPending}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  aria-label={`OTP digit ${i + 1}`}
                  className="h-14 w-11 rounded-xl text-center text-xl font-bold text-white outline-none transition-all duration-150 disabled:opacity-50"
                  style={{
                    background: otp[i]
                      ? "rgba(30,64,175,0.22)"
                      : "rgba(255,255,255,0.05)",
                    border: hasError
                      ? "1.5px solid rgba(239,68,68,0.7)"
                      : otp[i]
                        ? "1.5px solid rgba(30,64,175,0.65)"
                        : "1.5px solid rgba(255,255,255,0.1)",
                    boxShadow:
                      otp[i] && !hasError
                        ? "0 0 14px rgba(30,64,175,0.3)"
                        : undefined,
                    caretColor: "transparent",
                  }}
                />
              ))}
            </motion.div>

            <AnimatePresence>
              {errorMsg && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-center text-xs text-red-400"
                  role="alert"
                >
                  {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Verify button */}
          <button
            onClick={() => otpValue.length === 6 && submitOtp(otpValue)}
            disabled={otpValue.length < 6 || verifyOtp.isPending}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
              boxShadow:
                "0 4px 20px rgba(30,64,175,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {verifyOtp.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify & Sign In"
            )}
          </button>

          {/* Resend */}
          <div className="mt-5 text-center">
            {seconds > 0 ? (
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.4)" }}>
                Resend OTP in{" "}
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: "rgba(148,163,184,0.65)" }}
                >
                  0:{String(seconds).padStart(2, "0")}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={sendOtp.isPending}
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ color: "rgba(96,165,250,0.75)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(147,197,253,1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(96,165,250,0.75)")
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {sendOtp.isPending ? "Sending…" : "Resend OTP"}
              </button>
            )}
          </div>
        </div>
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
