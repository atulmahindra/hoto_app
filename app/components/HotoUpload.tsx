"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  LinearProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import { HOTO_API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

interface Toast {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function HotoUpload() {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [parseError, setParseError] = useState("");

  const [apiUploadStatus, setApiUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [apiUploadSummary, setApiUploadSummary] = useState<{
    totalRows: number;
    successCount: number;
    failedCount: number;
  } | null>(null);

  // ─── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: "",
    severity: "success",
  });
  const showToast = (message: string, severity: "success" | "error") =>
    setToast({ open: true, message, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // ─── Template Download ──────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const token = getToken();
      const response = await axios.get(
        `${HOTO_API_BASE_URL}/api/v1/financial/manual-adjustment/template`,
        {
          responseType: "blob",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const fileNameMatch = disposition?.match(/filename="?([^";]+)"?/i);
      const downloadFileName =
        fileNameMatch?.[1]?.trim() || "manual-adjustment-template.xlsx";

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download template:", error);
      showToast("Failed to download the template. Please try again.", "error");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // ─── Excel Upload ────────────────────────────────────────────────────────
  const handleApiUpload = async () => {
    if (!pendingFile) return;
    setApiUploadStatus("uploading");
    setApiUploadSummary(null);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", pendingFile);

      const response = await axios.post(
        `${HOTO_API_BASE_URL}/api/v1/financial/manual-adjustment/upload-excel`,
        formData,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          responseType: "blob",
        }
      );

      const contentType = (response.headers["content-type"] as string) || "";

      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        const json = JSON.parse(text);
        setApiUploadSummary(json.data ?? null);
        showToast(json.message || "Upload processed.", "success");
        setApiUploadStatus("success");
      } else {
        const disposition = response.headers["content-disposition"] as
          | string
          | undefined;
        const fileNameMatch = disposition?.match(/filename="?([^";]+)"?/i);
        const downloadFileName =
          fileNameMatch?.[1]?.trim() || "processed_response.xlsx";

        const blobUrl = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        showToast(
          `Some rows failed. Downloaded "${downloadFileName}" with details.`,
          "success"
        );
        setApiUploadStatus("success");
      }
    } catch (error) {
      console.error("Failed to upload Excel via API:", error);
      showToast("Failed to upload the file. Please try again.", "error");
      setApiUploadStatus("error");
    }
  };

  // ─── File Parsing (preview only, no API call) ───────────────────────────
  const parseExcelFile = (file: File) => {
    setParseError("");
    setPreviewColumns([]);
    setPreviewRows([]);
    setApiUploadStatus("idle");
    setApiUploadSummary(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          { defval: "" }
        );

        if (jsonData.length === 0) {
          setParseError("The uploaded file contains no data rows.");
          setPendingFile(null);
          return;
        }

        setPreviewColumns(Object.keys(jsonData[0]));
        setPreviewRows(jsonData);
        setPendingFile(file);
      } catch {
        setParseError(
          "Failed to parse the uploaded file. Please ensure it is a valid .xlsx or .xls file."
        );
        setPendingFile(null);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ─── File Input Handling ────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcelFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ─── Reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFileName("");
    setPendingFile(null);
    setPreviewColumns([]);
    setPreviewRows([]);
    setParseError("");
    setApiUploadStatus("idle");
    setApiUploadSummary(null);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ p: 2.5, width: "100%", maxWidth: 1360 }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            justifyContent: "flex-end",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            size="small"
          >
            {isDownloadingTemplate ? "Downloading..." : "Download Template"}
          </Button>
        </Stack>

        {apiUploadStatus === "success" && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleReset}>
                Upload New File
              </Button>
            }
          >
            {apiUploadSummary
              ? `Total: ${apiUploadSummary.totalRows}, Success: ${apiUploadSummary.successCount}, Failed: ${apiUploadSummary.failedCount}`
              : "File uploaded successfully."}
          </Alert>
        )}

        {/* Upload Area */}
        <Paper
          variant="outlined"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 2,
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: isDragging ? "#1976d2" : "#cbd5e1",
            backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            "&:hover": { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleFileChange}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ fontWeight: 600, color: "#334155" }}>
            {fileName || "Drag & drop your Excel file here, or click to browse"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            Accepted formats: .xlsx, .xls
          </Typography>
        </Paper>

        {/* Parse Error */}
        {parseError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {/* Processing Indicator */}
        {apiUploadStatus === "uploading" && <LinearProgress sx={{ mb: 2 }} />}

        {/* Preview Table + Upload Button */}
        {previewRows.length > 0 && apiUploadStatus !== "success" && (
          <>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#334155" }}>
                Preview ({previewRows.length} rows)
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={handleApiUpload}
                disabled={apiUploadStatus === "uploading"}
              >
                {apiUploadStatus === "uploading" ? "Uploading..." : "Upload"}
              </Button>
            </Stack>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 420, overflow: "auto", borderRadius: 2 }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {previewColumns.map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          fontWeight: 700,
                          backgroundColor: "#e4e4e7",
                          color: "#71717a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={idx} hover>
                      {previewColumns.map((col) => (
                        <TableCell key={col} sx={{ whiteSpace: "nowrap" }}>
                          {String(row[col] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

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
