import { Card, Statistic, Col, Row, Space } from "antd";
import { Table, Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import APIGridTable from "./ag-table";
import TotalCard from "./total-card";
import AreaDownload from "./area-download";
import { useCallback, useEffect, useState } from "react";
import axios, { AxiosRequestConfig } from "axios";
import { toast } from "sonner";

const ELASTICSEARCHURL = "http://localhost:9200";
const ELATCIEARCH_INDEX = ".ds-logs-generic-default-2025.05.02-000001";
// const ELASTICSEARCH_ENDPOINT =  `${ELASTICSEARCHURL}/${ELATCIEARCH_INDEX}/_search`;
const ELASTICSEARCH_ENDPOINT = `/elasticsearch/${ELATCIEARCH_INDEX}/_search`;

function APIMonitor() {
	const [cardData, setCardData] = useState({
		loading: true,
		count: 0,
		percent: "0%",
		increase: false,
		chartData: [],
	});

	const [prevPercent, setPrevPercent] = useState(0);
	const [chartdata, setChartdata] = useState([]);

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
				authorization: "Basic " + btoa("elastic:changeme"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			if (response.status == 200) {
				const count = response.data?.total?.value || 0;
				const percentChange = prevPercent > 0 ? ((count - prevPercent) / prevPercent) * 100 : 100;

				setCardData((prev) => ({
					...prev,
					loading: false,
					count,
					percent: `${Math.abs(percentChange)}%`,
					increase: percentChange >= 0,
				}));
			} else {
				console.warn("No hits found in Elasticsearch response or response format unexpected.");
			}
		} catch (e) {
			toast.error(e.message);
		}
	}, [prevPercent]);

	const fetchPrevData = useCallback(async () => {
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
				authorization: "Basic " + btoa("elastic:changeme"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			if (response.status == 200) {
				setPrevPercent(response.data?.total?.value || 0);
			}
		} catch (e) {
			toast.error(e.message);
		}
	}, []);

	const fetchChartData = useCallback(async () => {
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
				authorization: "Basic " + btoa("elastic:changeme"),
			},
		};
		try {
			const response = await axios.post(ELASTICSEARCH_ENDPOINT, esQuery, config);
			if (response.status == 200) {
				const newChartData =
					response.data?.aggregations?.requests_over_time?.buckets?.map((bucket) => bucket.doc_count) || [];
				setChartdata(newChartData);
				setCardData((prev) => ({
					...prev,
					chartData: newChartData,
				}));
			}
		} catch (e) {
			toast.error(e.message);
		}
	}, []);



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
