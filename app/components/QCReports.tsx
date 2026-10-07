"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  ButtonBase,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  IconButton,
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
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import Datepicker, { DateRangeType } from "react-advance-datepicker";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL, QC_API_BASE_URL } from "../config/api";

const API_HOST = API_BASE_URL;
const QC_API_HOST = QC_API_BASE_URL;

type SortDirection = "asc" | "desc";

type AuditRow = Record<string, unknown>;

const QUESTIONS_KEY = "questions";
const ACTION_COLUMN_WIDTH = 112;
const OPS_AUDIT_COLUMN_LABELS: Record<string, string> = {
  audit_id: "Audit Number",
  auditid: "Audit Number",
  audit_number: "Audit Number",
  audit_no: "Audit Number",
  auditnumber: "Audit Number",
  date_submitted: "Date Submitted",
  submitted_at: "Date Submitted",
  submitted_date: "Date Submitted",
  submission_date: "Date Submitted",
  created_at: "Date Submitted",
  score: "Score",
  score_percentage: "Score %",
  score_percent: "Score %",
  score_pct: "Score %",
  "score %": "Score %",
  vehicle_id: "Vehicle ID",
  vehicle_number: "Vehicle No",
  vehicle_no: "Vehicle No",
  driver_id: "Driver ID",
  driver_name: "Driver Name",
  driver_mobile_no: "Driver Mobile No",
  driver_mobile_number: "Driver Mobile No",
  driver_mobile: "Driver Mobile No",
  captured_by_id: "Captured By ID",
  captured_by_name: "Captured By Name",
};
const OPS_AUDIT_TABLE_COLUMNS = new Set(Object.keys(OPS_AUDIT_COLUMN_LABELS));
const QC_360_TABLE_COLUMNS = new Set([
  "audit_id",
  "auditid",
  "audit_number",
  "audit_no",
  "auditnumber",
  "date_submitted",
  "submitted_at",
  "submitted_date",
  "submission_date",
  "created_at",
  "score",
  "score_percentage",
  "score_percent",
  "score_pct",
  "score %",
  "vehicle_id",
  "vehicle_number",
  "vehicle_no",
  "driver_id",
  "driver_name",
  "driver_mobile_no",
  "driver_mobile_number",
  "driver_mobile",
  "captured_by_id",
  "captured_by_name",
]);
const normalizeOpsAuditColumnKey = (key: string) =>
  key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const INSPECTION_COLUMNS = new Set([
  "front_exterior",
  "rear_exterior",
  "left_side_panels",
  "left_fender",
  "mirrors",
  "lighting",
  "stepney",
  "interior",
  "right_side_panels",
  "right_fender",
]);

const AUDIT_TYPE_OPTIONS = [
  { value: "OPS_AUDIT", label: "Ops Audit" },
  { value: "QC_360", label: "QC 360" },
  { value: "SAFETY_ENGAGEMENT", label: "Safety Engagement" },
  { value: "SAFETY_BRIEFING", label: "Safety Briefing" },
];

interface CityItem {
  id: string | number;
  city_name: string;
}

const formatColumnLabel = (key: string) =>
  String(key)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const renderTableCellValue = (value: unknown): React.ReactNode => {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return "-";
  }
  return value as React.ReactNode;
};

const formatOpsAuditColumnLabel = (key: string) =>
  OPS_AUDIT_COLUMN_LABELS[key.toLowerCase()] ??
  OPS_AUDIT_COLUMN_LABELS[normalizeOpsAuditColumnKey(key)] ??
  formatColumnLabel(key);

const isBriefingPhotoColumn = (key: string) =>
  formatColumnLabel(key).toLowerCase() === "briefing photo";

const isActivityPhotoColumn = (key: string) =>
  formatColumnLabel(key).toLowerCase() === "activity photo";

const isPhotoColumn = (key: string) =>
  isBriefingPhotoColumn(key) || isActivityPhotoColumn(key);

const normalizeImageUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? trimmed : "";
  } catch {
    return "";
  }
};

const getImageUrls = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getImageUrls);
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.flatMap(getImageUrls);
    }
  } catch {
    // Continue with plain URL parsing.
  }

  const matches = trimmed.match(/https?:\/\/[^\s,]+/g);
  const candidates = matches ?? trimmed.split(/[,\n]+/);

  return Array.from(
    new Set(candidates.map(normalizeImageUrl).filter(Boolean))
  );
};

const getBriefingPhotoUrlsFromRow = (row: AuditRow | null): string[] => {
  if (!row) return [];

  return Array.from(
    new Set(
      Object.entries(row)
        .filter(([key]) => isBriefingPhotoColumn(key))
        .flatMap(([, value]) => getImageUrls(value))
    )
  );
};

function EmptyBriefingPhoto() {
  return (
    <Box
      sx={{
        width: 54,
        height: 40,
        borderRadius: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        border: "1px solid #cbd5e1",
        backgroundColor: "#f8fafc",
      }}
    >
      <ImageNotSupportedIcon fontSize="small" />
    </Box>
  );
}

function PhotoThumbnail({
  imageUrl,
  index,
  onClick,
}: {
  imageUrl: string;
  index: number;
  onClick: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return <EmptyBriefingPhoto />;
  }

  return (
    <ButtonBase
      type="button"
      onClick={onClick}
      aria-label={`View audit photo ${index + 1}`}
      sx={{
        display: "inline-flex",
        lineHeight: 0,
        borderRadius: 1,
        "&:focus-visible": { outline: "2px solid #097aa2", outlineOffset: 2 },
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt={`Audit photo ${index + 1}`}
        loading="lazy"
        onError={() => setHasError(true)}
        sx={{
          width: 54,
          height: 40,
          borderRadius: 1,
          objectFit: "cover",
          border: "1px solid #cbd5e1",
          backgroundColor: "#f8fafc",
        }}
      />
    </ButtonBase>
  );
}

function BriefingPhotoPreview({
  imageUrl,
  height = 240,
}: {
  imageUrl: string;
  height?: number | string;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState("");

  if (!imageUrl || failedImageUrl === imageUrl) {
    return (
      <Box
        sx={{
          height,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          border: "1px dashed #cbd5e1",
          backgroundColor: "#f8fafc",
        }}
      >
        <Stack spacing={0.5} sx={{ alignItems: "center" }}>
          <ImageNotSupportedIcon />
          <Typography variant="body2">No image available</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={imageUrl}
      alt="Audit photo preview"
      onError={() => setFailedImageUrl(imageUrl)}
      sx={{
        width: "100%",
        height,
        borderRadius: 2,
        objectFit: "contain",
        border: "1px solid #cbd5e1",
        backgroundColor: "#f8fafc",
      }}
    />
  );
}

function PhotoColumnCell({
  value,
  onImageClick,
}: {
  value: unknown;
  onImageClick: (imageUrls: string[], index: number) => void;
}) {
  const imageUrls = getImageUrls(value);
  const visibleImages = imageUrls.slice(0, 3);
  const extraCount = Math.max(imageUrls.length - visibleImages.length, 0);

  if (visibleImages.length === 0) {
    return <EmptyBriefingPhoto />;
  }

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      {visibleImages.map((imageUrl, index) => (
        <PhotoThumbnail
          key={imageUrl}
          imageUrl={imageUrl}
          index={index}
          onClick={() => onImageClick(imageUrls, index)}
        />
      ))}
      {extraCount > 0 && (
        <Chip
          size="small"
          label={`+${extraCount}`}
          onClick={() => onImageClick(imageUrls, visibleImages.length)}
          sx={{
            height: 24,
            fontWeight: 700,
            color: "#097aa2",
            backgroundColor: "rgba(9,122,162,0.12)",
            cursor: "pointer",
          }}
        />
      )}
    </Box>
  );
}

const normalizeRecords = (payload: unknown): AuditRow[] => {
  if (Array.isArray(payload)) return payload as AuditRow[];

  if (!payload || typeof payload !== "object") return [];

  const source = payload as Record<string, unknown>;
  const possible = [source.data, source.records, source.items, source.rows];
  for (const item of possible) {
    if (Array.isArray(item)) return item as AuditRow[];
  }

  if (source && typeof source === "object") {
    const nested = Object.values(source).find((value) => Array.isArray(value));
    if (nested) return nested as AuditRow[];
  }

  return [];
};

const normalizeTotalCount = (payload: unknown, fallback: number): number => {
  if (!payload || typeof payload !== "object") return fallback;

  const source = payload as Record<string, unknown>;
  const pagination = source.pagination as Record<string, unknown> | undefined;
  const candidates = [
    source.total,
    source.totalCount,
    source.count,
    source.totalRecords,
    source.total_count,
    pagination?.total,
  ];

  for (const item of candidates) {
    const value = Number(item);
    if (!Number.isNaN(value)) return value;
  }

  return fallback;
};

export default function QCReports() {
  const { getToken } = useAuth();
  const [auditType, setAuditType] = useState("SAFETY_BRIEFING");
  const [auditRecords, setAuditRecords] = useState<AuditRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRow, setSelectedRow] = useState<AuditRow | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imageViewer, setImageViewer] = useState<{
    imageUrls: string[];
    photoIndex: number;
  } | null>(null);
      const [cityList, setCityList] = useState<CityItem[]>([]);
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateValue, setDateValue] = useState<DateRangeType>({
    startDate: null,
    endDate: null,
  });
  const DEFAULT_PAGE_SIZE = 20;
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [activeShortcut, setActiveShortcut] = useState("1 Month");

  useEffect(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setDateValue({ startDate: start, endDate: new Date() });
  }, []);

  useEffect(() => {
    const fetchCityList = async () => {
      try {
        const response = await axios.post(`${API_HOST}/api/v1/master/citylist`, {});
        const data = response.data.data;
        const source = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        setCityList(source);
      } catch (error) {
        console.error("Failed to fetch city list:", error);
      }
    };
    fetchCityList();
  }, []);

  useEffect(() => {
    const applyHighlight = () => {
      const buttons = document.querySelectorAll<HTMLElement>(".hoto-datepicker li");
      buttons.forEach((btn) => {
        if (btn.textContent?.trim() === activeShortcut && activeShortcut) {
          btn.classList.add("hoto-shortcut-active");
        } else {
          btn.classList.remove("hoto-shortcut-active");
        }
      });
    };

    applyHighlight();
    const observer = new MutationObserver(applyHighlight);
    const container = document.querySelector(".hoto-datepicker");
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [activeShortcut]);

  const datePickerConfigs = useMemo(() => {
    const today = new Date();
    const buildRange = (days: number) => {
      const start = new Date();
      start.setDate(start.getDate() - days);
      return { start, end: today };
    };

    const trackClick = (text: string) => () =>
      setTimeout(() => setActiveShortcut(text), 0);

    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      shortcuts: {
        todayRange: {
          text: "Today",
          period: { start: today, end: today },
          onClick: trackClick("Today"),
        },
        last7Days: {
          text: "7 Days",
          period: buildRange(7),
          onClick: trackClick("7 Days"),
        },
        last15Days: {
          text: "15 Days",
          period: buildRange(15),
          onClick: trackClick("15 Days"),
        },
        lastMonth: {
          text: "Last Month",
          period: { start: lastMonthStart, end: lastMonthEnd },
          onClick: trackClick("Last Month"),
        },
        oneMonth: {
          text: "1 Month",
          period: buildRange(30),
          onClick: trackClick("1 Month"),
        },
        last3Months: {
          text: "3 Months",
          period: buildRange(90),
          onClick: trackClick("3 Months"),
        },
        last6Months: {
          text: "6 Months",
          period: buildRange(180),
          onClick: trackClick("6 Months"),
        },
        last9Months: {
          text: "9 Months",
          period: buildRange(270),
          onClick: trackClick("9 Months"),
        },
        last1Year: {
          text: "1 Year",
          period: buildRange(365),
          onClick: trackClick("1 Year"),
        },
      },
    };
  }, []);

  const dateRange = useMemo(
    () => ({
      fromDate: dateValue?.startDate
        ? dayjs(dateValue.startDate).format("YYYY-MM-DD")
        : "",
      toDate: dateValue?.endDate
        ? dayjs(dateValue.endDate).format("YYYY-MM-DD")
        : "",
    }),
    [dateValue]
  );

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = getToken();
        const requestPage = Math.max(1, currentPage + 1);
        const requestLimit = pageSize || DEFAULT_PAGE_SIZE;

        const payload = {
          format: "json",
          startDate: dateRange.fromDate || "2024-01-01",
          endDate: dateRange.toDate || "2024-12-31",
          page: requestPage,
          limit: requestLimit,
        };

        const response = await axios.post(
          `${QC_API_HOST}/api/v1/qc/reports/${auditType}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        const rows = normalizeRecords(response.data);
        const total = normalizeTotalCount(response.data, rows.length);
        setAuditRecords(rows);
        setTotalRecords(total);
      } catch (error) {
        console.error(`Failed to fetch ${auditType}:`, error);
        setAuditRecords([]);
        setTotalRecords(0);
      }
    };

    fetchReport();
  }, [auditType, dateRange.fromDate, dateRange.toDate, currentPage, pageSize, getToken]);

  const tableData = auditRecords;
  const columns = useMemo(() => Object.keys(tableData[0] || {}), [tableData]);
  const useCompactTable = auditType === "OPS_AUDIT" || auditType === "QC_360";

  const displayColumns = useMemo(() => {
    if (columns.length === 0) return [];
    const summaryColumns = new Set([
      "driver_id",
      "vehicle_number",
      "city",
      "location",
      "audit_date",
    ]);
    const baseVisible = columns.filter((col) => {
      const normalizedColumn = col.toLowerCase();
      const normalizedOpsColumn = normalizeOpsAuditColumnKey(col);
      return (
        (auditType === "OPS_AUDIT" ||
          auditType === "QC_360" ||
          normalizedOpsColumn !== "audit_id") &&
        (auditType === "OPS_AUDIT" ||
          auditType === "QC_360" ||
          normalizedOpsColumn !== "auditid") &&
        normalizedColumn !== QUESTIONS_KEY &&
        !INSPECTION_COLUMNS.has(normalizedColumn)
      );
    });
    const visible = useCompactTable
      ? baseVisible.filter((col) => {
          const normalizedColumn = col.toLowerCase();
          return (
            summaryColumns.has(normalizedColumn) ||
            (auditType === "OPS_AUDIT" &&
              OPS_AUDIT_TABLE_COLUMNS.has(normalizeOpsAuditColumnKey(col))) ||
            (auditType === "QC_360" &&
              QC_360_TABLE_COLUMNS.has(normalizeOpsAuditColumnKey(col))) ||
            normalizedColumn === "final_status" ||
            isPhotoColumn(col)
          );
        })
      : baseVisible;
    const finalStatusKey = visible.find((col) => col === "final_status");
    if (!finalStatusKey) return visible;
    return [...visible.filter((col) => col !== finalStatusKey), finalStatusKey];
  }, [auditType, columns, useCompactTable]);

  const hasPhotoColumn = displayColumns.some(isPhotoColumn);
  const showActionColumn =
    auditType !== "SAFETY_BRIEFING" && !hasPhotoColumn;
  const stickyActionColumn = useCompactTable && showActionColumn;
  const tableColSpan = Math.max(
    displayColumns.length + (showActionColumn ? 1 : 0),
    1
  );

  const locationOptions = useMemo(() => {
    const uniqueCities =
      cityList.length > 0 ? cityList.map((row) => row.city_name).filter(Boolean) : [];
    return ["All Locations", ...uniqueCities];
  }, [cityList]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tableData;

    return tableData.filter((row) =>
      columns.some((col) => String(row[col] ?? "").toLowerCase().includes(query))
    );
  }, [tableData, columns, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const valueA = a?.[sortKey] ?? "";
      const valueB = b?.[sortKey] ?? "";
      const numA = Number(valueA);
      const numB = Number(valueB);
      const bothNumbers =
        !Number.isNaN(numA) &&
        !Number.isNaN(numB) &&
        String(valueA).trim() !== "" &&
        String(valueB).trim() !== "";

      const compare = bothNumbers
        ? numA - numB
        : String(valueA).localeCompare(String(valueB), undefined, {
            numeric: true,
            sensitivity: "base",
          });
      return sortDirection === "asc" ? compare : -compare;
    });
    return rows;
  }, [filteredRows, sortKey, sortDirection]);

  const maxPage = Math.max(
    0,
    totalRecords > 0 ? Math.ceil(totalRecords / pageSize) - 1 : 0
  );
  const safePage = Math.min(currentPage, maxPage);
  const paginatedRows = sortedRows;
  const selectedPhotoUrls = useMemo(
    () => getBriefingPhotoUrlsFromRow(selectedRow),
    [selectedRow]
  );

  const hasTableData =
    (displayColumns.length > 0 || showActionColumn) && paginatedRows.length > 0;

  const handleSort = (column: string) => {
    if (sortKey === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(column);
    setSortDirection("asc");
  };

  const handleViewRow = (row: AuditRow) => {
    setPhotoIndex(0);
    setSelectedRow(row);
  };

  const handleCloseDrawer = () => {
    setSelectedRow(null);
    setPhotoIndex(0);
  };

  const showPreviousPhoto = () => {
    setPhotoIndex((current) =>
      selectedPhotoUrls.length > 0
        ? (current - 1 + selectedPhotoUrls.length) % selectedPhotoUrls.length
        : 0
    );
  };

  const showNextPhoto = () => {
    setPhotoIndex((current) =>
      selectedPhotoUrls.length > 0
        ? (current + 1) % selectedPhotoUrls.length
        : 0
    );
  };

  const handleOpenImageViewer = (imageUrls: string[], index: number) => {
    setImageViewer({ imageUrls, photoIndex: index });
  };

  const handleCloseImageViewer = () => setImageViewer(null);

  const showPreviousViewerPhoto = () => {
    setImageViewer((current) => {
      if (!current || current.imageUrls.length <= 1) return current;
      return {
        ...current,
        photoIndex:
          (current.photoIndex - 1 + current.imageUrls.length) %
          current.imageUrls.length,
      };
    });
  };

  const showNextViewerPhoto = () => {
    setImageViewer((current) => {
      if (!current || current.imageUrls.length <= 1) return current;
      return {
        ...current,
        photoIndex: (current.photoIndex + 1) % current.imageUrls.length,
      };
    });
  };

  const handleResetFilters = () => {
    setLocationFilter("All Locations");
    setSearchTerm("");
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setDateValue({ startDate: start, endDate: new Date() });
    setActiveShortcut("1 Month");
    setCurrentPage(0);
  };

  const handleDownloadExcel = () => {
    if (sortedRows.length === 0) return;

    const exportData = sortedRows.map((row) => {
      const record: Record<string, unknown> = {};
      displayColumns.forEach((col) => {
        let value: unknown = row[col] ?? "";
        if (INSPECTION_COLUMNS.has(col.toLowerCase())) {
          if (String(row[col]) === "1") value = "Ok";
          else if (String(row[col]) === "0") value = "Not Ok";
        }
        record[formatColumnLabel(col)] = value;
      });
      return record;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QC Reports");
    XLSX.writeFile(wb, `QC_Reports_${auditType}_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ p: 2.5, width: "100%", maxWidth: 1360 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
              <FormControl size="small" sx={{ width: { xs: "100%", sm: 200 } }}>
                <InputLabel id="qc-audit-type-label">Audit Type</InputLabel>
                <Select
                  labelId="qc-audit-type-label"
                  id="qc-audit-type"
                  value={auditType}
                  label="Audit Type"
                  onChange={(e) => {
                    setAuditType(e.target.value);
                    setCurrentPage(0);
                  }}
                >
                  {AUDIT_TYPE_OPTIONS.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                className="hoto-datepicker"
                sx={{
                  width: { xs: "100%", sm: 300 },
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Datepicker
                  value={dateValue}
                  onChange={(nextValue) => {
                    if (nextValue) {
                      setDateValue(nextValue);
                      setCurrentPage(0);
                    }
                  }}
                  useRange
                  showShortcuts
                  showFooter
                  configs={datePickerConfigs}
                  primaryColor="blue"
                  displayFormat="YYYY-MM-DD"
                  separator=" ~ "
                  placeholder="From Date ~ To Date"
                  startFrom={new Date()}
                  popoverDirection="down"
                  inputClassName="!h-[40px] w-full rounded border border-[rgba(0,0,0,0.23)] px-[14px] text-[0.875rem] text-[#334155] outline-none hover:border-[rgba(0,0,0,0.87)] focus:border-[#1976d2] focus:border-2 focus:px-[13px]"
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                ml: { sm: "auto" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <TextField
                size="small"
                label="Search"
                placeholder="Search any value..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                sx={{ width: { xs: "100%", sm: 220 } }}
              />
              <Tooltip title="Download Excel">
                <span>
                  <IconButton
                    onClick={handleDownloadExcel}
                    disabled={sortedRows.length === 0}
                    sx={{
                      height: 40,
                      width: 40,
                      border: "1px solid rgba(0,0,0,0.23)",
                      borderRadius: 1,
                      color: "#097aa2",
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                onClick={handleResetFilters}
                sx={{
                  height: 40,
                  minWidth: 100,
                  flexGrow: { xs: 1, sm: 0 },
                  backgroundColor: "#097aa2",
                  "&:hover": { backgroundColor: "#075f7e" },
                }}
              >
                Reset
              </Button>
            </Box>
          </Box>
        </Paper>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ minHeight: 360, maxHeight: 430, overflow: "auto", borderRadius: 2 }}
        >
          <Table stickyHeader size="small" aria-label="qc reports table">
            {hasTableData && (
              <TableHead>
                <TableRow>
                  {displayColumns.map((column) => (
                    <TableCell
                      key={column}
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        backgroundColor: "#e4e4e7",
                        color: "#71717a",
                        borderBottomColor: "#d4d4d8",
                        ...(column === "final_status"
                          ? {
                              position: "sticky",
                              right: stickyActionColumn ? ACTION_COLUMN_WIDTH : 0,
                              zIndex: 3,
                            }
                          : {}),
                      }}
                    >
                      <TableSortLabel
                        active={sortKey === column}
                        direction={sortKey === column ? sortDirection : "asc"}
                        onClick={() => handleSort(column)}
                        sx={{
                          color: "#71717a !important",
                          "&:hover": { color: "#71717a !important" },
                          "&.Mui-active": { color: "#71717a !important" },
                          "& .MuiTableSortLabel-icon": {
                            color: "#71717a !important",
                          },
                        }}
                      >
                        {auditType === "OPS_AUDIT" ||
                        (auditType === "QC_360" &&
                          QC_360_TABLE_COLUMNS.has(
                            normalizeOpsAuditColumnKey(column)
                          ))
                          ? formatOpsAuditColumnLabel(column)
                          : formatColumnLabel(column)}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  {showActionColumn && (
                    <TableCell
                      sx={{
                        ...(stickyActionColumn
                          ? {
                              position: "sticky",
                              right: 0,
                              zIndex: 4,
                              width: ACTION_COLUMN_WIDTH,
                              minWidth: ACTION_COLUMN_WIDTH,
                              maxWidth: ACTION_COLUMN_WIDTH,
                            }
                          : {}),
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        backgroundColor: "#e4e4e7",
                        color: "#71717a",
                        borderBottomColor: "#d4d4d8",
                      }}
                    >
                      Action
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => (
                  <TableRow
                    hover
                    key={`row-${safePage}-${index}`}
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: "#f8fafc" },
                      "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                      "&:hover": { backgroundColor: "#eef2ff" },
                    }}
                  >
                    {displayColumns.map((column) => (
                      <TableCell
                        key={`${column}-${safePage}-${index}`}
                        sx={{
                          whiteSpace: "nowrap",
                          color: "#334155",
                          borderBottomColor: "#e2e8f0",
                          ...(column === "final_status"
                            ? {
                                position: "sticky",
                                right: stickyActionColumn
                                  ? ACTION_COLUMN_WIDTH
                                  : 0,
                                zIndex: 2,
                                backgroundColor:
                                  index % 2 === 0 ? "#f8fafc" : "#ffffff",
                              }
                            : {}),
                        }}
                      >
                        {column === "final_status" ? (
                          <Chip
                            size="small"
                            label={String(row[column] ?? "-") || "-"}
                            sx={{
                              fontWeight: 700,
                              ...(String(row[column]).toLowerCase() === "accepted"
                                ? {
                                    color: "#166534",
                                    backgroundColor: "#dcfce7",
                                    border: "1px solid #86efac",
                                  }
                                : String(row[column]).toLowerCase() === "rejected"
                                  ? {
                                      color: "#b91c1c",
                                      backgroundColor: "#fee2e2",
                                      border: "1px solid #fca5a5",
                                    }
                                  : {
                                      color: "#334155",
                                      backgroundColor: "#e2e8f0",
                                      border: "1px solid #cbd5e1",
                                    }),
                            }}
                          />
                        ) : INSPECTION_COLUMNS.has(column.toLowerCase()) ? (
                          String(row[column]) === "1"
                            ? "Ok"
                            : String(row[column]) === "0"
                              ? "Not Ok"
                              : (row[column] as React.ReactNode) || "-"
                        ) : isPhotoColumn(column) ? (
                          <PhotoColumnCell
                            value={row[column]}
                            onImageClick={handleOpenImageViewer}
                          />
                        ) : (
                          renderTableCellValue(row[column])
                        )}
                      </TableCell>
                    ))}
                    {showActionColumn && (
                      <TableCell
                        sx={{
                          ...(stickyActionColumn
                            ? {
                                position: "sticky",
                                right: 0,
                                zIndex: 3,
                                width: ACTION_COLUMN_WIDTH,
                                minWidth: ACTION_COLUMN_WIDTH,
                                maxWidth: ACTION_COLUMN_WIDTH,
                              }
                            : {}),
                          whiteSpace: "nowrap",
                          backgroundColor:
                            index % 2 === 0 ? "#f8fafc" : "#ffffff",
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon fontSize="small" />}
                          onClick={() => handleViewRow(row)}
                          sx={{
                            textTransform: "none",
                            color: "#097aa2",
                            borderColor: "#097aa2",
                            "&:hover": {
                              borderColor: "#075f7e",
                              backgroundColor: "rgba(9,122,162,0.06)",
                            },
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={tableColSpan} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                      No data found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack
          direction={{ xs: "column", md: "row" }}
          sx={{
            justifyContent: "flex-end",
            alignItems: { xs: "stretch", md: "center" },
            mt: 1.5,
            gap: 1,
          }}
        >
          <TablePagination
            component="div"
            count={totalRecords || sortedRows.length}
            page={safePage}
            onPageChange={(_, newPage) => setCurrentPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(0);
            }}
            rowsPerPageOptions={[5, 10, 20]}
            sx={{ ml: { md: "auto" } }}
          />
        </Stack>
      </Paper>

      <Drawer
        anchor="right"
        open={!!selectedRow}
        onClose={handleCloseDrawer}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1.5,
              pb: 1.5,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              QC Questions
            </Typography>
            <IconButton onClick={handleCloseDrawer} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {selectedRow && (
            <>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {[
                  "driver_id",
                  "vehicle_number",
                  "city",
                  "audit_date",
                ].filter(
                  (key) =>
                    (auditType !== "OPS_AUDIT" ||
                      !OPS_AUDIT_TABLE_COLUMNS.has(
                        normalizeOpsAuditColumnKey(key)
                      )) &&
                    (auditType !== "QC_360" ||
                      !QC_360_TABLE_COLUMNS.has(
                        normalizeOpsAuditColumnKey(key)
                      ))
                ).map((key) =>
                  selectedRow[key] != null && selectedRow[key] !== "" ? (
                    <Typography
                      key={key}
                      variant="body2"
                      sx={{ color: "#475569" }}
                    >
                      <strong>{formatColumnLabel(key)}:</strong>{" "}
                      {String(selectedRow[key])}
                    </Typography>
                  ) : null
                )}
              </Stack>

              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {columns
                  .filter((key) => {
                    const normalizedKey = key.toLowerCase();
                    const normalizedOpsKey = normalizeOpsAuditColumnKey(key);
                    return (
                      ![
                        "audit_id",
                        "auditid",
                        QUESTIONS_KEY,
                        "driver_id",
                        "vehicle_number",
                        "city",
                        "location",
                        "audit_date",
                      ].includes(normalizedKey) &&
                      !["audit_id", "auditid"].includes(normalizedKey) &&
                      (auditType !== "OPS_AUDIT" ||
                        !OPS_AUDIT_TABLE_COLUMNS.has(normalizedOpsKey)) &&
                      (auditType !== "QC_360" ||
                        !QC_360_TABLE_COLUMNS.has(normalizedOpsKey)) &&
                      !INSPECTION_COLUMNS.has(normalizedKey) &&
                      !isPhotoColumn(key)
                    );
                  })
                  .map((key) => {
                    const value = selectedRow[key];
                    return (
                      <Typography
                        key={key}
                        variant="body2"
                        sx={{ color: "#475569" }}
                      >
                        <strong>{formatColumnLabel(key)}:</strong>{" "}
                        {value == null || value === ""
                          ? "-"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                      </Typography>
                    );
                  })}
              </Stack>

              {auditType === "SAFETY_BRIEFING" && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: "#ffffff",
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 800, color: "#0f172a" }}
                    >
                      Briefing Photos
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      {selectedPhotoUrls.length > 0
                        ? `${photoIndex + 1} / ${selectedPhotoUrls.length}`
                        : "0 / 0"}
                    </Typography>
                  </Stack>

                  {selectedPhotoUrls.length > 0 ? (
                    <>
                      <BriefingPhotoPreview
                        imageUrl={selectedPhotoUrls[photoIndex] ?? ""}
                      />
                      <Stack
                        direction="row"
                        sx={{ alignItems: "center", justifyContent: "space-between" }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ChevronLeftIcon />}
                          onClick={showPreviousPhoto}
                          disabled={selectedPhotoUrls.length <= 1}
                          sx={{ textTransform: "none" }}
                        >
                          Prev
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<ChevronRightIcon />}
                          onClick={showNextPhoto}
                          disabled={selectedPhotoUrls.length <= 1}
                          sx={{ textTransform: "none" }}
                        >
                          Next
                        </Button>
                      </Stack>
                    </>
                  ) : (
                    <BriefingPhotoPreview imageUrl="" />
                  )}
                </Stack>
              </Paper>
              )}

              <Divider sx={{ mb: 2 }} />

              {(() => {
                const q = selectedRow[QUESTIONS_KEY];
                const questionItems = Array.isArray(q)
                  ? q
                  : q && typeof q === "object"
                    ? Object.entries(q as Record<string, unknown>).map(
                        ([k, v]) => ({ question: k, answer: v })
                      )
                    : [];
                const inspectionItems = Object.entries(selectedRow)
                  .filter(
                    ([key, answer]) =>
                      INSPECTION_COLUMNS.has(key.toLowerCase()) &&
                      ["0", "1"].includes(String(answer).trim())
                  )
                  .map(([key, answer]) => ({
                    question: formatColumnLabel(key),
                    answer,
                  }));
                const list = [...questionItems, ...inspectionItems];

                if (list.length === 0) {
                  return null;
                }

                return (
                  <Stack spacing={1}>
                    {list.map((item, i) => {
                      const rec = item as Record<string, unknown>;
                      const questionText =
                        (rec.question as string) ??
                        (rec.title as string) ??
                        (rec.label as string) ??
                        (rec.name as string) ??
                        `Question ${i + 1}`;
                      const answerRaw =
                        rec.answer ?? rec.response ?? rec.value ?? rec.status;

                      const normalized = String(answerRaw ?? "").trim().toLowerCase();
                      const isYes = ["1", "yes", "ok", "true"].includes(normalized);
                      const isNo = ["0", "no", "not ok", "false"].includes(normalized);
                      const answerLabel = isYes
                        ? "Yes"
                        : isNo
                          ? "No"
                          : answerRaw != null && String(answerRaw) !== ""
                            ? String(answerRaw)
                            : "-";

                      return (
                        <Box
                          key={i}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "minmax(0, 1fr) auto",
                            },
                            alignItems: { xs: "start", sm: "center" },
                            gap: 1.25,
                            px: { xs: 1, sm: 1.5 },
                            py: 1.25,
                            borderLeft: `3px solid ${isYes ? "#16a34a" : isNo ? "#dc2626" : "#097aa2"}`,
                            borderBottom: "1px solid #e2e8f0",
                            backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: "#334155",
                              flex: 1,
                              minWidth: 0,
                              lineHeight: 1.4,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {questionText}
                          </Typography>

                          <Box
                            sx={{
                              justifySelf: { xs: "start", sm: "end" },
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              color: isYes ? "#166534" : isNo ? "#b91c1c" : "#475569",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor: isYes
                                ? "#dcfce7"
                                : isNo
                                  ? "#fee2e2"
                                  : "#e2e8f0",
                            }}
                          >
                            {isYes ? (
                              <>
                                <CheckCircleIcon fontSize="small" />
                              </>
                            ) : isNo ? (
                              <>
                                <CancelIcon fontSize="small" />
                              </>
                            ) : null}
                            {answerLabel}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                );
              })()}
            </>
          )}
        </Box>
      </Drawer>
      <Dialog
        open={imageViewer !== null}
        onClose={handleCloseImageViewer}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              width: {
                xs: "calc(100% - 24px)",
                sm: "min(720px, calc(100% - 64px))",
              },
              maxWidth: "none",
              maxHeight: "calc(100% - 24px)",
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pb: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            View Images
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              {imageViewer
                ? `${imageViewer.photoIndex + 1} / ${imageViewer.imageUrls.length}`
                : "0 / 0"}
            </Typography>
            <IconButton
              onClick={handleCloseImageViewer}
              size="small"
              aria-label="Close image viewer"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          <BriefingPhotoPreview
            imageUrl={imageViewer?.imageUrls[imageViewer.photoIndex] ?? ""}
            height="min(65vh, 640px)"
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mt: 1.5,
            }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<ChevronLeftIcon />}
              onClick={showPreviousViewerPhoto}
              disabled={!imageViewer || imageViewer.imageUrls.length <= 1}
              sx={{ textTransform: "none" }}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              endIcon={<ChevronRightIcon />}
              onClick={showNextViewerPhoto}
              disabled={!imageViewer || imageViewer.imageUrls.length <= 1}
              sx={{ textTransform: "none" }}
            >
              Next
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
