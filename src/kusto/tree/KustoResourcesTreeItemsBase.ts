/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ClientConfig } from "azure-kusto-data";
import { AzureParentTreeItem, ISubscriptionContext } from "vscode-azureextensionui";
import { KustoDatabaseTreeItem } from "./KustoDatabaseTreeItem";

// Base class for Postgres tree items whose children are individual resources
export abstract class KustoResourcesTreeItemBase extends AzureParentTreeItem<ISubscriptionContext> {
    public parent: KustoDatabaseTreeItem;
    public clientConfig: ClientConfig;
    public resourcesAndSchemas: { [key: string]: string[] }; // Resource name to list of schemas

    public addResourcesAndSchemasEntry(name: string, schema: string): void {
        if (this.resourcesAndSchemas[name]) {
            this.resourcesAndSchemas[name].push(schema);
        } else {
            this.resourcesAndSchemas[name] = [schema];
        }
    }

    public isDuplicateResource(name: string): boolean {
        return this.resourcesAndSchemas[name].length > 1;
    }
}
