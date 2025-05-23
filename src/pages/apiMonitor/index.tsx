import { Card, Statistic, Col, Row, Space } from "antd";
import { Table, Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
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
		<div className="p-2">
			{/*<Row justify="center">*/}
			{/*	<Col span={24}>*/}
			{/*		<Card title="Search through docs ">*/}
			{/*			<SearchUIElastic/>*/}
			{/*		</Card>*/}
			{/*	</Col>*/}
			{/*</Row>*/}
			<Row justify="center">
				<Col span={24}>
					<Card title="Filter Logs">
						<GlobalLogFilterForm
							onApplyFilters={handleApplyGlobalFilters}
							initialFilters={logDataHook.currentGlobalFilters}
							loading={logDataHook.isLoading || logDataHook.isRefetching}
						/>
					</Card>
					<Card style={{ marginTop: '16px' }}>
						<LogsTable logDataHook={logDataHook} />
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
