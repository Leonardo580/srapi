import React, { useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Button, ConfigProvider, Tag, theme, Tooltip } from "antd";
import Icon, {
	MoreOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	CloseCircleOutlined,
} from "@ant-design/icons";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Draggable } from "@fullcalendar/interaction/index.js";
import { ClientSideRowModelModule, themeQuartz } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
const darkTheme = themeQuartz.withParams({
	backgroundColor: "#1f2836",
	browserColorScheme: "dark",
	chromeBackgroundColor: {
		ref: "foregroundColor",
		mix: 0.07,
		onto: "backgroundColor",
	},
	fontFamily: "inherit",
	fontSize: 15,
	foregroundColor: "#FFF",
	headerFontSize: 14,
});
const lightTheme = themeQuartz.withParams({
	backgroundColor: "#ffffff",
	browserColorScheme: "light",
	chromeBackgroundColor: {
		ref: "foregroundColor",
		mix: 0.07,
		onto: "backgroundColor",
	},
	fontFamily: "inherit",
	fontSize: 15,
	foregroundColor: "#000",
	headerFontSize: 14,
});

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

	const columnDefs = useMemo<ColDef[]>(
		() => [
			{
				headerName: "Timestamp",
				field: "timestamp",
				valueFormatter: (params) => new Date(params.value).toLocaleString(), // Formatting in AG Grid
				sortable: true,
				floatingFilter: true,
			},
			{ headerName: "Endpoint", field: "endpoint", sortable: true, filter: true, floatingFilter: true }, // Added filter: true
			{ headerName: "Method", field: "method", sortable: true, filter: true, floatingFilter: true },
			{
				headerName: "Status",
				field: "status",
				sortable: true,
				filter: true,
				floatingFilter: true,
				cellRenderer: StatusCellRenderer, // Custom cell renderer for status
			},
			{
				headerName: "Response Time (ms)",
				field: "responseTime",
				sortable: true,
				filter: true,
				floatingFilter: true,
				valueFormatter: (params) => `${params.value} ms`,
				cellStyle: { textAlign: "right" }, // Align right for numbers
			},
			{
				headerName: "Actions",
				field: "actions",
				cellRenderer: (params) => {
					return <Button type={"text"} icon={<MoreOutlined />}></Button>; // Custom button for actions
				},
				sortable: false,
				filter: false,
				floatingFilter: false,
			},
		],
		[],
	);

	// Custom Cell Renderer for Status Column (similar to Ant Design Tag)

	const dummyGridData = useMemo(
		() => [
			{
				timestamp: Date.now() - 60000,
				endpoint: "/users",
				method: "GET",
				status: 200,
				responseTime: 120,
			},
			{
				timestamp: Date.now() - 120000,
				endpoint: "/products",
				method: "POST",
				status: 201,
				responseTime: 85,
			},
			{
				timestamp: Date.now() - 180000,
				endpoint: "/orders/123",
				method: "GET",
				status: 404,
				responseTime: 55,
			},
			{
				timestamp: Date.now() - 240000,
				endpoint: "/analytics",
				method: "GET",
				status: 500,
				responseTime: 250,
			},
			{
				timestamp: Date.now() - 300000,
				endpoint: "/auth/login",
				method: "POST",
				status: 200,
				responseTime: 90,
			},
		],
		[],
	);

	const defaultColDef = useMemo(
		() => ({
			sortable: true, // Enable sorting by default for all columns
			filter: true, // Enable filtering by default for all columns
			resizable: true, // Enable column resizing
		}),
		[],
	);

	return (
		<div style={{ height: 400, width: "100%" }}>
			<AgGridReact
				columnDefs={columnDefs}
				rowData={dummyGridData}
				theme={isDarkTheme ? darkTheme : lightTheme}
				defaultColDef={defaultColDef}
				autoSizeStrategy={{
					type: "fitGridWidth", // Resize columns to fit the grid width
					defaultMinWidth: 100, // Optional: Set a minimum width for columns
				}}
				pagination={true}
				paginationPageSize={5}
				paginationAutoPageSize={true}
				modules={[AllCommunityModule]} // Import the Client Side Row Model module
			/>
		</div>
	);
};

export default APIGridTable;
