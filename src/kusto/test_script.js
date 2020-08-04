"use strict";
exports.__esModule = true;
var azure_kusto_data_1 = require("azure-kusto-data");
var uuid_1 = require("uuid");

var clusterName = "m1explorer.westus";
var aadAppId = "2256c1bc-ad2d-499a-9795-52a1062bc462";
var AppKey = "kGC?M0L5FfOebZ_P:UohjYnvekeuT-77";
var authorityId = "09c16dc5-3124-4ec6-a31a-125b325f5de2";
var kcs = azure_kusto_data_1.KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(
  "https://" + clusterName + ".kusto.windows.net",
  aadAppId,
  AppKey,
  authorityId
);
var kustoClient = new azure_kusto_data_1.Client(kcs);

kustoClient.execute(
  "sourceWellDatabase",
  "apiV2CompletionSearchFinal | limit 1",
  function (err, results) {
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
var clientRequestProps = new azure_kusto_data_1.ClientRequestProperties();
var ONE_MINUTE = 1000 * 60;
clientRequestProps.setTimeout(ONE_MINUTE);
// having client code provide its own clientRequestId is
// highly recommended. It not only allows the caller to
// cancel the query, but also makes it possible for the Kusto
// team to investigate query failures end-to-end:
clientRequestProps.clientRequestId = "MyApp.MyActivity;" + uuid_1.v4();

kustoClient.execute(
  "sourceWellDatabase",
  "apiV2CompletionSearchFinal | limit 1",
  function (err, results) {
    if (err) throw new Error(err);
    console.log(JSON.stringify(results));
    console.log("--------------------------");
    console.log(results.primaryResults[0].toString());
  },
  clientRequestProps
);
