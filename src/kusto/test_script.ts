import {
  Client as KustoClient,
  ClientRequestProperties,
  KustoConnectionStringBuilder,
} from "azure-kusto-data";
import { v4 as uuidv4 } from "uuid";

let clusterName = "m1explorer.westus";
let aadAppId = "2256c1bc-ad2d-499a-9795-52a1062bc462";
let AppKey = "kGC?M0L5FfOebZ_P:UohjYnvekeuT-77";
let authorityId = "09c16dc5-3124-4ec6-a31a-125b325f5de2";

const kcs = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(
  `https://${clusterName}.kusto.windows.net`,
  aadAppId,
  AppKey,
  authorityId
);
const kustoClient = new KustoClient(kcs);

kustoClient.execute(
  "sourceWellDatabase",
  "apiV2CompletionSearchFinal | limit 1",
  (err, results) => {
    if (err) throw new Error(err);
    console.log(JSON.stringify(results));
    console.log("--------------------------");
    console.log(results.primaryResults[0].toString());
    console.log("--------------------------");
  }
);

// providing ClientRequestProperties
// for a complete list of ClientRequestProperties
// go to https://docs.microsoft.com/en-us/azure/kusto/api/netfx/request-properties#list-of-clientrequestproperties
let clientRequestProps = new ClientRequestProperties();
const ONE_MINUTE = 1000 * 60;
clientRequestProps.setTimeout(ONE_MINUTE);

// having client code provide its own clientRequestId is
// highly recommended. It not only allows the caller to
// cancel the query, but also makes it possible for the Kusto
// team to investigate query failures end-to-end:
clientRequestProps.clientRequestId = `MyApp.MyActivity;${uuidv4()}`;

kustoClient.execute(
  "sourceWellDatabase",
  "apiV2CompletionSearchFinal | limit 1",
  (err, results) => {
    if (err) throw new Error(err);
    console.log(JSON.stringify(results));
    console.log("--------------------------");
    console.log(results.primaryResults[0].toString());
  },
  clientRequestProps
);
