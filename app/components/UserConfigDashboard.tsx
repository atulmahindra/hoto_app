"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

const summaryCards = [
  {
    label: "Active Users",
    value: "18",
    icon: <GroupsIcon />,
    tone: "#097aa2",
  },
  {
    label: "Admin Roles",
    value: "04",
    icon: <AdminPanelSettingsIcon />,
    tone: "#3b7f4a",
  },
  {
    label: "Invites Pending",
    value: "03",
    icon: <PersonAddAlt1Icon />,
    tone: "#8a5a12",
  },
];

export default function UserConfigDashboard() {
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {summaryCards.map((card) => (
          <Paper
            key={card.label}
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              backgroundColor: "#ffffff",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 1.5,
                  display: "grid",
                  placeItems: "center",
                  color: card.tone,
                  backgroundColor: `${card.tone}1f`,
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {card.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {card.value}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}
