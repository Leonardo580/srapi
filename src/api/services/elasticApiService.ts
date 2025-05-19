
import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";
const ELASTIC_ENDPOINT = "/search/search-ui";
import { ApiProxyConnector } from "@elastic/search-ui-elasticsearch-connector";
const connect = new ApiProxyConnector({
    basePath: "/elasticsearch",

    fetchOptions: {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        }
    }
});
// const connect = new ElasticsearchAPIConnector({
//     host: "https://localhost:9200",
//     index: ".ds-logs-generic*",
//     connectionOptions: {
//         headers: {
//             Authorization: `Basic elastic:changeme`,
//         }
//     }
// });

export default connect;