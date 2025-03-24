import React from "react";
import { Area } from "@ant-design/charts";

interface RequestVolumeData {
	date: string; // Date in YYYY-MM-DD format
	requests: number; // Number of requests
}

const RequestVolumeChart: React.FC = () => {
	// Dummy data for request volume over time
	const data: RequestVolumeData[] = [
		{ date: "2023-10-01", requests: 120 },
		{ date: "2023-10-02", requests: 200 },
		{ date: "2023-10-03", requests: 150 },
		{ date: "2023-10-04", requests: 300 },
		{ date: "2023-10-05", requests: 280 },
		{ date: "2023-10-06", requests: 400 },
		{ date: "2023-10-07", requests: 500 },
		{ date: "2023-10-08", requests: 450 },
		{ date: "2023-10-09", requests: 600 },
		{ date: "2023-10-10", requests: 700 },
	];

	// Configuration for the area chart
	const config = {
		data,
		xField: "date", // X-axis: Date
		yField: "requests", // Y-axis: Number of requests
		xAxis: {
			type: "time", // Treat X-axis as time-based
			tickCount: 5, // Number of ticks on the X-axis
		},
		yAxis: {
			label: {
				formatter: (value: number) => `${value} req`, // Format Y-axis labels
			},
		},
		areaStyle: {
			fill: "l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff", // Gradient fill for the area
		},
		line: {
			color: "#1890ff", // Line color
		},
		point: {
			size: 4, // Size of data points
			shape: "circle", // Shape of data points
		},
		tooltip: {
			formatter: (datum: RequestVolumeData) => ({
				name: "Requests",
				value: `${datum.requests} requests`,
			}),
		},
		smooth: true, // Smooth line
		animation: {
			appear: {
				duration: 3000, // Animation duration
			},
		},
	};

	return <Area {...config} />;
};

export default RequestVolumeChart;
