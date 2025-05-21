// src/search-elastic-ui/custom-api-client-transporter.ts
import type { SearchRequest as ESSearchRequest } from '@elastic/elasticsearch/lib/api/types'; // For the body of ES search
import OriginalElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

import type  IApiClientTransporter  from "@elastic/search-ui-elasticsearch-connector";

import { Agent, fetch } from 'undici';
import * as fs from 'fs';
import { join } from 'path';

// Infer the type of the apiClient option from ElasticsearchAPIConnector's constructor
type ConnectorConstructorOptions = ConstructorParameters<typeof OriginalElasticsearchAPIConnector>[0];
// This should be the interface for the object passed to the apiClient option
type ActualApiClientInterface = NonNullable<any>;
// The 'SearchRequest' type here is the parameter to performRequest, not necessarily the full ES request body type.
// Let's check what `ActualApiClientInterface` looks like. It should be something like:
// { performRequest: (body: any) => Promise<any> }

interface CustomApiClientOptions {
    hostUrl: string;
    indexName: string; // The transporter still needs this to construct the full URL for _search
    apiKey: string;
    caPath?: string;
    rejectUnauthorized?: boolean;
    customHeaders?: Record<string, string>;
}

// Your class should implement the ActualApiClientInterface
export class CustomApiClientTransporter implements ActualApiClientInterface {
    private esAgent: Agent;
    private hostUrl: string;
    private indexName: string; // Store indexName
    private apiKey: string;
    private customHeaders: Record<string, string>;

    constructor(options: CustomApiClientOptions) {
        this.hostUrl = options.hostUrl;
        this.indexName = options.indexName; // Store indexName
        this.apiKey = options.apiKey;
        this.customHeaders = options.customHeaders || {};

        let caCertBuffer: Buffer | undefined;
        if (options.caPath && fs.existsSync(options.caPath)) {
            try {
                caCertBuffer = fs.readFileSync(options.caPath);
                console.log(`[CustomApiClientTransporter] Successfully loaded CA from: ${options.caPath}`);
            } catch (e) {
                console.error(`[CustomApiClientTransporter] FAILED to load CA from ${options.caPath}: ${e.message}`);
            }
        } else if (options.caPath) {
            console.warn(`[CustomApiClientTransporter] CA path specified but file not found: ${options.caPath}`);
        }

        let finalRejectUnauthorized = true;
        if (typeof options.rejectUnauthorized === 'boolean') {
            finalRejectUnauthorized = options.rejectUnauthorized;
        }

        this.esAgent = new Agent({
            connect: {
                ca: caCertBuffer,
                rejectUnauthorized: finalRejectUnauthorized,
            }
        });

        if (!finalRejectUnauthorized) {
            console.warn("[CustomApiClientTransporter] TLS certificate verification is DISABLED in Agent. This is insecure for production!");
        }
        console.log(`[CustomApiClientTransporter] Agent configured with rejectUnauthorized: ${finalRejectUnauthorized}, CA provided: ${!!caCertBuffer}`);
    }

    /**
     * @param requestBody This is the Elasticsearch query body already constructed by ElasticsearchAPIConnector
     */
    async performRequest(requestBody: any): Promise<any> { // The type of requestBody is often 'any' or a generic object
        // The ElasticsearchAPIConnector has already decided this is a search request and constructed the body.
        // It usually targets the _search endpoint.
        const targetUrl = `${this.hostUrl}/${this.indexName}/_search`; // Construct the full URL
        console.log(`[CustomApiClientTransporter] performRequest to: ${targetUrl}`);
        console.log(`[CustomApiClientTransporter] Request body from connector: ${JSON.stringify(requestBody)}`);


        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${this.apiKey}`,
            ...this.customHeaders,
        };

        try {
            const response = await fetch(targetUrl, {
                method: 'POST', // Typically POST for _search
                headers: headers,
                body: JSON.stringify(requestBody), // Send the body given by ElasticsearchAPIConnector
                dispatcher: this.esAgent
            });

            console.log(`[CustomApiClientTransporter] Response status: ${response.status}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[CustomApiClientTransporter] Error from Elasticsearch: ${response.status} - ${errorText}`);
                throw new Error(`Elasticsearch request failed: ${response.status} - ${errorText}`);
            }
            const responseData = await response.json();
            console.log('[CustomApiClientTransporter] Successfully received and parsed response from Elasticsearch.');
            // This responseData is the raw Elasticsearch response, which ElasticsearchAPIConnector will then process.
            return responseData;
        } catch (error) {
            console.error(`[CustomApiClientTransporter] Network or other error during fetch:`, error);
            if (error.cause) {
                console.error(`[CustomApiClientTransporter] Error cause:`, error.cause);
            }
            throw error;
        }
    }
}