"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "../context/AuthContext";

const API_HOST = "https://alytehotoapi.mllqa.com";
const ENTITY = 1;
const OTP_LENGTH = 4;

type Step = "mobile" | "otp";

interface Toast {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

export default function LoginPage() {
  const router = useRouter();
  const { loginWithData, isAuthenticated, isLoading } = useAuth();

  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: "",
    severity: "error",
  });

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // OTP resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const showToast = (message: string, severity: "success" | "error") =>
    setToast({ open: true, message, severity });

  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // ─── Step 1: Send OTP ───────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_HOST}/api/v1/auth/login`, {
        mobile,
        entity: ENTITY,
      });

      const body = response.data ?? {};
      if (body.success !== true) {
        showToast(
          (body.message as string) || "Failed to send OTP. Please try again.",
          "error"
        );
        return;
      }

      showToast(body.message || "OTP sent successfully.", "success");
      setStep("otp");
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendTimer(60);
      // Focus first OTP box shortly after render
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      const message =
        (axios.isAxiosError(error) &&
          (error.response?.data?.message as string)) ||
        "Failed to send OTP. Please try again.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Step 2: Verify OTP ─────────────────────────────────────────────────
  const verifyOtp = async (code: string) => {
    setSubmitting(true);
    try {
      const response = await axios.post(`${API_HOST}/api/v1/auth/verify-otp`, {
        mobile,
        otp: code,
        entity: ENTITY,
      });

      const body = response.data ?? {};

      // The API may return HTTP 200 even for an invalid OTP, with a
      // success/status flag in the body. Only treat it as a success when the
      // body explicitly indicates one.
      const isSuccess =
        body.status === true ||
        body.success === true ||
        body.status === "success" ||
        body.status === 1 ||
        body.code === 200 ||
        body.statusCode === 200;

      if (!isSuccess) {
        const message =
          (body.message as string) || "Invalid OTP. Please try again.";
        showToast(message, "error");
        return;
      }

      const data = body.data ?? body ?? {};
      loginWithData({ mobile, ...data });

      showToast("Login successful.", "success");
      router.replace("/dashboard");
    } catch (error) {
      const message =
        (axios.isAxiosError(error) &&
          (error.response?.data?.message as string)) ||
        "Invalid OTP. Please try again.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── OTP input handling ─────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    const joined = next.join("");
    if (joined.length === OTP_LENGTH && !next.includes("")) {
      verifyOtp(joined);
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((d, i) => (next[i] = d));
    setOtp(next);

    if (pasted.length === OTP_LENGTH) {
      verifyOtp(pasted);
    } else {
      otpRefs.current[pasted.length]?.focus();
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", backgroundColor: "#ffffff" }}>
      {/* Left brand panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          width: "45%",
          p: 6,
          color: "#ffffff",
          background:
            "linear-gradient(135deg, #075f7e 0%, #097aa2 55%, #0a86b3 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 380,
            height: 380,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.06)",
            top: -120,
            right: -120,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
            bottom: -80,
            left: -60,
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            component="img"
            src="https://alyte.mllqa.com/logo.png"
            alt="Alyte"
            sx={{ height: 44, width: 44 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            Alyte
          </Typography>
        </Box>

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}
          >
            Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 420 }}>
            Manage your fleet, operations, and audits from one place. Sign in to
            continue.
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          © {new Date().getFullYear()} Alyte. All rights reserved.
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 6 },
          backgroundColor: "#f8fafc",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile brand */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              gap: 1.5,
              mb: 3,
            }}
          >
            <Box
              component="img"
              src="https://alyte.mllqa.com/logo.png"
              alt="Alyte"
              sx={{ height: 44, width: 44, objectFit: "contain" }}
            />
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#097aa2" }}>
              Alyte
            </Typography>
          </Box>

          {step === "mobile" ? (
            <>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}
              >
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", mb: 4 }}>
                Enter your mobile number to receive an OTP
              </Typography>

              <Box component="form" onSubmit={handleSendOtp}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  sx={{ mb: 3 }}
                  autoFocus
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIphoneIcon sx={{ color: "#94a3b8" }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={submitting}
                  sx={{
                    py: 1.3,
                    fontWeight: 600,
                    fontSize: "1rem",
                    textTransform: "none",
                    backgroundColor: "#097aa2",
                    "&:hover": { backgroundColor: "#075f7e" },
                  }}
                >
                  {submitting ? "Sending..." : "Send OTP"}
                </Button>
              </Box>
            </>
          ) : (
            <>
              <MuiLink
                component="button"
                type="button"
                onClick={() => setStep("mobile")}
                underline="none"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "#64748b",
                  mb: 2,
                }}
              >
                <ArrowBackIcon fontSize="small" /> Change number
              </MuiLink>

              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}
              >
                Verify OTP
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", mb: 4 }}>
                Enter the {OTP_LENGTH}-digit code sent to{" "}
                <strong>{mobile}</strong>
              </Typography>

              <Box
                sx={{ display: "flex", gap: 1.5, mb: 3 }}
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <TextField
                    key={index}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        index,
                        e as React.KeyboardEvent<HTMLInputElement>
                      )
                    }
                    inputRef={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    slotProps={{
                      htmlInput: {
                        maxLength: 1,
                        inputMode: "numeric",
                        style: {
                          textAlign: "center",
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          padding: "12px 0",
                        },
                      },
                    }}
                    sx={{ flex: 1 }}
                  />
                ))}
              </Box>

              <Button
                fullWidth
                variant="contained"
                disabled={submitting || otp.join("").length !== OTP_LENGTH}
                onClick={() => verifyOtp(otp.join(""))}
                sx={{
                  py: 1.3,
                  fontWeight: 600,
                  fontSize: "1rem",
                  textTransform: "none",
                  backgroundColor: "#097aa2",
                  "&:hover": { backgroundColor: "#075f7e" },
                }}
              >
                {submitting ? "Verifying..." : "Verify & Continue"}
              </Button>

              <Box sx={{ textAlign: "center", mt: 2 }}>
                {resendTimer > 0 ? (
                  <Typography variant="body2" sx={{ color: "#64748b" }}>
                    Resend OTP in{" "}
                    <strong>
                      {String(Math.floor(resendTimer / 60)).padStart(2, "0")}:
                      {String(resendTimer % 60).padStart(2, "0")}
                    </strong>
                  </Typography>
                ) : (
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={handleSendOtp}
                    underline="hover"
                    sx={{ color: "#097aa2", fontWeight: 500 }}
                  >
                    Resend OTP
                  </MuiLink>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={closeToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
