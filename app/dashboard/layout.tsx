"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Box,
  Breadcrumbs,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  CircularProgress,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import TableChartIcon from "@mui/icons-material/TableChart";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useAuth } from "../context/AuthContext";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "HOTO Audit", href: "/dashboard", icon: <TableChartIcon /> },
  {
    label: "Manual Upload",
    href: "/dashboard/hoto-upload",
    icon: <UploadFileIcon />,
  },
];

// Page title + breadcrumb trail per route
const pageMeta: Record<string, { title: string; trail: string[] }> = {
  "/dashboard": { title: "HOTO Audit", trail: ["HOTO Audit"] },
  "/dashboard/hoto-upload": {
    title: "Manual Credit/Debit Upload",
    trail: ["Manual Upload"],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Protect the route
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // Loading / unauthenticated guard
  if (isLoading || !isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2, gap: 1.5 }}>
        <Box
          component="img"
          src="https://alyte.mllqa.com/logo.png"
          alt="Alyte"
          sx={{ height: 44, width: 44, objectFit: "contain" }}
        />
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#097aa2" }}>
          Alyte
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1, px: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                "&.Mui-selected": {
                  backgroundColor: "rgba(9,122,162,0.12)",
                  color: "#097aa2",
                  "&:hover": { backgroundColor: "rgba(9,122,162,0.18)" },
                  "& .MuiListItemIcon-root": { color: "#097aa2" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: { sx: { fontSize: "0.9rem", fontWeight: 500 } },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: "#ffffff",
          color: "#0f172a",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              {user?.username}
            </Typography>
            <Button
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ textTransform: "none", color: "#097aa2" }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              borderRight: "1px solid #e2e8f0",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: "#f7f8fc",
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 1, fontSize: "0.875rem" }}
          >
            <Box
              component={Link}
              href="/dashboard"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "#64748b",
                textDecoration: "none",
                "&:hover": { color: "#097aa2" },
              }}
            >
              <HomeIcon fontSize="small" />
              Home
            </Box>
            {(pageMeta[pathname]?.trail ?? []).map((crumb) => (
              <Typography
                key={crumb}
                sx={{ color: "#097aa2", fontWeight: 600, fontSize: "0.875rem" }}
              >
                {crumb}
              </Typography>
            ))}
          </Breadcrumbs>

          {/* Page header */}
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}
          >
            {pageMeta[pathname]?.title ?? "Dashboard"}
          </Typography>

          {children}
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 2,
            px: 3,
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            textAlign: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            © {new Date().getFullYear()} HOTO. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
