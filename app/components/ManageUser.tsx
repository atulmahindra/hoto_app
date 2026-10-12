"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
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
  TablePagination,
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
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

const API_HOST = API_BASE_URL;

type UserStatus = "Active" | "Inactive" | "Unknown";
type UserRole = string;

interface UserRecord {
  id: string | number;
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

const findUserRows = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of [
    "data",
    "users",
    "user",
    "userList",
    "user_list",
    "userData",
    "user_data",
    "records",
    "result",
  ]) {
    const rows = findUserRows(record[key]);
    if (rows) return rows;
  }
  return null;
};

const getApiValue = (
  record: Record<string, unknown>,
  keys: string[]
): unknown => {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(record)) {
    if (normalizedKeys.has(key.toLowerCase()) && value != null) return value;
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedValue = getApiValue(value as Record<string, unknown>, keys);
      if (nestedValue != null) return nestedValue;
    }
  }
  return undefined;
};

const apiValueToString = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object") {
    const nested = value as Record<string, unknown>;
    for (const key of [
      "name",
      "role_name",
      "roleName",
      "city_name",
      "cityName",
      "yard_name",
      "yardName",
      "label",
    ]) {
      const name = nested[key];
      if (typeof name === "string" || typeof name === "number") {
        return String(name);
      }
    }
  }
  return "";
};

const mapApiUser = (value: unknown, index: number): UserRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The user list contains an invalid record.");
  }
  const record = value as Record<string, unknown>;
  const idValue = getApiValue(record, ["id", "user_id", "userId", "_id"]);
  const statusValue = getApiValue(record, [
    "status",
    "is_active",
    "isActive",
    "active",
  ]);
  const statusText = String(statusValue ?? "").toLowerCase();
  const status: UserStatus =
    ["active", "1", "true", "enabled"].includes(statusText)
      ? "Active"
      : ["inactive", "0", "false", "disabled", "deactivated"].includes(statusText)
        ? "Inactive"
        : "Unknown";

  return {
    id:
      typeof idValue === "string" || typeof idValue === "number"
        ? idValue
        : `user-${index}`,
    name:
      apiValueToString(
        getApiValue(record, [
          "name",
          "full_name",
          "fullName",
          "user_name",
          "username",
        ])
      ) || "—",
    mobile: apiValueToString(
      getApiValue(record, [
        "mobile",
        "mobile_no",
        "mobileNo",
        "mobile_number",
        "phone",
        "phone_number",
      ])
    ),
    email: apiValueToString(
      getApiValue(record, ["email", "email_id", "emailId", "email_address"])
    ),
    role:
      apiValueToString(
        getApiValue(record, [
          "role",
          "role_name",
          "roleName",
          "user_role",
          "userRole",
        ])
      ) || "Unknown",
    location:
      apiValueToString(
        getApiValue(record, [
          "location",
          "city",
          "city_name",
          "cityName",
          "yard",
          "yard_name",
          "yardName",
        ])
      ) || "—",
    status,
  };
};

export default function ManageUser() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [listError, setListError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadUsers = useCallback(async (): Promise<UserRecord[]> => {
    const token = getToken();
    const response = await axios.get(`${API_HOST}/api/v1/user`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (
      response.data?.success === false ||
      response.data?.status === false ||
      response.data?.status === "error"
    ) {
      throw new Error(response.data.message || "Failed to load users.");
    }

    const rows = findUserRows(response.data);
    if (!rows) {
      throw new Error("The user list response has an unexpected format.");
    }
    return rows.map(mapApiUser);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    void loadUsers()
      .then((loadedUsers) => {
        if (!cancelled) setUsers(loadedUsers);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message || "Failed to load users. Please try again."
          : error instanceof Error
            ? error.message
            : "Failed to load users. Please try again.";
        console.error("Failed to load users:", error);
        setUsers([]);
        setListError(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setListError("");
    try {
      setUsers(await loadUsers());
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || "Failed to load users. Please try again."
        : error instanceof Error
          ? error.message
          : "Failed to load users. Please try again.";
      console.error("Failed to load users:", error);
      setUsers([]);
      setListError(message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const normalizeForm = (values: UserForm): UserForm => ({
    name: values.name.trim(),
    mobile: values.mobile.trim(),
    email: values.email.trim(),
    role: values.role,
    location: values.location.trim(),
    status: values.status,
  });

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

  const roleOptions = useMemo(
    () => Array.from(new Set([...roles, ...users.map((user) => user.role)])),
    [users]
  );

  const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        currentPage * rowsPerPage,
        currentPage * rowsPerPage + rowsPerPage
      ),
    [filteredUsers, currentPage, rowsPerPage]
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSaveError("");
    setSaving(false);
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserRecord) => {
    setEditingId(user.id);
    setSaveError("");
    setSaving(false);
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

  const closeDialog = () => {
    setDialogOpen(false);
    setSaveError("");
    setSaving(false);
  };

  const updateForm =
    (field: keyof UserForm) =>
    (event: { target: { value: string } }) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const saveUser = async () => {
    const normalized = normalizeForm(form);

    if (
      !normalized.name ||
      !/^\d{10}$/.test(normalized.mobile) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email) ||
      !normalized.location.trim()
    ) {
      setSaveError("Please enter a valid name, 10-digit mobile, email, and location.");
      return;
    }

    setSaveError("");

    if (editingId !== null) {
      setSaving(true);
      setUsers((current) =>
        current.map((user) =>
          user.id === editingId ? { ...user, ...normalized } : user
        )
      );
      closeDialog();
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_HOST}/api/v1/auth/register`,
        {
          name: normalized.name,
          mobile: normalized.mobile,
          roleId: 1,
          entity: 1,
          city: "1",
          yard: "4",
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to register user. Please try again."
        );
      }

      closeDialog();
      void fetchUsers();
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ||
          "Failed to register user. Please try again."
        : error instanceof Error
          ? error.message
          : "Failed to register user. Please try again.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = (id: string | number) => {
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
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
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
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(0);
          }}
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
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="All Roles">All Roles</MenuItem>
            {roleOptions.map((role) => (
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
            {loadingUsers && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loadingUsers && listError && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Alert
                    severity="error"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => void fetchUsers()}
                      >
                        Retry
                      </Button>
                    }
                  >
                    {listError}
                  </Alert>
                </TableCell>
              </TableRow>
            )}
            {!loadingUsers &&
              !listError &&
              paginatedUsers.map((user) => (
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
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(user)}
                    >
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
                        color:
                          user.status === "Active" ? "#b45309" : "#15803d",
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
            {!loadingUsers && !listError && filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography sx={{ color: "#64748b" }}>
                    {users.length === 0
                      ? "No users found."
                      : "No users match the current filters."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={currentPage}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingId ? "Edit User" : "Add User"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
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
                slotProps={{ htmlInput: { maxLength: 10 } }}
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
                  {roleOptions.map((role) => (
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
            disabled={isSaveDisabled || saving}
            sx={{
              textTransform: "none",
              backgroundColor: "#097aa2",
              "&:hover": { backgroundColor: "#075f7e" },
            }}
          >
            {saving ? "Adding..." : "Save User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
