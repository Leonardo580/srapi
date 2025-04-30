import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { Button, Card, Checkbox, Col, ConfigProvider, Row, Tag, theme, Tooltip } from "antd";
import Icon, {
	MoreOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	CloseCircleOutlined,
} from "@ant-design/icons";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { themeQuartz } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import axios, { type AxiosRequestConfig, type AxiosError } from "axios";
import { toast } from "sonner";

const ELASTICSEARCHURL = "http://localhost:9200";
const ELATCIEARCH_INDEX = "test";
// const ELASTICSEARCH_ENDPOINT =  `${ELASTICSEARCHURL}/${ELATCIEARCH_INDEX}/_search`;
const ELASTICSEARCH_ENDPOINT = "/elasticsearch/test_grokked/_search";

const FETECHSZE = 100;

interface ApiLog {
	timestamp: string | number; // Adjust based on how it's stored in ES (string ISO date or epoch ms)
	client_ip: string;
	duration: number;
	level: string;
	method: string;
	service_ip: string;
	status: number;
	port: string;

	_id?: string; // Keep the ES document ID if needed
}

//provideGlobalGridOptions({theme: myTheme})
const APIGridTable = () => {
	const { token } = theme.useToken();
	const isDarkTheme = useMemo(() => {
		return token.colorBgContainer !== "#FFFFFF";
	}, [token.colorBgContainer]);

	const StatusCellRenderer = useCallback((params) => {
		let status = params.value;
		let color = "green";
		let icon = <CheckCircleOutlined />;
		if (status >= 400 && status < 500) {
			color = "yellow";
			icon = <ExclamationCircleOutlined />;
		} else if (status >= 500) {
			color = "red";
			icon = <CloseCircleOutlined />;
		}
		return (
			<Tooltip title={`HTTP Status Code: ${status}`}>
				<Tag color={color} icon={icon}>
					{status}
				</Tag>
			</Tooltip>
		);
	}, []);

	const gridApiRef = React.useRef<GridApi | null>(null);
	const [rowData, setRowData] = useState<ApiLog[]>([]);

	const fetchData = useCallback(async () => {
		const esQuery = {
			size: 100,
			query: {
				match_all: {},
			},
			sort: [{ "@timestamp": { order: "desc" } }],
		};
		const config: AxiosRequestConfig = {
			headers: {
				"Content-Type": "application/json",
				authorization: "Basic " + btoa("elastic:yL1lO7VVo2c6"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			const hits = response.data?.hits?.hits;

			if (hits && Array.isArray(hits)) {
				const formattedData: ApiLog[] = hits.map((hit: any) => ({
					_id: hit._id, // Store ES document ID

					...hit._source,
					// Ensure timestamp is a number (milliseconds) for sorting/formatting if needed
					timestamp:
						typeof hit._source["@timestamp"] === "string"
							? new Date(hit._source["@timestamp"]).getTime()
							: hit._source["@timestamp"],
				}));
				console.log("Formatted Data:", formattedData); // Log formatted data
				setRowData(formattedData);
			} else {
				console.warn("No hits found in Elasticsearch response or response format unexpected.");
				setRowData([]); // Set empty data if no hits
			}
			console.log("elastic search response: ", response.data);
		} catch (e) {
			toast.error(e.message);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const ActionCellRenderer = useCallback((params) => {
		const showDetails = () => {
			console.log("Show details for row:", params.data);
			toast.info(`Details for ID: ${params.data?._id || "N/A"}. Data: ${JSON.stringify(params.data)}`);
			// Implement modal/panel logic here using params.data
		};
		// Only render button if data exists for the row
		return params.data ? <Button type={"text"} icon={<MoreOutlined />} onClick={showDetails}></Button> : null;
	}, []);
	const columnDefs = useMemo<ColDef<ApiLog>[]>(
		() => [
			{
				headerName: "Timestamp",
				field: "timestamp", // Field name from ApiLogData
				valueFormatter: (params) => (params.value ? new Date(params.value).toLocaleString() : ""),
				sortable: true,
				filter: "agDateColumnFilter",
				floatingFilter: true,
				sort: "desc", // Default sort
				width: 200,
			},
			{
				headerName: "Server @IP", // Updated header
				field: "server_ip", // Field name from ApiLogData (mapped from 'request')
				sortable: true,
				filter: "agTextColumnFilter",
				floatingFilter: true,
				width: 300, // Give path more space
			},
			{
				headerName: "Status",
				field: "status", // Field name from ApiLogData (mapped from 'response')
				sortable: true,
				filter: "agNumberColumnFilter",
				floatingFilter: true,
				cellRenderer: StatusCellRenderer,
				width: 120,
				cellStyle: { textAlign: "center" },
			},
			{
				headerName: "Client IP",
				field: "client_ip", // Field name from ApiLogData
				sortable: true,
				filter: "agTextColumnFilter",
				floatingFilter: true,
				width: 150,
			},
			{
				headerName: "Port", // Simpler header
				field: "port", // Field name from ApiLogData
				sortable: true,
				filter: "agNumberColumnFilter",
				floatingFilter: true,
				//valueFormatter: (params) => formatBytes(params.value), // Use bytes formatter
				cellStyle: { textAlign: "right" },
				width: 130,
			},
			{
				headerName: "Level",
				field: "level",
				sortable: true,
				filter: "agTextColumnFilter",
			},
			{
				headerName: "Actions",
				field: "actions", // Doesn't need to exist in data
				cellRenderer: ActionCellRenderer,
				sortable: false,
				filter: false,
				floatingFilter: false,
				width: 80, // Slightly less width maybe
				resizable: false,
				pinned: "right",
			},
		],
		[StatusCellRenderer, ActionCellRenderer], // Dependencies
	);

	// --- Default Column Def ---

	const defaultColDef = useMemo<ColDef>(
		() => ({
			resizable: true,
			floatingFilter: true,
			filter: true,
			// Set minWidth to prevent columns becoming too small
			minWidth: 100,
		}),
		[],
	);
	const onGridReady = useCallback((params: GridReadyEvent) => {
		console.log("Grid Ready");
		gridApiRef.current = params.api;
		// Optionally apply initial size/state on ready if needed
		// params.api.autoSizeAllColumns(); // Example: Auto-size columns on load
	}, []);

	const formatBytes = (bytes, decimals = 2) => {
		if (bytes === null || bytes === undefined || bytes === 0) return "0 B";
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
	};

	const [visibleColumns, setVisibleColumns] = useState<string[]>(
		columnDefs.map((col) => col.field).filter((field) => field !== undefined) as string[],
	);

	const toggleColumn = (field: string) => {
		setVisibleColumns(
			(prev) =>
				prev.includes(field)
					? prev.filter((f) => f !== field) // Remove column
					: [...prev, field], // Add column
		);
	};

	const processedColumnDefs = columnDefs.map((col) => ({
		...col,
		hide: !visibleColumns.includes(col.field!),
	}));
	useEffect(() => {
		// Check if grid API is available and the component is still mounted
		if (gridApiRef.current?.applyColumnState) {
			// Debug log
			// Get the current state of all columns
			const columnState = gridApiRef.current.getColumnState();
			// Create the new state based on whether the column's ID is in visibleColumns
			const updatedState = columnState.map((cs) => ({
				...cs,
				// Use colId which usually matches the field name
				hide: !visibleColumns.includes(cs.colId),
			}));
			// Apply the new state to the grid
			gridApiRef.current.applyColumnState({ state: updatedState });
		} else {
			console.log("Grid API not ready for column state update yet."); // Debug log
		}
	}, [visibleColumns]);

	return (
		<div>
			<h4>Columns</h4>
			<Row className={"mb-6"}>
				{columnDefs.map((col) => (
					<Col key={col.field} span={12}>
						<Checkbox
							key={col.field}
							checked={visibleColumns.includes(col.field!)}
							onChange={() => toggleColumn(col.field!)}
							style={{ marginRight: 16 }}
						>
							{col.headerName}
						</Checkbox>
					</Col>
				))}
			</Row>

			<div
				className={isDarkTheme ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
				style={{ height: "600px", width: "100%" }} // Ensure fixed height, use string '600px'
			>
				<AgGridReact<ApiLog>
					columnDefs={columnDefs}
					rowData={rowData}
					defaultColDef={defaultColDef}
					onGridReady={onGridReady}
					modules={[AllCommunityModule]}
					// --- Pagination Fixes ---
					pagination={true}
					paginationPageSize={25} // Set desired default page size
					// Make sure paginationAutoPageSize is NOT set
					paginationPageSizeSelector={[10, 25, 50, 100, 500]}
					// --- Height Fix ---
					// Make sure domLayout='autoHeight' is NOT set

					// Other props...
					overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading...</span>'
					overlayNoRowsTemplate='<span style="padding: 10px;">No logs found.</span>'
					// autoSizeStrategy can stay if you like it
					autoSizeStrategy={{ type: "fitGridWidth", defaultMinWidth: 100 }}
				/>
			</div>
		</div>
	);
};

export default APIGridTable;
