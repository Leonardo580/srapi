import apiClient from "../apiClient.ts";
import axios from "axios";
import ApiClient from "../apiClient.ts";
import nestApiClient from "@/api/nestApiClient.ts";
interface elasticData {
    [key: string]: any;
}
export enum ElasticApi {
    SEARCH  ="/search",
}

class ElasticService {
    private readonly baseApi: string;
    constructor(baseUrl = "/elasticsearch/") {
        this.baseApi = baseUrl;
    }

    async getData(page: number, pageSize: number): Promise<any> {
        try {
            return await nestApiClient.get({
                url: `${this.baseApi}${ElasticApi.SEARCH}`,
                params: {
                    existsField: "server_ip",
                    page: page,
                    pageSize: pageSize,
                }
            },);
        }catch (error) {
            console.error(error);
        }
        return [];
    }
}

export default new ElasticService();