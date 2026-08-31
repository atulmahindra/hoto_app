"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const ok = login(username, password);
    if (ok) {
      router.replace("/dashboard");
    } else {
      setError("Please enter a valid username and password.");
    }
  };

  const handleSsoLogin = () => {
    window.location.href = "https://login.mllqa.com/sso/login?client_id=alyte";
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#ffffff",
      }}
    >
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
        {/* Decorative circles */}
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
            sx={{
              height: 44,
              width: 44,
            }}
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
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: "#097aa2" }}
            >
              Alyte
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}
          >
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 4 }}>
            Please sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2.5 }}
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    Remember me
                  </Typography>
                }
              />
              <MuiLink
                href="#"
                variant="body2"
                underline="hover"
                sx={{ color: "#097aa2", fontWeight: 500 }}
              >
                Forgot password?
              </MuiLink>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                py: 1.3,
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                backgroundColor: "#097aa2",
                "&:hover": { backgroundColor: "#075f7e" },
              }}
            >
              Sign In
            </Button>

            {/* Divider */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                my: 2.5,
              }}
            >
              <Box sx={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                OR
              </Typography>
              <Box sx={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
            </Box>

            {/* SSO login */}
            <Button
              fullWidth
              variant="outlined"
              onClick={handleSsoLogin}
              sx={{
                py: 1.3,
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                color: "#097aa2",
                borderColor: "#097aa2",
                "&:hover": {
                  borderColor: "#075f7e",
                  backgroundColor: "rgba(9,122,162,0.06)",
                },
              }}
            >
              Login with SSO
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
