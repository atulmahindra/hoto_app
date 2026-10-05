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
  operatorType: string;
  cabNumber: string;
  driver: string;
  driverId: string;
  amount: string;
  comments: string;
}

interface Toast {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

const INITIAL_FORM: FormState = {
  operatorType: "",
  cabNumber: "",
  driver: "",
  driverId: "",
  amount: "",
  comments: "",
};

export default function CashReceipt() {
  const { user, getToken } = useAuth();
  const [mobileNo, setMobileNo] = useState("");
  const [fetchingDriver, setFetchingDriver] = useState(false);
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

  // Fetch driver details by mobile number
  const fetchDriverData = async (mobile: string) => {
    if (!/^\d{10}$/.test(mobile)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    setFetchingDriver(true);
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_HOST}/api/v1/cash-receipt/fetchdrivardata`,
        { source: SOURCE, mobileNo: mobile },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      console.log("fetchdrivardata", response.data);

      // Recursively find a key (case-insensitive) anywhere in the response
      const findValue = (obj: unknown, keys: string[]): string => {
        if (!obj || typeof obj !== "object") return "";
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (
            keys.includes(k.toLowerCase()) &&
            v != null &&
            typeof v !== "object"
          ) {
            return String(v);
          }
        }
        for (const v of Object.values(obj as Record<string, unknown>)) {
          if (v && typeof v === "object") {
            const found = findValue(v, keys);
            if (found) return found;
          }
        }
        return "";
      };

      const operatorType = findValue(response.data, [
        "operatortype",
        "operator_type",
      ]);
      const cabNumber = findValue(response.data, [
        "cabnumber",
        "cab_number",
        "vehicle_number",
        "vehiclenumber",
      ]).toUpperCase();
      const driver = findValue(response.data, [
        "driver",
        "driver_name",
        "drivername",
        "name",
      ]);
      const driverId = findValue(response.data, [
        "driverid",
        "driver_id",
        "driveridnumber",
        "driver_id_number",
      ]);

      console.log(
        "driver info:",
        operatorType,
        cabNumber,
        driver,
        driverId
      );

      setForm((prev) => ({
        ...prev,
        operatorType: operatorType || prev.operatorType,
        cabNumber: cabNumber || prev.cabNumber,
        driver: driver || prev.driver,
        driverId: driverId || prev.driverId,
      }));
      setErrors((prev) => ({
        ...prev,
        operatorType: undefined,
        cabNumber: undefined,
        driver: undefined,
        driverId: undefined,
      }));
    } catch (error) {
      const message =
        (axios.isAxiosError(error) &&
          (error.response?.data?.message as string)) ||
        "Failed to fetch driver data. Please try again.";
      showToast(message, "error");
      // Clear auto-filled values on error
      setForm((prev) => ({
        ...prev,
        operatorType: "",
        cabNumber: "",
        driver: "",
        driverId: "",
      }));
    } finally {
      setFetchingDriver(false);
    }
  };

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.operatorType.trim()) {
      next.operatorType = "Operator type is required.";
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
    setMobileNo("");
    setForm(INITIAL_FORM);
    setErrors({});
  };

  // Submit is enabled only when all required fields are valid
  const amountNum = Number(form.amount);
  const isFormValid =
    form.operatorType.trim() !== "" &&
    form.cabNumber.trim() !== "" &&
    form.amount !== "" &&
    !Number.isNaN(amountNum) &&
    amountNum > 0 &&
    form.comments.trim() !== "";

  // Step 2: confirm -> call the API and save
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        console.warn("No auth token found on user:", user);
      }

      const payload = {
        operatorType: form.operatorType.trim(),
        cabNumber: form.cabNumber.trim(),
        driver: form.driver.trim(),
        driverId: form.driverId.trim(),
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
                label="Mobile Number"
                placeholder="Enter 10-digit mobile number"
                value={mobileNo}
                onChange={(e) =>
                  setMobileNo(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                onBlur={() => {
                  if (mobileNo.length === 10) fetchDriverData(mobileNo);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchDriverData(mobileNo);
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => fetchDriverData(mobileNo)}
                          disabled={fetchingDriver || mobileNo.length !== 10}
                          sx={{
                            textTransform: "none",
                            color: "#097aa2",
                            minWidth: "auto",
                          }}
                        >
                          {fetchingDriver ? "..." : "Fetch"}
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Operator Type"
                placeholder="Auto-filled from mobile number"
                value={form.operatorType}
                error={!!errors.operatorType}
                helperText={errors.operatorType}
                slotProps={{
                  input: { readOnly: true },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Driver Name"
                placeholder="Auto-filled from mobile number"
                value={form.driver}
                error={!!errors.driver}
                helperText={errors.driver}
                slotProps={{
                  input: { readOnly: true },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Driver ID"
                placeholder="Auto-filled from mobile number"
                value={form.driverId}
                error={!!errors.driverId}
                helperText={errors.driverId}
                slotProps={{
                  input: { readOnly: true },
                }}
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
            <Box sx={{ flex: 1, width: "100%", alignSelf: "stretch" }}>
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
                minRows={9}
                sx={{
                  height: "100%",
                  "& .MuiInputBase-root": {
                    height: "100%",
                    alignItems: "flex-start",
                  },
                }}
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
              disabled={!isFormValid}
              sx={{
                py: 1,
                minWidth: 110,
                fontWeight: 600,
                textTransform: "none",
                backgroundColor: "#097aa2",
                "&:hover": { backgroundColor: "#075f7e" },
                "&.Mui-disabled": {
                  backgroundColor: "#cbd5e1",
                  color: "#ffffff",
                },
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
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: "#0f172a",
            pb: 1.5,
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #f8fafc 0%, #ebf7fb 100%)",
          }}
        >
          Cash Receipt Summary
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
          <Box
            sx={{
              border: "1px solid #dbeafe",
              borderRadius: 2,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              p: 2,
              mb: 2,
            }}
          >

            <Stack spacing={1.1}>
              {[
                { label: "Driver Name", value: form.driver },
                { label: "Mobile Number", value: mobileNo },
                { label: "Operator Type", value: form.operatorType },
                { label: "Driver ID", value: form.driverId },
                { label: "Cab Number", value: form.cabNumber },
                { label: "Comments", value: form.comments },
              ].map((row, index, rows) => (
                <Box
                  key={row.label}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                    py: 0.7,
                    borderBottom:
                      index < rows.length - 1 ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#64748b", fontWeight: 500 }}
                  >
                    {row.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: "#0f172a",
                      textAlign: "right",
                      overflowWrap: "anywhere",
                      maxWidth: "58%",
                    }}
                  >
                    {row.value || "-"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#e0f2fe",
              border: "1px solid #bae6fd",
              borderRadius: 2,
              px: 2,
              py: 1.2,
            }}
          >
            <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
              Total Amount
            </Typography>
            <Typography variant="h6" sx={{ color: "#097aa2", fontWeight: 800 }}>
              ₹{Number(form.amount || 0).toFixed(2)}
            </Typography>
          </Box>
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
