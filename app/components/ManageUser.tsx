"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

type UserStatus = "Active" | "Inactive";
type UserRole = "Admin" | "Manager" | "Auditor" | "Viewer";

interface UserRecord {
  id: number;
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
  location: string;
  status: UserStatus;
}

interface UserForm {
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
  location: string;
  status: UserStatus;
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    mobile: "9876543210",
    email: "rahul.sharma@alyte.in",
    role: "Admin",
    location: "Mumbai",
    status: "Active",
  },
  {
    id: 2,
    name: "Priya Nair",
    mobile: "9876501234",
    email: "priya.nair@alyte.in",
    role: "Manager",
    location: "Bengaluru",
    status: "Active",
  },
  {
    id: 3,
    name: "Amit Verma",
    mobile: "9988776655",
    email: "amit.verma@alyte.in",
    role: "Auditor",
    location: "Delhi NCR",
    status: "Inactive",
  },
];

const EMPTY_FORM: UserForm = {
  name: "",
  mobile: "",
  email: "",
  role: "Viewer",
  location: "",
  status: "Active",
};

const roles: UserRole[] = ["Admin", "Manager", "Auditor", "Viewer"];
const statuses: UserStatus[] = ["Active", "Inactive"];

export default function ManageUser() {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        [user.name, user.mobile, user.email, user.location]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserRecord) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      location: user.location,
      status: user.status,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const updateForm =
    (field: keyof UserForm) =>
    (event: { target: { value: string } }) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const saveUser = () => {
    if (editingId) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingId ? { ...user, ...form } : user
        )
      );
    } else {
      setUsers((current) => [
        {
          id: Date.now(),
          ...form,
        },
        ...current,
      ]);
    }
    closeDialog();
  };

  const toggleUserStatus = (id: number) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
              ...user,
              status: user.status === "Active" ? "Inactive" : "Active",
            }
          : user
      )
    );
  };

  const isSaveDisabled =
    !form.name.trim() ||
    !/^\d{10}$/.test(form.mobile) ||
    !form.email.trim() ||
    !form.location.trim();

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ p: 2 }}
      >
        <TextField
          size="small"
          placeholder="Search name, mobile, email, location"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
          <InputLabel>Role</InputLabel>
          <Select
            label="Role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <MenuItem value="All Roles">All Roles</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{
            minWidth: { xs: "100%", md: 132 },
            textTransform: "none",
            backgroundColor: "#097aa2",
            "&:hover": { backgroundColor: "#075f7e" },
          }}
        >
          Add User
        </Button>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Mobile</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b" }}>
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>{user.mobile}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.location}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={user.status}
                    color={user.status === "Active" ? "success" : "default"}
                    variant={user.status === "Active" ? "filled" : "outlined"}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit user">
                    <IconButton size="small" onClick={() => openEditDialog(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={
                      user.status === "Active"
                        ? "Deactivate user"
                        : "Activate user"
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={() => toggleUserStatus(user.id)}
                      sx={{
                        color: user.status === "Active" ? "#b45309" : "#15803d",
                      }}
                    >
                      {user.status === "Active" ? (
                        <BlockIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography sx={{ color: "#64748b" }}>
                    No users match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingId ? "Edit User" : "Add User"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Full Name"
              value={form.name}
              onChange={updateForm("name")}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Mobile Number"
                value={form.mobile}
                onChange={updateForm("mobile")}
                inputProps={{ maxLength: 10 }}
                fullWidth
              />
              <TextField
                label="Email"
                value={form.email}
                onChange={updateForm("email")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={form.role}
                  onChange={updateForm("role")}
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={updateForm("status")}
                >
                  {statuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Location"
              value={form.location}
              onChange={updateForm("location")}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveUser}
            disabled={isSaveDisabled}
            sx={{
              textTransform: "none",
              backgroundColor: "#097aa2",
              "&:hover": { backgroundColor: "#075f7e" },
            }}
          >
            Save User
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
