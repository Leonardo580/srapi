// src/components/SearchUIElastic.tsx

import {
    SearchProvider,
    ErrorBoundary,
    Facet,
    SearchBox,
    Results,
    Paging,
    PagingInfo,
    ResultsPerPage,
    Sorting,
    WithSearch,
} from '@elastic/react-search-ui'; // Corrected import name
import type { SearchQuery, FacetConfiguration as SUFacetConfig } from '@elastic/search-ui';
import { Layout, Row, Col, Card, Divider, Typography, Spin } from 'antd';
import apiConnectorInstance from '@/api/services/elasticApiService'; // Your connector import

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

// This should be the ApiProxyConnector instance you configured earlier
// with endpoint, requestBodyFn, responseBodyFn
console.log("Imported Connector:", apiConnectorInstance);

type SUFacetConfig =
    | { type: "value"; size?: number; field: string; sort?: { order: "asc" | "desc"; name: "count" | "value" } }
    | { type: "range"; field: string; ranges: Array<{ from?: string | number; to?: string | number; name: string }> };

interface SearchQuery {
    indexName: string;
    search_fields?: Record<string, { weight?: number }>;
    result_fields?: Record<string, { raw?: { size?: number }; snippet?: { size?: number; fallback?: boolean } }>;
    facets?: Record<string, SUFacetConfig>;
    filters?: Array<{ field: string; values: any[]; type: "all" | "any" | "none" }>;
    disjunctiveFacets?: string[];
}

interface AutocompleteQueryConfig {
    results?: {
        resultsPerPage?: number;
        titleField: string;
    };
    result_fields?: Record<string, { raw?: { size?: number }; snippet?: { size?: number; fallback?: boolean } }>;
    search_fields?: Record<string, { weight?: number }>;
}



const facetConfigs: Record<string, SUFacetConfig> = {
    "@timestamp": {
        type: "range",
        field: "@timestamp",
        ranges: [
            { from: "now-1h/h", to: "now", name: "Last hour" },
            { from: "now-24h/d", to: "now", name: "Last day" },
            { from: "now-7d/w", to: "now", name: "Last week" },
            { from: "now-30d/d", to: "now", name: "Last 30 days" }
        ]
    },
    "client_ip": {
        type: "value",
        size: 10,
        field: "client_ip"
    },
    "server_ip": {
        type: "value",
        size: 10,
        field: "server_ip"
    },
    "http_method": {
        type: "value",
        size: 5,
        field: "http_method"
    },
    "http_status": {
        type: "value",
        size: 10,
        field: "http_status"
    },
    "host.name": {
        type: "value",
        size: 10,
        field: "host.name"
    },
    "tags": {
        type: "value",
        size: 10,
        field: "tags"
    }
};

const searchUiConfig = {
    apiConnector: apiConnectorInstance,
    alwaysSearchOnInitialLoad: true,
    searchQuery: {
        indexName: ".ds-logs-generic-*",

        search_fields: {
            "message": {weight: 3},
            // "event.original": { weight: 2 },
            // "host.name.text": {},
            // "log.file.path.text": {},
            "url": {},
            "client_ip": {},
            "server_ip": {},
            "http_method": {},
            "tags": {}
        } as Record<string, { weight?: number }>,

        result_fields: {
            "_id": {raw: {}},
            "@timestamp": {raw: {}},
            "message": {snippet: {size: 150, fallback: true}},
            // "host.name": { raw: {} },
            "client_ip": {raw: {}},
            "server_ip": {raw: {}},
            "http_method": {raw: {}},
            "http_status": {raw: {}},
            "url": {raw: {}},
            "response_time": {raw: {}},
            // "log.file.path": { raw: {} },
            // "event.original": { snippet: { size: 100, fallback: true } },
            "tags": {raw: {}}
        } as Record<string, { raw?: { size?: number }; snippet?: { size?: number; fallback?: boolean } }>,

        facets: facetConfigs,

    } as SearchQuery,

    autocompleteQuery: {
        results: {
            resultsPerPage: 5,
            titleField: "url",
        },
        result_fields: {
            "_id": {raw: {}},
            // "event.original": { snippet: { size: 100, fallback: true } },
            "message": {snippet: {size: 50, fallback: true}},
            // "host.name": { raw: {} }
        },
        search_fields: {
            "message": {},
            // "event.original": {},
            // "host.name.text": {},
            "url": {}
        }
    } as AutocompleteQueryConfig,

    initialState: {
        resultsPerPage: 10,
    },
}

const config = {
    alwaysSearchOnInitialLoad: true,
    apiConnector: apiConnectorInstance, // Make sure this is a valid instance
    hasA11yNotifications: true,
    searchQuery: {
        filters: [],
        search_fields: {
            message: {} // CORRECTED: Changed from "" to {}
        },
        result_fields: {
            message: {
                snippet: {
                    size: 10
                },
                fallback: true,
            }
        }
    },
    // autocompleteQuery: {
    //     results: {
    //         search_fields: {
    //             message: {} // This was already correct
    //         },
    //         resultsPerPage: 3,
    //         result_fields: {
    //             message: {
    //                 raw: {}
    //             }
    //         }
    //     },
    //     suggestions: {
    //         types: {
    //             documents: {
    //                 fields: ["message"]
    //             }
    //         },
    //         size: 2
    //     }
    // }
};


// Custom component to render each result item using AntD Card
// (CustomResultView remains the same as your provided code)
const CustomResultView = ({ result }: { result: any }) => {
    const title = result.message?.snippet || result.message?.raw || 'No Message';
    const id = result._id?.raw || 'N/A';
    const timestamp = result['@timestamp']?.raw ? new Date(result['@timestamp'].raw).toLocaleString() : 'N/A';
    const level = result.level?.raw || 'N/A';
    const clientIp = result.client_ip?.raw;

    return (
        <Card
            title={<div title={title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
            style={{ marginBottom: 16 }}
            size="small"
            extra={<Typography.Text type="secondary" title={`ID: ${id}`}>ID: {id.substring(0,8)}...</Typography.Text>}
        >
            <p><strong>Timestamp:</strong> {timestamp}</p>
            <p><strong>Level:</strong> {level}</p>
            {clientIp && <p><strong>Client IP:</strong> {clientIp}</p>}
        </Card>
    );
};


function SearchUIElastic() {
    // console.log("Effective SearchUI Config:", JSON.stringify(searchUiConfig, null, 2));
    return (
        <SearchProvider config={config}>
            <ErrorBoundary>
                <Layout style={{ minHeight: '100vh' }}>
                    <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
                        <Row style={{ width: '100%' }} align="middle">
                            <Col flex="auto">
                                <SearchBox
                                    // Autocomplete suggestions are driven by `autocompleteQuery` in config
                                    // and your ApiProxyConnector's onAutocomplete method.
                                    // Set `autocompleteSuggestions={true}` if you have it configured.
                                    // autocompleteSuggestions={{
                                    // sectionTitle: "Suggested Results"
                                    // }}
                                    inputProps={{ placeholder: "Search logs..." }}
                                />
                            </Col>
                        </Row>
                    </Header>

                    <Layout>
                        {/* Sider */}
                        <Sider
                            width={280}
                            theme="light"
                            style={{ background: '#fff', padding: '16px', borderRight: '1px solid #f0f0f0', overflow: 'auto', height: 'calc(100vh - 64px)', position: 'sticky', top: '64px' }}
                            breakpoint="lg"
                            collapsedWidth="0"
                        >
                            <Title level={5} style={{ marginBottom: 16 }}>Sort By</Title>
                            <Sorting
                                label="" // AntD Title provides the label
                                // sortOptions are typically derived from searchUiConfig.sortOptions
                                // or defaults if not provided there.
                                // If you define sortOptions in searchUiConfig, Search UI often uses those.
                                // Explicitly providing here overrides/supplements.
                                sortOptions={[
                                    { name: "Relevance", value: "", direction: "" },
                                    { name: "Timestamp (Newest)", value: "@timestamp", direction: "desc" },
                                    { name: "Timestamp (Oldest)", value: "@timestamp", direction: "asc" },
                                ]}
                            />
                            <Divider />
                            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Filter By</Title>
                            {/* Facet components will look for matching configurations in searchUiConfig.searchQuery.facets */}
                            <Facet field="level" label="Level" filterType="any" />
                            <Divider dashed />
                            <Facet field="client_ip" label="Client IP" filterType="any" isFilterable={true} />
                            {/* <Facet field="@timestamp" label="Timestamp" /> */}
                        </Sider>

                        {/* Content */}
                        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
                            <WithSearch mapContextToProps={({ isLoading, wasSearched, error, results }) => ({ isLoading, wasSearched, error, results })}>
                                {({ isLoading, wasSearched, error, results }) => (
                                    <>
                                        {error && (
                                            <Card style={{ marginBottom: 16, borderColor: 'red' }}>
                                                <Typography.Text type="danger">Error: {String(error)}</Typography.Text>
                                            </Card>
                                        )}
                                        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                                            <Col>
                                                {(wasSearched || searchUiConfig.alwaysSearchOnInitialLoad) && !isLoading && results.length > 0 && <PagingInfo />}
                                            </Col>
                                            <Col>
                                                {(wasSearched || searchUiConfig.alwaysSearchOnInitialLoad) && !isLoading && results.length > 0 && <ResultsPerPage options={[10, 20, 50]} />}
                                            </Col>
                                        </Row>

                                        {isLoading && <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>}

                                        {!isLoading && (wasSearched || searchUiConfig.alwaysSearchOnInitialLoad) && (
                                            <Results
                                                resultView={CustomResultView}
                                                titleField="message.raw" // Should match a field in your result_fields
                                                shouldTrackClickThrough={false}
                                            />
                                        )}

                                        {!isLoading && !wasSearched && !searchUiConfig.alwaysSearchOnInitialLoad && (
                                            <div style={{ textAlign: 'center', padding: '50px' }}>
                                                <Typography.Text type="secondary">Enter a search term to begin.</Typography.Text>
                                            </div>
                                        )}

                                        {(wasSearched || searchUiConfig.alwaysSearchOnInitialLoad) && !isLoading && results.length > 0 && (
                                            <Row justify="center" style={{ marginTop: 24 }}>
                                                <Col><Paging /></Col>
                                            </Row>
                                        )}
                                    </>
                                )}
                            </WithSearch>
                        </Content>
                    </Layout>
                </Layout>
            </ErrorBoundary>
        </SearchProvider>
    );
}

export default SearchUIElastic;