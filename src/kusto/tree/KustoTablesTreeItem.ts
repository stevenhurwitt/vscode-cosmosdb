/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Client, ClientConfig } from "azure-kusto-data";
import pgStructure, { Db } from "pg-structure";
import { Uri } from 'vscode';
import { getThemedIconPath } from "../../constants";
import { KustoDatabaseTreeItem } from "./KustoDatabaseTreeItem";
import { KustoResourcesTreeItemBase } from "./KustoResourcesTreeItemBase";
import { KustoTableTreeItem } from "./KustoTableTreeItem";

export class KustoTablesTreeItem extends KustoResourcesTreeItemBase {
    public static contextValue: string = "kustoTables";
    public readonly contextValue: string = KustoTablesTreeItem.contextValue;
    public readonly childTypeLabel: string = "Table";
    public readonly label: string = 'Tables';

    constructor(parent: KustoDatabaseTreeItem, clientConfig: ClientConfig) {
        super(parent);
        this.clientConfig = clientConfig;
    }

    public get iconPath(): string | Uri | { light: string | Uri; dark: string | Uri } {
        return getThemedIconPath('window.svg');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<KustoTableTreeItem[]> {

        const client = new Client(this.clientConfig);
        // need to implement this for kusto...
        const db: Db = await pgStructure(client);
        this.resourcesAndSchemas = {};
        for (const table of db.tables) {
            this.addResourcesAndSchemasEntry(table.name.trim(), table.schema.name);
        }
        return db.tables.map(table => new PostgresTableTreeItem(
            this,
            table,
            this.isDuplicateResource(table.name.trim())
        ));
    }

    public isAncestorOfImpl(contextValue: string): boolean {
        return contextValue === PostgresTableTreeItem.contextValue;
    }
}
