"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import axios from "axios";

// ─── Transaction Type Master ────────────────────────────────────────────────
const TRANSACTION_TYPES = [
  "TOLL_CHARGES",
  "AIRPORT_CONVENIENCE_FEE",
  "DRIVER_PAYOUT",
  "CGST_TO_PLATFORM",
  "SGST_TO_PLATFORM",
  "EARNINGS",
  "SGST_TO_DRIVER",
  "DRIVER_CONVENIENCE",
  "TRIP_RUNNING_FARE",
  "AIRPORT_PARKING_FEE",
  "TRIP_FARE",
  "OTHER_CHARGES",
  "CGST_TO_CUSTOMER",
  "TDS_DEDUCTION",
  "CGST_TO_DRIVER",
  "CALLCENTER_FEE",
  "PLATFORM_FEE",
  "REVENUE_PLAN_FEE",
  "SGST_TO_CUSTOMER",
  "WAITING_CHARGES",
] as const;

const VALID_DR_CR = ["DR", "CR"] as const;
const VALID_ENTITY_TYPES = ["Driver", "Vehicle"] as const;

const REQUIRED_COLUMNS = [
  "DR/CR",
  "Transaction Type",
  "Amount in Document Currency",
  "Entity Type",
  "Entity ID",
  "Trip ID",
  "Text",
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface UploadRow {
  rowNumber: number;
  drCr: string;
  transactionType: string;
  amount: string | number;
  entityType: string;
  entityId: string | number;
  tripId: string;
  text: string;
}

interface ValidationError {
  rowNumber: number;
  entityType: string;
  entityId: string | number;
  transactionType: string;
  amount: string | number;
  errorCode: string;
  errorDescription: string;
}

interface ProcessedRow extends UploadRow {
  status: "success" | "error";
  errors: string[];
}

type UploadStatus =
  | "idle"
  | "validating"
  | "validation_failed"
  | "processing"
  | "processed"
  | "partially_processed"
  | "posting_failed";

// ─── Component ──────────────────────────────────────────────────────────────
export default function HotoUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [parsedRows, setParsedRows] = useState<UploadRow[]>([]);
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [structureError, setStructureError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Summary counts
  const summary = useMemo(() => {
    const total = processedRows.length;
    const successful = processedRows.filter((r) => r.status === "success").length;
    const failed = processedRows.filter((r) => r.status === "error").length;
    return { total, successful, failed };
  }, [processedRows]);

  // ─── Template Download ──────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "DR/CR": "DR",
        "Transaction Type": "TOLL_CHARGES",
        "Amount in Document Currency": 913.32,
        "Entity Type": "Vehicle",
        "Entity ID": "3994",
        "Trip ID": "",
        Text: "Trip started and ended mistakenly – reverse commission",
      },
      {
        "DR/CR": "CR",
        "Transaction Type": "DRIVER_PAYOUT",
        "Amount in Document Currency": 1347.16,
        "Entity Type": "Driver",
        "Entity ID": "10108360",
        "Trip ID": "",
        Text: "Penalty to driver due to accident",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Upload Template");

    // Set column widths
    ws["!cols"] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 28 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 55 },
    ];

    XLSX.writeFile(wb, "HOTO_Upload_Template.xlsx");
  };

  // ─── File Parsing ───────────────────────────────────────────────────────
  const parseExcelFile = useCallback((file: File) => {
    setStructureError("");
    setValidationErrors([]);
    setProcessedRows([]);
    setParsedRows([]);
    setUploadStatus("validating");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: "",
        });

        if (jsonData.length === 0) {
          setStructureError("The uploaded file contains no data rows.");
          setUploadStatus("validation_failed");
          return;
        }

        // Validate columns
        const fileColumns = Object.keys(jsonData[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !fileColumns.includes(col)
        );

        if (missingColumns.length > 0) {
          setStructureError(
            `Missing required columns: ${missingColumns.join(", ")}`
          );
          setUploadStatus("validation_failed");
          return;
        }

        // Map rows
        const rows: UploadRow[] = jsonData.map((row, idx) => ({
          rowNumber: idx + 2, // Excel row (header is row 1)
          drCr: String(row["DR/CR"] ?? "").trim(),
          transactionType: String(row["Transaction Type"] ?? "").trim(),
          amount: row["Amount in Document Currency"] as string | number ?? "",
          entityType: String(row["Entity Type"] ?? "").trim(),
          entityId: row["Entity ID"] as string | number ?? "",
          tripId: String(row["Trip ID"] ?? "").trim(),
          text: String(row["Text"] ?? "").trim(),
        }));

        setParsedRows(rows);
        validateAndProcess(rows);
      } catch {
        setStructureError(
          "Failed to parse the uploaded file. Please ensure it is a valid .xlsx or .xls file."
        );
        setUploadStatus("validation_failed");
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  // ─── Validation ─────────────────────────────────────────────────────────
  const validateAndProcess = async (rows: UploadRow[]) => {
    const errors: ValidationError[] = [];
    const processed: ProcessedRow[] = [];

    for (const row of rows) {
      const rowErrors: string[] = [];

      // DR/CR validation
      if (!row.drCr) {
        rowErrors.push("DR/CR is required.");
      } else if (!VALID_DR_CR.includes(row.drCr as "DR" | "CR")) {
        rowErrors.push(
          `Invalid DR/CR value: "${row.drCr}". Only "DR" or "CR" are accepted.`
        );
      }

      // Transaction Type validation
      if (!row.transactionType) {
        rowErrors.push("Transaction Type is required.");
      } else if (
        !TRANSACTION_TYPES.includes(row.transactionType as (typeof TRANSACTION_TYPES)[number])
      ) {
        rowErrors.push(
          `Invalid Transaction Type: "${row.transactionType}". Not found in B2C Transaction Type Master.`
        );
      }

      // Amount validation
      const amountNum = Number(row.amount);
      if (row.amount === "" || row.amount === null || row.amount === undefined) {
        rowErrors.push("Amount is required.");
      } else if (isNaN(amountNum)) {
        rowErrors.push(`Invalid Amount: "${row.amount}". Must be a valid number.`);
      } else if (amountNum === 0) {
        rowErrors.push("Amount cannot be zero.");
      } else if (amountNum < 0) {
        rowErrors.push("Amount cannot be negative.");
      }

      // Entity Type validation
      if (!row.entityType) {
        rowErrors.push("Entity Type is required.");
      } else if (
        !VALID_ENTITY_TYPES.includes(row.entityType as "Driver" | "Vehicle")
      ) {
        rowErrors.push(
          `Invalid Entity Type: "${row.entityType}". Only "Driver" or "Vehicle" are accepted.`
        );
      }

      // Entity ID validation
      if (!row.entityId && row.entityId !== 0) {
        rowErrors.push("Entity ID is required.");
      }

      // Text validation
      if (!row.text) {
        rowErrors.push("Text is required.");
      }

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: row.entityType,
          entityId: row.entityId,
          transactionType: row.transactionType,
          amount: row.amount,
          errorCode: "VALIDATION_ERROR",
          errorDescription: rowErrors.join(" | "),
        });
        processed.push({ ...row, status: "error", errors: rowErrors });
      } else {
        processed.push({ ...row, status: "success", errors: [] });
      }
    }

    setValidationErrors(errors);
    setProcessedRows(processed);

    if (errors.length === rows.length) {
      setUploadStatus("validation_failed");
    } else if (errors.length > 0) {
      setUploadStatus("partially_processed");
    } else {
      setUploadStatus("processed");
    }
  };

  // ─── Post Valid Records ─────────────────────────────────────────────────
  const postValidRecords = async () => {
    const validRows = processedRows.filter((r) => r.status === "success");
    if (validRows.length === 0) return;

    setUploadStatus("processing");
    try {
      const payload = {
        posting_date: new Date().toISOString().split("T")[0],
        records: validRows.map((row) => ({
          dr_cr: row.drCr,
          transaction_type: row.transactionType,
          amount: Number(row.amount),
          entity_type: row.entityType,
          entity_id: String(row.entityId),
          trip_id: row.tripId || null,
          text: row.text,
        })),
      };

      const response = await axios.post(
        "https://alytehotoapi.mllqa.com/api/v1/vehicle/manual-upload",
        payload
      );

      console.log("Upload response:", response.data);
      setUploadStatus("processed");
    } catch (error) {
      console.error("Failed to post records:", error);
      setUploadStatus("posting_failed");
    }
  };

  // ─── File Input Handling ────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
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

  // ─── Download Error Report ──────────────────────────────────────────────
  const handleDownloadErrorReport = () => {
    if (validationErrors.length === 0) return;

    const reportData = validationErrors.map((err) => ({
      "Excel Row Number": err.rowNumber,
      "Entity Type": err.entityType,
      "Entity ID": err.entityId,
      "Transaction Type": err.transactionType,
      Amount: err.amount,
      "Error Code": err.errorCode,
      "Error Description": err.errorDescription,
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Error Report");
    XLSX.writeFile(wb, "HOTO_Upload_Error_Report.xlsx");
  };

  // ─── Reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFileName("");
    setUploadStatus("idle");
    setParsedRows([]);
    setProcessedRows([]);
    setValidationErrors([]);
    setStructureError("");
  };

  // ─── Status Color ──────────────────────────────────────────────────────
  const getStatusChip = () => {
    switch (uploadStatus) {
      case "idle":
        return null;
      case "validating":
        return <Chip label="Validating..." color="info" size="small" />;
      case "validation_failed":
        return <Chip label="Validation Failed" color="error" size="small" />;
      case "processing":
        return <Chip label="Processing..." color="info" size="small" />;
      case "processed":
        return <Chip label="Processed" color="success" size="small" />;
      case "partially_processed":
        return <Chip label="Partially Processed" color="warning" size="small" />;
      case "posting_failed":
        return <Chip label="Posting Failed" color="error" size="small" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ p: 2.5, width: "100%", maxWidth: 1360 }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Manual Credit/Debit Upload
            </Typography>
            {getStatusChip()}
          </Stack>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            size="small"
          >
            Download Template
          </Button>
        </Stack>

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

        {/* Structure Error */}
        {structureError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {structureError}
          </Alert>
        )}

        {/* Processing Indicator */}
        {(uploadStatus === "validating" || uploadStatus === "processing") && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        {/* Summary */}
        {processedRows.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ gap: 3, alignItems: { sm: "center" } }}
            >
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Total Records:
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{summary.total}</Typography>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Successful:
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "#16a34a" }}>
                  {summary.successful}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <ErrorIcon sx={{ color: "#dc2626", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Failed:
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "#dc2626" }}>
                  {summary.failed}
                </Typography>
              </Stack>

              <Box sx={{ ml: { sm: "auto" } }}>
                <Stack direction="row" sx={{ gap: 1 }}>
                  {validationErrors.length > 0 && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadErrorReport}
                    >
                      Error Report
                    </Button>
                  )}
                  {processedRows.filter((r) => r.status === "success").length > 0 &&
                    uploadStatus !== "processed" &&
                    uploadStatus !== "processing" && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={postValidRecords}
                      >
                        Submit to SAP
                      </Button>
                    )}
                  <Button variant="outlined" size="small" onClick={handleReset}>
                    Upload New File
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Error Table */}
        {validationErrors.length > 0 && (
          <>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "#b91c1c", mb: 1 }}
            >
              Validation Errors ({validationErrors.length})
            </Typography>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 360, overflow: "auto", borderRadius: 2, mb: 3 }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      "Row",
                      "Entity Type",
                      "Entity ID",
                      "Transaction Type",
                      "Amount",
                      "Error Description",
                    ].map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          fontWeight: 700,
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationErrors.map((err, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{err.rowNumber}</TableCell>
                      <TableCell>{err.entityType || "-"}</TableCell>
                      <TableCell>{err.entityId || "-"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {err.transactionType || "-"}
                      </TableCell>
                      <TableCell>{err.amount || "-"}</TableCell>
                      <TableCell sx={{ color: "#b91c1c", maxWidth: 400 }}>
                        {err.errorDescription}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Success Table */}
        {processedRows.filter((r) => r.status === "success").length > 0 && (
          <>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "#166534", mb: 1 }}
            >
              Successful Records (
              {processedRows.filter((r) => r.status === "success").length})
            </Typography>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 360, overflow: "auto", borderRadius: 2 }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      "Row",
                      "DR/CR",
                      "Transaction Type",
                      "Amount",
                      "Entity Type",
                      "Entity ID",
                      "Trip ID",
                      "Text",
                    ].map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          fontWeight: 700,
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedRows
                    .filter((r) => r.status === "success")
                    .map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.drCr}
                            sx={{
                              fontWeight: 700,
                              ...(row.drCr === "DR"
                                ? {
                                    color: "#b91c1c",
                                    backgroundColor: "#fee2e2",
                                    border: "1px solid #fca5a5",
                                  }
                                : {
                                    color: "#166534",
                                    backgroundColor: "#dcfce7",
                                    border: "1px solid #86efac",
                                  }),
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {row.transactionType}
                        </TableCell>
                        <TableCell>{row.amount}</TableCell>
                        <TableCell>{row.entityType}</TableCell>
                        <TableCell>{row.entityId}</TableCell>
                        <TableCell>{row.tripId || "-"}</TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>{row.text}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </Box>
  );
}
