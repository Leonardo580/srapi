import { Card, Statistic, Col, Row, Space, Button } from "antd";
import { Table, Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, ExperimentOutlined } from "@ant-design/icons";
import APIGridTable, { GlobalFilterState } from "./ag-table";
import TotalCard from "./total-card";
import AreaDownload from "./area-download";
import { useCallback, useEffect, useState } from "react";
import axios, { AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import GlobalLogFilterForm, { GlobalLogFilterFormProps} from "@/pages/apiMonitor/global-log-filter-form.tsx";
import SearchUIElastic from "./search-ui-elastic.tsx";
import { useLogsData } from "@/hooks/elasticsearch/useLogsData.ts";
import LogsTable from "./ag-table";
import Title from "antd/es/skeleton/Title";
const ELASTICSEARCHURL = "http://localhost:9200";
const ELATCIEARCH_INDEX = ".ds-logs-generic-default-2025.05.02-000001";
// const ELASTICSEARCH_ENDPOINT =  `${ELASTICSEARCHURL}/${ELATCIEARCH_INDEX}/_search`;
const ELASTICSEARCH_ENDPOINT = `/elasticsearch/${ELATCIEARCH_INDEX}/_search`;

function APIMonitor() {





	const logDataHook = useLogsData({});

	const handleApplyGlobalFilters = (filters: GlobalFilterState) => {
		logDataHook.setGlobalFilters(filters);
		// The hook's internal useEffect will now trigger fetchData
	};



	return (
		<div>
			<Title level={3} style={{ marginBottom: '24px' }}>Log Monitoring Dashboard</Title>

			<Row gutter={[24, 24]}> {/* Main gutter for sections */}
				<Col span={24}>
					<Card
						title={
							<Space>
								<ExperimentOutlined />
								Advanced Log Filters
							</Space>
						}
						bordered={false}
						style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}
					>
						<GlobalLogFilterForm
							onApplyFilters={handleApplyGlobalFilters}
							initialFilters={logDataHook.currentGlobalFilters}
							loading={logDataHook.isLoading || logDataHook.isRefetching || logDataHook.isMappingLoading}
						/>
					</Card>
				</Col>

				<Col span={24}>
					<Card
						title="Log Entries"
						bordered={false}
						style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}
						bodyStyle={{ padding: logDataHook.data.length === 0 && !logDataHook.isLoading ? '0' : '24px' }} // Remove padding if table is empty and not loading
					>
						<LogsTable logDataHook={logDataHook} />
					</Card>
				</Col>

				{/* Your existing stats cards */}
				<Col xs={24} lg={8}>
					<TotalCard
						title="Total API requests Today"
						increase={false} // This should be dynamic based on actual data
						count="18,765" // Dynamic
						percent="2.6%" // Dynamic
						chartData={[22, 8, 35, 50, 82, 84, 77, 12, 87, 43]}
					/>
					<div style={{ marginTop: '24px' }}>
						<TotalCard
							title="Your API requests Today"
							increase={true} // Dynamic
							count="458" // Dynamic
							percent="4.6%" // Dynamic
							chartData={[4, 21, 25, 36, 5, 8, 45, 7, 12, 8]}
						/>
					</div>
				</Col>
				<Col xs={24} lg={16}>
					<AreaDownload />
				</Col>
			</Row>
		</div>
	);
}
export default APIMonitor;
