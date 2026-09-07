"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  Divider,
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
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import Datepicker, { DateRangeType } from "react-advance-datepicker";

type SortDirection = "asc" | "desc";

// Inspection columns where "1" means Ok and "0" means Not Ok
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

const API_HOST = "https://alytehotoapi.mllqa.com";
// Driver QC response data is served from the local API
const QC_API_HOST = "https://alytehotoapi.mllqa.com";

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

type AuditRow = Record<string, unknown>;

// Column that holds the QC questions (shown in the side card, not the table)
const QUESTIONS_KEY = "questions";

export default function DriverSelfAudit() {
  const [auditRecords, setAuditRecords] = useState<AuditRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<AuditRow | null>(null);
  const [cityList, setCityList] = useState<CityItem[]>([]);

  // Filters
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateValue, setDateValue] = useState<DateRangeType>({
    startDate: null,
    endDate: null,
  });

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [activeShortcut, setActiveShortcut] = useState("1 Month");

  // Default range: last 1 month (client only, avoids hydration mismatch)
  useEffect(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setDateValue({ startDate: start, endDate: new Date() });
  }, []);

  // Fetch city list (same source as HOTO Audit)
  useEffect(() => {
    const fetchCityList = async () => {
      try {
        const response = await axios.post(
          `${API_HOST}/api/v1/master/citylist`,
          {}
        );
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

  // Highlight the active shortcut button by matching its text
  useEffect(() => {
    const applyHighlight = () => {
      const buttons = document.querySelectorAll<HTMLElement>(
        ".hoto-datepicker li"
      );
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

  // Custom date-range shortcuts
  const datePickerConfigs = useMemo(() => {
    const today = new Date();
    const buildRange = (days: number) => {
      const start = new Date();
      start.setDate(start.getDate() - days);
      return { start, end: today };
    };

    const trackClick = (text: string) => () =>
      setTimeout(() => setActiveShortcut(text), 0);

    // Last month (previous calendar month)
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

  // Derived date range strings + selected city id
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

  const selectedCityId = useMemo(() => {
    if (locationFilter === "All Locations") return "";
    const selectedCity = cityList.find(
      (item) => item.city_name === locationFilter
    );
    return selectedCity?.id ?? "";
  }, [cityList, locationFilter]);

  // Fetch Driver Self Audit / QC response data
  useEffect(() => {
    const fetchDriverQcData = async () => {
      try {
        const payload = {
          city_id: String(selectedCityId || "1"),
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
        };

        const response = await axios.post(
          `${QC_API_HOST}/api/v1/vehicle/driver-qc-response-data`,
          payload
        );

        console.log("DSA", response.data);

        const data = response.data?.data;
        const records = Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data)
            ? data
            : [];
        setAuditRecords(records);
      } catch (error) {
        console.error("Failed to fetch Driver QC response data:", error);
        setAuditRecords([]);
      }
    };

    if (dateRange.fromDate && dateRange.toDate) {
      fetchDriverQcData();
    }
  }, [selectedCityId, dateRange.fromDate, dateRange.toDate]);

  const tableData = auditRecords;
  const columns = useMemo(() => Object.keys(tableData[0] || {}), [tableData]);

  const displayColumns = useMemo(() => {
    if (columns.length === 0) return [];
    const visible = columns.filter(
      (col) =>
        col.toLowerCase() !== "audit_id" &&
        col.toLowerCase() !== "auditid" &&
        col.toLowerCase() !== QUESTIONS_KEY
    );
    const finalStatusKey = visible.find((col) => col === "final_status");
    if (!finalStatusKey) return visible;
    return [...visible.filter((col) => col !== finalStatusKey), finalStatusKey];
  }, [columns]);

  const tableColSpan = Math.max(displayColumns.length + 1, 1);

  const locationOptions = useMemo(() => {
    const uniqueCities =
      cityList.length > 0
        ? cityList.map((row) => row.city_name).filter(Boolean)
        : [];
    return ["All Locations", ...uniqueCities];
  }, [cityList]);

  // ─── Filtering (search only; city + date handled by the API) ─────────────
  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tableData;

    return tableData.filter((row) =>
      columns.some((col) =>
        String(row[col] ?? "").toLowerCase().includes(query)
      )
    );
  }, [tableData, columns, searchTerm]);

  // ─── Sorting ────────────────────────────────────────────────────────────
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

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages - 1);

  const paginatedRows = useMemo(() => {
    const start = safePage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const hasTableData = displayColumns.length > 0 && paginatedRows.length > 0;

  const handleSort = (column: string) => {
    if (sortKey === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(column);
    setSortDirection("asc");
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
    XLSX.utils.book_append_sheet(wb, ws, "Driver Self Audit");
    XLSX.writeFile(wb, `Driver_Self_Audit_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ p: 2.5, width: "100%", maxWidth: 1360 }}>
        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Left filter group */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 2,
              }}
            >
              <FormControl size="small" sx={{ width: { xs: "100%", sm: 160 } }}>
                <InputLabel id="dsa-city-label">City</InputLabel>
                <Select
                  labelId="dsa-city-label"
                  id="dsa-city"
                  value={locationFilter}
                  label="City"
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(0);
                  }}
                >
                  {locationOptions.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Date Range (From / To) */}
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

            {/* Search + actions pushed to the right */}
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

        {/* Table */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            minHeight: 360,
            maxHeight: 430,
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          <Table stickyHeader size="small" aria-label="driver self audit table">
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
                          ? { position: "sticky", right: 0, zIndex: 3 }
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
                        {formatColumnLabel(column)}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      backgroundColor: "#e4e4e7",
                      color: "#71717a",
                      borderBottomColor: "#d4d4d8",
                    }}
                  >
                    Action
                  </TableCell>
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
                                right: 0,
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
                              ...(String(row[column]).toLowerCase() ===
                              "accepted"
                                ? {
                                    color: "#166534",
                                    backgroundColor: "#dcfce7",
                                    border: "1px solid #86efac",
                                  }
                                : String(row[column]).toLowerCase() ===
                                    "rejected"
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
                        ) : (
                          (row[column] as React.ReactNode) ?? "-"
                        )}
                      </TableCell>
                    ))}
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={() => setSelectedRow(row)}
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

        {/* Pagination */}
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
            count={sortedRows.length}
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

      {/* Side card / drawer showing the selected row's questions */}
      <Drawer
        anchor="right"
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              QC Questions
            </Typography>
            <IconButton onClick={() => setSelectedRow(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {selectedRow && (
            <>
              {/* A couple of identifying details */}
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {["driver_id", "vehicle_number", "city", "audit_date"].map(
                  (key) =>
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

              <Divider sx={{ mb: 2 }} />

              {/* Questions list */}
              {(() => {
                const q = selectedRow[QUESTIONS_KEY];
                const list = Array.isArray(q)
                  ? q
                  : q && typeof q === "object"
                    ? Object.entries(q as Record<string, unknown>).map(
                        ([k, v]) => ({ question: k, answer: v })
                      )
                    : [];

                if (list.length === 0) {
                  return (
                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                      No questions available.
                    </Typography>
                  );
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

                      const normalized = String(answerRaw ?? "")
                        .trim()
                        .toLowerCase();
                      const isYes = ["1", "yes", "ok", "true"].includes(
                        normalized
                      );
                      const isNo = ["0", "no", "not ok", "false"].includes(
                        normalized
                      );

                      return (
                        <Paper
                          key={i}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 1.5,
                          }}
                        >
                          {/* Question text (left) */}
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

                          {/* Answer + icon (right, fixed width) */}
                          <Box
                            sx={{
                              flexShrink: 0,
                              width: 64,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              color: isYes
                                ? "#166534"
                                : isNo
                                  ? "#b91c1c"
                                  : "#475569",
                            }}
                          >
                            {isYes ? (
                              <>
                                <CheckCircleIcon fontSize="small" />
                                Yes
                              </>
                            ) : isNo ? (
                              <>
                                <CancelIcon fontSize="small" />
                                No
                              </>
                            ) : answerRaw != null && String(answerRaw) !== "" ? (
                              String(answerRaw)
                            ) : (
                              "-"
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                );
              })()}
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
