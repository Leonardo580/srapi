import { Card, Statistic, Col, Row, Space } from "antd";
import { Table, Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import APIGridTable from "./ag-table";
import TotalCard from "./total-card";
import AreaDownload from "./area-download";
import { useCallback, useState } from "react";
import axios, { AxiosRequestConfig } from "axios";
import { toast } from "sonner";

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

const ELASTICSEARCHURL = "http://localhost:9200";
const ELATCIEARCH_INDEX = "index";
// const ELASTICSEARCH_ENDPOINT =  `${ELASTICSEARCHURL}/${ELATCIEARCH_INDEX}/_search`;
const ELASTICSEARCH_ENDPOINT = "/elasticsearch/.ds-kibana_sample_data_logs-2025.03.27-000001/_search";

function APIMonitor() {
	const [cardData, setCardData] = useState({
		loading: true,
		count: 0,
		percent: "0%",
		increase: false,
		chartData: [],
	});

	const data = {
		loading: true,
		count: 0,
		percent: "0%",
		increase: false,
		chartData: [],
	};

	const fetchData = useCallback(async () => {
		const esQuery = {
			size: 0,
			query: {
				range: {
					timestamp: {
						gte: "now-1d/d",
						lte: "now/d",
					},
				},
			},
		};

		const config: AxiosRequestConfig = {
			headers: {
				"Content-Type": "application/json",
				authorization: "Basic " + btoa("elastic:yL1lO7VVo2c6"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			if (response.status == 200) {
				data.percent = response.data?.total?.value;
				console.log("Formatted Data:", formattedData);
			} else {
				console.warn("No hits found in Elasticsearch response or response format unexpected.");
				// Set empty data if no hits
			}
			console.log("elastic search response: ", response.data);
		} catch (e) {
			toast.error(e.message);
		}
	}, []);
	let prevPercent = 0;
	const fetchData = useCallback(async () => {
		const esQuery = {
			size: 0,
			query: {
				range: {
					timestamp: {
						gte: "now-2d/d",
						lt: "now-1d/d",
					},
				},
			},
		};

		const config: AxiosRequestConfig = {
			headers: {
				"Content-Type": "application/json",
				authorization: "Basic " + btoa("elastic:yL1lO7VVo2c6"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			if (response.status == 200) {
				prevPercent = response.data?.total?.value;
			} else {
				console.warn("No hits found in Elasticsearch response or response format unexpected.");
				// Set empty data if no hits
			}
			console.log("elastic search response: ", response.data);
		} catch (e) {
			toast.error(e.message);
		}
	}, []);
	let chartdata;
	const fetchData = useCallback(async () => {
		const esQuery = {
			size: 0,
			query: {
				range: {
					timestamp: {
						gte: "now-7d/d",
						lte: "now/d",
					},
				},
			},
			aggs: {
				requests_over_time: {
					date_histogram: {
						field: "timestamp",
						calendar_interval: "day",
						min_doc_count: 0,
					},
				},
			},
		};

		const config: AxiosRequestConfig = {
			headers: {
				"Content-Type": "application/json",
				authorization: "Basic " + btoa("elastic:yL1lO7VVo2c6"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			if (response.status == 200) {
				chartdata = response.data?.aggregations.requests_over_time.buckets.map((bucket) => bucket.doc_count);
			} else {
				console.warn("No hits found in Elasticsearch response or response format unexpected.");
				// Set empty data if no hits
			}
			console.log("elastic search response: ", response.data);
		} catch (e) {
			toast.error(e.message);
		}
	}, []);
	const percentChange = prevPercent > 0 ? ((data.count - prevPercent) / prevPercent) * 100 : 100;

	setCardData({
		loading: false,
		count: data.count,
		percent: `${Math.abs(percentChange)}%`,
		increase: percentChange >= 0,
		chartData: chartdata,
	});

	return (
		<div className="p-2">
			<Row justify="center">
				<Col span={24}>
					<Card title="API Response Time">
						<APIGridTable />
					</Card>
				</Col>
			</Row>
			<Row gutter={[16, 16]} className="mt-8" justify="space-between">
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
