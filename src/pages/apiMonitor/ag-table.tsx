import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { Button, Card, Checkbox, Col, ConfigProvider, Row, Tag, theme, Tooltip, Spin } from "antd";
import Icon, {
	MoreOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	CloseCircleOutlined,
} from "@ant-design/icons";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { AllCommunityModule } from "ag-grid-community";
import axios, { type AxiosRequestConfig } from "axios";
import { toast } from "sonner";

import ColumnManager from "./ColumnManager"; // Import the new component

const ELASTICSEARCH_INDEX = ".ds-logs-generic-default-2025.05.02-000001";
// Use a simpler query for initial testing if needed, or keep your specific one
// const ELASTICSEARCH_ENDPOINT = `/elasticsearch/${ELASTICSEARCH_INDEX}/_search`;
const ELASTICSEARCH_ENDPOINT = `/elasticsearch/${ELASTICSEARCH_INDEX}/_search?q=_exists_:server_ip`;

const FETCH_SIZE = 100; // Renamed for clarity

// Use a generic type for row data, as the structure can vary
type LogData = Record<string, any>;

// --- Helper Functions ---
const getDisplayName = (field: string): string => {
	// Simple capitalization for default header names
	return field
		.replace(/[@_.]/g, " ") // Replace special chars with space
		.replace(/([A-Z])/g, " $1") // Add space before capitals
		.replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize first letter of each word
		.trim();
};

const formatTimestamp = (params: ValueFormatterParams): string => {
	if (params.value == null) return "";
	const date = new Date(params.value);
	return isNaN(date.getTime()) ? String(params.value) : date.toLocaleString();
};

const StatusCellRenderer = (params: { value: number }) => {
	const status = params.value;
	if (status == null) return null;

	let color = "blue"; // Default
	let icon = <CheckCircleOutlined />;

	if (status >= 200 && status < 300) {
		color = "green";
		icon = <CheckCircleOutlined />;
	} else if (status >= 300 && status < 400) {
		color = "cyan";
		icon = <ExclamationCircleOutlined />; // Or another icon
	} else if (status >= 400 && status < 500) {
		color = "orange"; // Changed from yellow for better visibility
		icon = <ExclamationCircleOutlined />;
	} else if (status >= 500) {
		color = "red";
		icon = <CloseCircleOutlined />;
	}

	return (
		<Tooltip title={`HTTP Status Code: ${status}`}>
			<Tag color={color} icon={icon} style={{ minWidth: "60px", textAlign: "center" }}>
				{status}
			</Tag>
		</Tooltip>
	);
};

// --- Main Component ---
const APIGridTable = () => {
	const { token } = theme.useToken();
	const isDarkTheme = useMemo(() => token.colorBgContainer !== "#FFFFFF", [token.colorBgContainer]);

	const gridApiRef = useRef<GridApi | null>(null);
	const [rowData, setRowData] = useState<LogData[]>([]);
	const [allAvailableFields, setAllAvailableFields] = useState<string[]>([]);
	const [visibleFields, setVisibleFields] = useState<string[]>([]); // Fields to show in grid
	const [isLoading, setIsLoading] = useState<boolean>(false);

	// --- Field Specific Configurations ---
	// Define configurations for known fields
	const specificFieldConfigs: Record<string, Partial<ColDef>> = useMemo(
		() => ({
			"@timestamp": {
				valueFormatter: formatTimestamp,
				filter: "agDateColumnFilter",
				width: 200,
				sort: "desc", // Default sort this column
			},
			timestamp: {
				// Handle alternative name
				valueFormatter: formatTimestamp,
				filter: "agDateColumnFilter",
				width: 200,
			},
			"http.response.status_code": {
				// Example for ECS field
				headerName: "Status",
				cellRenderer: StatusCellRenderer,
				filter: "agNumberColumnFilter",
				width: 120,
				cellStyle: { textAlign: "center" },
			},
			http_status: {
				// Your original field
				headerName: "Status",
				cellRenderer: StatusCellRenderer,
				filter: "agNumberColumnFilter",
				width: 120,
				cellStyle: { textAlign: "center" },
			},
			"http.request.method": {
				// Example for ECS field
				headerName: "Method",
				filter: "agTextColumnFilter",
				width: 120,
			},
			http_method: {
				// Your original field
				headerName: "Method",
				filter: "agTextColumnFilter",
				width: 120,
			},
			"url.original": {
				// Example ECS field
				headerName: "URL",
				filter: "agTextColumnFilter",
				width: 300,
			},
			url: {
				// Your original field
				headerName: "URL",
				filter: "agTextColumnFilter",
				width: 300,
			},
			"client.ip": {
				// Example ECS field
				headerName: "Client IP",
				filter: "agTextColumnFilter",
				width: 150,
			},
			client_ip: {
				// Your original field
				headerName: "Client IP",
				filter: "agTextColumnFilter",
				width: 150,
			},
			message: {
				width: 400, // Give message more space
			},
			// Add more specific configs as needed
		}),
		[],
	); // Empty dependency array as renderers/formatters are stable

	// --- Data Fetching ---
	const fetchData = useCallback(async () => {
		setIsLoading(true);
		gridApiRef.current?.setGridOption("loading", true); // Show grid loading overlay
		const esQuery = {
			size: FETCH_SIZE,
			query: {
				match_all: {}, // Keep it simple or use your specific query
			},
			// Use _source: true to get all fields, or specify fields if needed
			_source: true,
			sort: [{ "@timestamp": { order: "desc" } }], // Common sorting field
		};
		const config: AxiosRequestConfig = {
			headers: {
				"Content-Type": "application/json",
				// Consider making auth configurable or use environment variables
				authorization: "Basic " + btoa("elastic:changeme"),
			},
		};

		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			const hits = response.data?.hits?.hits;

			if (hits && Array.isArray(hits) && hits.length > 0) {
				const discoveredFields = new Set<string>();
				const formattedData: LogData[] = hits.map((hit: any) => {
					const sourceData = hit._source || {};
					// Flatten nested fields if desired (simple example)
					// const flatData = flattenObject(sourceData);
					// Object.keys(flatData).forEach(key => discoveredFields.add(key));
					// return { _id: hit._id, ...flatData };

					// Or just use top-level fields initially
					Object.keys(sourceData).forEach((key) => discoveredFields.add(key));
					return {
						_id: hit._id, // Keep ES document ID
						...sourceData,
					};
				});

				const sortedFields = Array.from(discoveredFields).sort();
				setAllAvailableFields(sortedFields);

				// Set initial visible columns only if not already set
				if (visibleFields.length === 0) {
					// Define a sensible default set of visible columns
					const defaultVisible = [
						"@timestamp",
						"level",
						"message",
						"http.response.status_code",
						"http.request.method",
						"url.original",
						"client.ip",
						// Add your original field names as fallbacks if ECS fields aren't present
						"timestamp",
						"http_status",
						"http_method",
						"url",
						"client_ip",
					].filter((field) => discoveredFields.has(field)); // Only include fields that actually exist

					// Limit initial visible fields to a reasonable number
					setVisibleFields(defaultVisible.slice(0, 7));
				}

				setRowData(formattedData);
				gridApiRef.current?.hideOverlay(); // Hide grid loading overlay
			} else {
				console.warn("No hits found or unexpected format.");
				setRowData([]);
				setAllAvailableFields([]);
				setVisibleFields([]);
				gridApiRef.current?.showNoRowsOverlay(); // Show no rows overlay
			}
		} catch (error: any) {
			const errorMsg = error.response?.data?.error?.reason || error.message || "Failed to fetch data";
			toast.error(`Elasticsearch Error: ${errorMsg}`);
			console.error("Elasticsearch fetch error:", error);
			setRowData([]);
			setAllAvailableFields([]);
			setVisibleFields([]);
			gridApiRef.current?.showNoRowsOverlay();
		} finally {
			setIsLoading(false);
		}
	}, [visibleFields.length]); // Re-run fetch won't reset visible fields unless length is 0

	useEffect(() => {
		fetchData();
		// Intentionally not including fetchData in dependencies to avoid loops
		// if fetchData itself causes state changes that would trigger it.
		// We only want to fetch initially or manually.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Fetch data on initial mount

	// --- Action Cell ---
	const ActionCellRenderer = useCallback((params: { data?: LogData }) => {
		const showDetails = () => {
			if (!params.data) return;
			console.log("Show details for row:", params.data);
			// Simple toast, replace with Modal or Drawer for better display
			toast.info(
				() => (
					<div style={{ maxHeight: "300px", overflowY: "auto" }}>
						<strong>Details for ID: {params.data?._id || "N/A"}</strong>
						<pre>{JSON.stringify(params.data, null, 2)}</pre>
					</div>
				),
				{ duration: 10000 }, // Keep toast open longer
			);
		};
		return params.data ? <Button type="text" icon={<MoreOutlined />} onClick={showDetails} /> : null;
	}, []);

	// --- Dynamic Column Definitions ---
	const columnDefs = useMemo<ColDef[]>(() => {
		const dynamicCols: ColDef[] = visibleFields.map((field) => {
			const specificConfig = specificFieldConfigs[field] || {};
			return {
				headerName: specificConfig.headerName || getDisplayName(field), // Use specific name or generate one
				field: field,
				sortable: true,
				filter: specificConfig.filter === false ? false : specificConfig.filter || true, // Default to true unless explicitly false
				floatingFilter: specificConfig.floatingFilter === false ? false : true, // Default to true
				resizable: true,
				minWidth: specificConfig.width || 100, // Use specific width or default
				...specificConfig, // Apply other specific configs (renderer, formatter, etc.)
			};
		});

		// Add the static Actions column
		const actionsCol: ColDef = {
			headerName: "Actions",
			colId: "actions", // Important to give static columns a colId
			cellRenderer: ActionCellRenderer,
			sortable: false,
			filter: false,
			floatingFilter: false,
			resizable: false,
			width: 80,
			pinned: "right",
			lockVisible: true, // Prevent hiding via column menu
		};

		return [...dynamicCols, actionsCol];
	}, [visibleFields, specificFieldConfigs, ActionCellRenderer]);

	// --- Default Column Definition ---
	const defaultColDef = useMemo<ColDef>(
		() => ({
			resizable: true,
			sortable: true, // Enable sorting by default
			floatingFilter: true,
			filter: true,
			minWidth: 100,
			// Enable Tooltip for cells
			tooltipValueGetter: (params) => {
				// Avoid tooltip for actions column or columns with custom renderers that handle it
				if (params.colDef.colId === "actions" || params.colDef.cellRenderer) {
					return undefined;
				}
				return params.valueFormatted ?? params.value;
			},
		}),
		[],
	);

	// --- Grid Ready ---
	const onGridReady = useCallback(
		(params: GridReadyEvent) => {
			console.log("Grid Ready");
			gridApiRef.current = params.api;
			if (isLoading) {
				params.api.setGridOption("loading", true);
			}
		},
		[isLoading],
	);

	// --- Handle Column Visibility Changes from Manager ---
	const handleVisibilityChange = useCallback((newVisibleFields: string[]) => {
		setVisibleFields(newVisibleFields);
	}, []);

	return (
		<div>
			{/* Add Refresh Button */}
			<Button onClick={fetchData} loading={isLoading} style={{ marginBottom: 16 }}>
				Refresh Data
			</Button>

			{/* Column Manager */}
			<ColumnManager
				allFields={allAvailableFields}
				visibleFields={visibleFields}
				onVisibilityChange={handleVisibilityChange}
				// Optional: Provide a map for better names if needed
				// fieldHeaderMap={{ '@timestamp': 'Timestamp', 'client.ip': 'Client IP' }}
			/>

			{/* Loading indicator for initial fetch */}
			{isLoading && rowData.length === 0 && (
				<Spin tip="Loading initial data..." style={{ display: "block", marginTop: 20 }} />
			)}

			{/* AG Grid */}
			<div
				className={isDarkTheme ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
				style={{ height: "600px", width: "100%" }}
			>
				<AgGridReact<LogData> // Use generic LogData type
					key={visibleFields.join("-")} // Force re-render if columns fundamentally change (optional but can help)
					columnDefs={columnDefs}
					rowData={rowData}
					defaultColDef={defaultColDef}
					onGridReady={onGridReady}
					modules={[AllCommunityModule]} // Use combined modules package
					pagination={true}
					paginationPageSize={25}
					paginationPageSizeSelector={[10, 25, 50, 100, 500]}
					animateRows={true} // Optional: Add animation
					// Grid options
					overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading...</span>'
					overlayNoRowsTemplate='<span style="padding: 10px;">No logs found.</span>'
					// Consider 'fitGridWidth' or remove if causing issues
					// autoSizeStrategy={{ type: "fitGridWidth", defaultMinWidth: 100 }}
					// Enable tooltips based on tooltipValueGetter in defaultColDef
					enableCellTextSelection={true} // Allow text selection
					tooltipShowDelay={500} // Show tooltip after 500ms
				/>
			</div>
		</div>
	);
};

export default APIGridTable;
