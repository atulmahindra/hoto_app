"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Button,
  Box,
  Chip,
  FormControl,
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
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import Datepicker, { DateRangeType } from "react-advance-datepicker";

interface CityItem {
  id: string | number;
  city_name: string;
}

interface CityYardMapping {
  yard_id: string | number;
  city_id: string | number;
  [key: string]: unknown;
}

type SortDirection = "asc" | "desc";

const parseAuditDate = (value: string) => {
  const [datePart = "", timePart = "00:00:00"] = String(value).split(" ");
  return new Date(`${datePart}T${timePart}`);
};

const formatColumnLabel = (key: string) => {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function HotoAuditTable() {
  const [cityList, setCityList] = useState<CityItem[]>([]);
  const [auditRecords, setAuditRecords] = useState<Record<string, string>[]>([]);

  // Date range using react-advance-datepicker
  const [dateValue, setDateValue] = useState<DateRangeType>({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    endDate: new Date(),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [cityYardMapping, setCityYardMapping] = useState<CityYardMapping[]>([]);
  const [yardFilter, setYardFilter] = useState("All Yards");
  const [activeShortcut, setActiveShortcut] = useState("");

  // Fetch master data (city-yard mapping)
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const response = await axios.post(
          "https://alytehotoapi.mllqa.com/api/v1/master/data",
          { entity: "1" }
        );
        console.log("set_data", response.data);
        const mapping = response.data?.data?.city_yard_mapping;
        setCityYardMapping(Array.isArray(mapping) ? mapping : []);
      } catch (error) {
        console.error("Failed to fetch master data:", error);
      }
    };

    fetchMasterData();
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

    // Apply on next tick and observe DOM for the popover opening
    applyHighlight();
    const observer = new MutationObserver(applyHighlight);
    const container = document.querySelector(".hoto-datepicker");
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [activeShortcut]);

  useEffect(() => {
    const fetchCityList = async () => {
      try {
        const response = await axios.post(
          "https://alytehotoapi.mllqa.com/api/v1/master/citylist",
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

  // Derive date strings from the datepicker value
  const dateRange = useMemo(() => {
    return {
      startDate: dateValue?.startDate
        ? dayjs(dateValue.startDate).format("YYYY-MM-DD")
        : "",
      endDate: dateValue?.endDate
        ? dayjs(dateValue.endDate).format("YYYY-MM-DD")
        : "",
    };
  }, [dateValue]);

  const selectedCityId = useMemo(() => {
    if (locationFilter === "All Locations") return "";
    const selectedCity = cityList.find((item) => item.city_name === locationFilter);
    return selectedCity?.id ?? "";
  }, [cityList, locationFilter]);

  const selectedYardId = useMemo(() => {
    if (yardFilter === "All Yards") return "";
    return yardFilter;
  }, [yardFilter]);

  // Fetch audit records
  useEffect(() => {
    const fetchVehicleAuditReport = async () => {
      try {
        const payload = {
          city_id: selectedCityId,
          yard_id: selectedYardId,
          from_date: dateRange.startDate,
          to_date: dateRange.endDate,
        };

        const response = await axios.post(
          "https://alytehotoapi.mllqa.com/api/v1/vehicle/vehicle-checklist-audit",
          payload
        );

        const records = Array.isArray(response.data?.data?.records)
          ? response.data.data.records
          : Array.isArray(response.data?.records)
            ? response.data.records
            : [];

        setAuditRecords(records);
        console.log("datavalue", records);
      } catch (error) {
        console.error("Failed to fetch VehicleAuditReport:", error);
      }
    };

    fetchVehicleAuditReport();
  }, [selectedCityId, selectedYardId, dateRange.startDate, dateRange.endDate]);

  const tableData = useMemo(() => auditRecords, [auditRecords]);
  const columns = useMemo(() => Object.keys(tableData[0] || {}), [tableData]);

  const displayColumns = useMemo(() => {
    if (columns.length === 0) return [];
    const finalStatusKey = columns.find((col) => col === "final_status");
    if (!finalStatusKey) return columns;
    return [...columns.filter((col) => col !== finalStatusKey), finalStatusKey];
  }, [columns]);

  const tableColSpan = Math.max(displayColumns.length, 1);

  const locationOptions = useMemo(() => {
    const uniqueCities =
      cityList.length > 0
        ? cityList.map((row) => row.city_name).filter(Boolean)
        : [];
    return ["All Locations", ...uniqueCities];
  }, [cityList]);

  // Filtering
  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const startBoundary = dateRange.startDate
      ? dayjs(dateRange.startDate).startOf("day").toDate()
      : null;
    const endBoundary = dateRange.endDate
      ? dayjs(dateRange.endDate).endOf("day").toDate()
      : null;

    return tableData.filter((row) => {
      const rowDate = parseAuditDate(row.audit_date);

      if (startBoundary && rowDate < startBoundary) return false;
      if (endBoundary && rowDate > endBoundary) return false;

      if (
        locationFilter !== "All Locations" &&
        (row.city ?? row.city_name) !== locationFilter
      ) {
        return false;
      }

      if (!query) return true;
      return columns.some((col) =>
        String(row[col] ?? "").toLowerCase().includes(query)
      );
    });
  }, [searchTerm, tableData, columns, locationFilter, dateRange]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;

    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const valueA = a?.[sortKey] ?? "";
      const valueB = b?.[sortKey] ?? "";

      const asNumberA = Number(valueA);
      const asNumberB = Number(valueB);
      const bothNumbers =
        !Number.isNaN(asNumberA) &&
        !Number.isNaN(asNumberB) &&
        String(valueA).trim() !== "" &&
        String(valueB).trim() !== "";

      let compare = 0;
      if (bothNumbers) {
        compare = asNumberA - asNumberB;
      } else {
        compare = String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDirection === "asc" ? compare : -compare;
    });

    return rows;
  }, [filteredRows, sortKey, sortDirection]);

  // Pagination
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
    setSearchTerm("");
    setLocationFilter("All Locations");
    setYardFilter("All Yards");
    setDateValue({
      startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      endDate: new Date(),
    });
    setCurrentPage(0);
  };

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
        // Extra custom range shortcuts
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

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ p: 2.5, width: "100%", maxWidth: 1360 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "stretch", lg: "center" },
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
            HOTO
          </Typography>
        </Stack>

        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "stretch", lg: "center" },
              gap: 1.5,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                alignItems: { xs: "stretch", sm: "center" },
              }}
            >
              {/* Date Range Picker */}
              <Box className="hoto-datepicker" sx={{ minWidth: 320, height: 40, display: "flex", alignItems: "center" }}>
                <Datepicker
                  value={dateValue}
                  onChange={(nextValue) => {
                    if (nextValue) {
                      setDateValue(nextValue);
                      setCurrentPage(0);
                      console.log("Start Date:", nextValue.startDate);
                      console.log("End Date:", nextValue.endDate);
                    }
                  }}
                  useRange
                  showShortcuts
                  showFooter
                  configs={datePickerConfigs}
                  primaryColor="blue"
                  displayFormat="YYYY-MM-DD"
                  separator=" ~ "
                  placeholder="Select Start Date ~ Select End Date"
                  startFrom={new Date()}
                  popoverDirection="down"
                  inputClassName="!h-[40px] w-full rounded border border-[rgba(0,0,0,0.23)] px-[14px] text-[0.875rem] text-[#334155] outline-none hover:border-[rgba(0,0,0,0.87)] focus:border-[#1976d2] focus:border-2 focus:px-[13px]"
                />
              </Box>

              {/* Location Filter */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="location-filter-label">Location</InputLabel>
                <Select
                  labelId="location-filter-label"
                  id="location-filter"
                  value={locationFilter}
                  label="Location"
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

              {/* Yard Filter */}
              {/* <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="yard-filter-label">Yard</InputLabel>
                <Select
                  labelId="yard-filter-label"
                  id="yard-filter"
                  value={yardFilter}
                  label="Yard"
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    setYardFilter(selectedValue);

                    if (selectedValue !== "All Yards") {
                      const selectedYard = cityYardMapping.find(
                        (item) => String(item.yard_id) === selectedValue
                      );
                      if (selectedYard) {
                        console.log("selected yard data", {
                          yard_id: selectedYard.yard_id,
                          city_id: selectedYard.city_id,
                        });
                      }
                    }

                    setCurrentPage(0);
                  }}
                >
                  <MenuItem value="All Yards">All Yards</MenuItem>
                  {cityYardMapping.map((item, index) => (
                    <MenuItem
                      key={`${item.yard_id}-${item.city_id}-${index}`}
                      value={String(item.yard_id)}
                    >
                      {item.yard_id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> */}
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ width: { xs: "100%", lg: "auto" }, ml: { lg: "auto" } }}
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
                sx={{ width: { xs: "100%", sm: 240 } }}
              />
              <Button
                variant="outlined"
                onClick={handleResetFilters}
                sx={{ minWidth: 110 }}
              >
                Reset
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Table */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            minHeight: 360,
            maxHeight: 520,
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          <Table stickyHeader size="small" aria-label="audit table">
            {hasTableData && (
              <TableHead>
                <TableRow>
                  {displayColumns.map((column) => (
                    <TableCell
                      key={column}
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        backgroundColor: "#dbeafe",
                        color: "#1e3a8a",
                        borderBottomColor: "#bfdbfe",
                        ...(column === "final_status"
                          ? { position: "sticky", right: 0, zIndex: 3 }
                          : {}),
                      }}
                    >
                      <TableSortLabel
                        active={sortKey === column}
                        direction={sortKey === column ? sortDirection : "asc"}
                        onClick={() => handleSort(column)}
                      >
                        {formatColumnLabel(column)}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => (
                  <TableRow
                    hover
                    key={`${row.vehicle_number}-${safePage}-${index}`}
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
                            label={row[column] || "-"}
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
                        ) : (
                          row[column] || "-"
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={tableColSpan} align="center" sx={{ py: 6 }}>
                    <Box
                      sx={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                        No data found.
                      </Typography>
                    </Box>
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
    </Box>
  );
}
