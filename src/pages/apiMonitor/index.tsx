import { Card, Statistic, Col, Row, Space } from "antd";
import { Table, Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import APIGridTable from "./ag-table";
import TotalCard from "./total-card";
import AreaDownload from "./area-download";
const columns = [
	{
		title: "Timestamp",
		dataIndex: "timestamp",
		key: "timestamp",
		render: (text) => new Date(text).toLocaleString(),
	},
	{
		title: "Endpoint",
		dataIndex: "endpoint",
		key: "endpoint",
	},
	{
		title: "Method",
		dataIndex: "method",
		key: "method",
	},
	{
		title: "Status",
		dataIndex: "status",
		key: "status",
		render: (status) => {
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
		},
		sorter: (a, b) => a.status - b.status,
	},
	{
		title: "Response Time (ms)",
		dataIndex: "responseTime",
		key: "responseTime",
		sorter: (a, b) => a.responseTime - b.responseTime,
		render: (time) => `${time} ms`,
		align: "right",
	},
];

const dummyTableData = [
	{
		key: "1",
		timestamp: Date.now() - 60000, // 1 minute ago
		endpoint: "/users",
		method: "GET",
		status: 200,
		responseTime: 120,
	},
	{
		key: "2",
		timestamp: Date.now() - 120000, // 2 minutes ago
		endpoint: "/products",
		method: "POST",
		status: 201,
		responseTime: 85,
	},
	{
		key: "3",
		timestamp: Date.now() - 180000, // 3 minutes ago
		endpoint: "/orders/123",
		method: "GET",
		status: 404,
		responseTime: 55,
	},
	{
		key: "4",
		timestamp: Date.now() - 240000, // 4 minutes ago
		endpoint: "/analytics",
		method: "GET",
		status: 500,
		responseTime: 250,
	},
	{
		key: "5",
		timestamp: Date.now() - 300000, // 5 minutes ago
		endpoint: "/auth/login",
		method: "POST",
		status: 200,
		responseTime: 90,
	},
];

function APIMonitor() {
	return (
		<div className="p-2">
			<Row justify="center">
				<Col span={24}>
					<Card title="API Response Time">
						<APIGridTable />
					</Card>
				</Col>
			</Row>
			<Row gutter={[16, 16]} className="mt-8">
				<Col span={24} md={8}>
					<TotalCard
						title="Total API requests"
						increase={false}
						count="18,765"
						percent="2.6%"
						chartData={[22, 8, 35, 50, 82, 84, 77, 12, 87, 43]}
					></TotalCard>
					<div className="mt-4">
						<TotalCard
							title="Your API requests"
							increase={true}
							count="458"
							percent="4.6%"
							chartData={[4, 21, 25, 36, 5, 8, 45, 7, 12, 8]}
						></TotalCard>
					</div>
				</Col>

				<Col span={24} md={16}>
					<AreaDownload />
				</Col>
			</Row>
		</div>
	);
}

export default APIMonitor;
