/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import KustoManagementClient from '@azure/arm-kusto';
import { Database, DatabaseListResult, Cluster } from 'azure-arm-kusto/lib/models';
import { coerce, gte, SemVer } from 'semver';
import * as vscode from 'vscode';
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, ICreateChildImplContext, ISubscriptionContext } from 'vscode-azureextensionui';
import { getThemeAgnosticIconPath } from '../../constants';
import { ext } from '../../extensionVariables';
import { azureUtils } from '../../utils/azureUtils';
import { localize } from '../../utils/localize';
import { nonNullProp } from '../../utils/nonNull';
import { KustoDatabaseTreeItem } from './KustoDatabaseTreeItem';
import { KustoTablesTreeItem } from './KustoTablesTreeItem';
import { KustoTableTreeItem } from './KustoTableTreeItem';

export class KustoClusterTreeItem extends AzureParentTreeItem<ISubscriptionContext> {
    public static contextValue: string = "kustoCluster";
    public static serviceName: string = "ms-azuretools.vscode-azuredatabases.kustoPasswords";
    public readonly contextValue: string = kustoClusterTreeItem.contextValue;
    public readonly childTypeLabel: string = "Database";
    public readonly server: Cluster;
    public resourceGroup: string;


    constructor(parent: AzureParentTreeItem, cluster: Cluster) {
        super(parent);
        this.cluster = cluster;
        this._clusterId = nonNullProp(this.cluster, 'id');
        this.resourceGroup = azureUtils.getResourceGroupFromId(this.fullId);
    }

    public get iconPath(): string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } {
        return getThemeAgnosticIconPath('PostgresServer.svg');
    }

    public get label(): string {
        return this.name;
    }

    public get name(): string {
        return nonNullProp(this.cluster, 'name');
    }

    public get id(): string {
        return nonNullProp(this.cluster, 'id');
    }

    public get description(): string | undefined {
        return "Kusto";
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        const client: KustoManagementClient = createAzureClient(this.root, KustoManagementClient);
        const listOfDatabases: DatabaseListResult = await client.databases.listByCluster(this.resourceGroup, this.name);
        return this.createTreeItemsWithErrorHandling(
            listOfDatabases,
            'invalidKustoCluster',
            (database) => {
                return database.name && !['azure_maintenance', 'azure_sys'].includes(database.name) ? new KustoDatabaseTreeItem(this, database.name) : undefined;
            },
            (database) => database.name
        );
    }

    public isAncestorOfImpl(contextValue: string): boolean {
        switch (contextValue) {
            case KustoDatabaseTreeItem.contextValue:
            case KustoTablesTreeItem.contextValue:
            case KustoTableTreeItem.contextValue:
                return true;
            default:
                return false;
        }
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<KustoDatabaseTreeItem> {
        const client: KustoManagementClient = createAzureClient(this.root, KustoManagementClient);
        const getChildrenTask: Promise<AzExtTreeItem[]> = this.getCachedChildren(context);
        const databaseName = await ext.ui.showInputBox({
            placeHolder: "Database Name",
            prompt: "Enter the name of the database",
            validateInput: (name: string) => validateDatabaseName(name, getChildrenTask)
        });
        context.showCreatingTreeItem(databaseName);
        const database: Database = { name: databaseName };
        await client.databases.createOrUpdate(this.resourceGroup, this.name, databaseName, database);
        return new KustoDatabaseTreeItem(this, databaseName);
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const client: KustoManagementClient = createAzureClient(this.root, KustoManagementClient);
        const deletingMessage: string = `Deleting server "${this.name}"...`;
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: deletingMessage }, async () => {
            await client.servers.deleteMethod(this.resourceGroup, this.name);
            await this.deletePostgresCredentials();
        });
    }

    public async getCredentials(): Promise<{ username: string | undefined, password: string | undefined }> {
        let username: string | undefined;
        let password: string | undefined;

        const storedValue: string | undefined = ext.context.globalState.get(KustoServerTreeItem.serviceName);
        if (storedValue && ext.keytar) {
            const servers: IPersistedServer[] = JSON.parse(storedValue);
            for (const server of servers) {
                if (server.id === this._serverId) {
                    username = server.username;
                    password = await ext.keytar.getPassword(KustoClientTreeItem.serviceName, this._serverId) || undefined;
                    break;
                }
            }
        }

        return { username, password };
    }


    private async deletePostgresCredentials(): Promise<void> {
        if (ext.keytar) {
            const serviceName: string = KustoClusterTreeItem.serviceName;
            const storedValue: string | undefined = ext.context.globalState.get(serviceName);
            let clusters: IPersistedServer[] = storedValue ? JSON.parse(storedValue) : [];

            // Remove this server from the cache
            clusters = clusters.filter((cluster: IPersistedServer) => { return cluster.id !== this.id; });

            await ext.context.globalState.update(serviceName, JSON.stringify(servers));
            await ext.keytar.deletePassword(serviceName, this.id);
        }
    }
}

async function validateDatabaseName(name: string, getChildrenTask: Promise<AzExtTreeItem[]>): Promise<string | undefined | null> {
    if (!name) {
        return localize('NameCannotBeEmpty', 'Name cannot be empty.');
    }
    const currDatabaseList = await getChildrenTask;
    const currDatabaseNames: string[] = [];
    for (const db of currDatabaseList) {
        if (db instanceof KustoDatabaseTreeItem) {
            currDatabaseNames.push(db.databaseName);
        }
    }
    if (currDatabaseNames.includes(name)) {
        return localize('NameExists', 'Database "{0}" already exists.', name);
    }
    return undefined;
}
