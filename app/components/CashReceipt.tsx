"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

const API_HOST = API_BASE_URL;
const SOURCE = "hotoapp";

interface FormState {
  driverOrPartnerId: string;
  cabNumber: string;
  amount: string;
  comments: string;
}

interface Toast {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

const INITIAL_FORM: FormState = {
  driverOrPartnerId: "",
  cabNumber: "",
  amount: "",
  comments: "",
};

export default function CashReceipt() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: "",
    severity: "success",
  });

  const showToast = (message: string, severity: "success" | "error") =>
    setToast({ open: true, message, severity });

  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.driverOrPartnerId.trim()) {
      next.driverOrPartnerId = "Driver / Partner ID is required.";
    }
    if (!form.cabNumber.trim()) {
      next.cabNumber = "Cab number is required.";
    }
    const amountNum = Number(form.amount);
    if (form.amount === "") {
      next.amount = "Amount is required.";
    } else if (Number.isNaN(amountNum)) {
      next.amount = "Amount must be a valid number.";
    } else if (amountNum <= 0) {
      next.amount = "Amount must be greater than zero.";
    }
    if (!form.comments.trim()) {
      next.comments = "Comments are required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Step 1: validate then open confirmation popup
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setConfirmOpen(true);
    }
  };

  const handleClear = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  // Step 2: confirm -> call the API and save
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const token = (user?.token as string) ?? "";
      const payload = {
        driverOrPartnerId: form.driverOrPartnerId.trim(),
        cabNumber: form.cabNumber.trim(),
        amount: Number(form.amount),
        comments: form.comments.trim(),
        source: SOURCE,
      };

      const response = await axios.post(
        `${API_HOST}/api/v1/cash-receipt`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      console.log("CashReceipt", response.data);
      setConfirmOpen(false);
      setForm(INITIAL_FORM);
      showToast("Cash receipt saved successfully.", "success");
    } catch (error) {
      const message =
        (axios.isAxiosError(error) &&
          (error.response?.data?.message as string)) ||
        "Failed to save cash receipt. Please try again.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        elevation={0}
        sx={{ p: 3, width: "100%", borderRadius: 2 }}
      >
        {/* <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
          Cash Receipt
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
          Record a cash collection from a driver or partner.
        </Typography> */}

        <Box component="form" onSubmit={handleSubmit}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
              alignItems: "flex-start",
            }}
          >
            {/* Left column: fields */}
            <Stack spacing={2.5} sx={{ flex: 1, width: "100%" }}>
              <TextField
                fullWidth
                size="small"
                label="Driver / Partner ID"
                placeholder="e.g. DRV12345"
                value={form.driverOrPartnerId}
                onChange={handleChange("driverOrPartnerId")}
                error={!!errors.driverOrPartnerId}
                helperText={errors.driverOrPartnerId}
              />

              <TextField
                fullWidth
                size="small"
                label="Cab Number"
                placeholder="e.g. MH01AB1234"
                value={form.cabNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cabNumber: e.target.value.toUpperCase(),
                  }))
                }
                error={!!errors.cabNumber}
                helperText={errors.cabNumber}
              />

              <TextField
                fullWidth
                size="small"
                label="Amount"
                placeholder="e.g. 1500.50"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: e.target.value.replace(/[^0-9.]/g, ""),
                  }))
                }
                error={!!errors.amount}
                helperText={errors.amount}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  },
                }}
              />
            </Stack>

            {/* Right column: comments */}
            <Box sx={{ flex: 1, width: "100%" }}>
              <TextField
                fullWidth
                size="small"
                label="Comments"
                placeholder="e.g. Cash collected at yard"
                value={form.comments}
                onChange={handleChange("comments")}
                error={!!errors.comments}
                helperText={errors.comments}
                multiline
                minRows={6}
              />
            </Box>
          </Box>

          {/* Actions */}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ mt: 3, justifyContent: "flex-end" }}
          >
            <Button
              type="button"
              variant="outlined"
              onClick={handleClear}
              sx={{
                py: 1,
                minWidth: 110,
                fontWeight: 600,
                textTransform: "none",
                color: "#097aa2",
                borderColor: "#097aa2",
                "&:hover": {
                  borderColor: "#075f7e",
                  backgroundColor: "rgba(9,122,162,0.06)",
                },
              }}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                py: 1,
                minWidth: 110,
                fontWeight: 600,
                textTransform: "none",
                backgroundColor: "#097aa2",
                "&:hover": { backgroundColor: "#075f7e" },
              }}
            >
              Submit
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Confirmation popup */}
      <Dialog
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a" }}>
          Confirm Cash Receipt
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Please review the details before saving.
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1.2}>
            {[
              { label: "Driver / Partner ID", value: form.driverOrPartnerId },
              { label: "Cab Number", value: form.cabNumber },
              {
                label: "Amount",
                value: `₹${Number(form.amount || 0).toFixed(2)}`,
              },
              { label: "Comments", value: form.comments },
              { label: "Source", value: SOURCE },
            ].map((row) => (
              <Box
                key={row.label}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {row.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "#334155",
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
                  {row.value || "-"}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            sx={{ textTransform: "none", color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            variant="contained"
            sx={{
              textTransform: "none",
              backgroundColor: "#097aa2",
              "&:hover": { backgroundColor: "#075f7e" },
            }}
          >
            {submitting ? "Saving..." : "Confirm & Save"}
          </Button>
        </DialogActions>
      </Dialog>

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
