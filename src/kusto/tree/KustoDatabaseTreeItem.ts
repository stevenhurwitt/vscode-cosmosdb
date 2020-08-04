import KustoManagementClient from '@azure/arm-kusto';
import { Client, ClientConfig } from 'azure-kusto-data';
import { ConnectionOptions } from 'tls';
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, GenericTreeItem, IParsedError, ISubscriptionContext, parseError, TreeItemIconPath } from 'vscode-azureextensionui';
import { getThemeAgnosticIconPath } from '../../constants';
import { ext } from '../../extensionVariables';
import { azureUtils } from '../../utils/azureUtils';
import { localize } from '../../utils/localize';
import { nonNullProp } from '../../utils/nonNull';
import { KustoClusterTreeItem } from './KustoClusterTreeItem';
import { KustoTablesTreeItem } from './KustoTablesTreeItem';

export class KustoDatabaseTreeItem extends AzureParentTreeItem<ISubscriptionContext> {
    public static contextValue: string = "KustoDatabase";
    public readonly contextValue: string = KustoDatabaseTreeItem.contextValue;
    public readonly childTypeLabel: string = "Resource Type";
    public readonly databaseName: string;
    public readonly parent: KustoServerTreeItem;
    public autoSelectInTreeItemPicker: boolean = true;

    constructor(parent: KustoClusterTreeItem, databaseName: string) {
        super(parent);
        this.databaseName = databaseName;
    }

    public get label(): string {
        return this.databaseName;
    }

    public get description(): string {
        return ext.connectedKustoDB?.fullId === this.fullId ? localize('connected', 'Connected') : '';
    }

    public get id(): string {
        return this.databaseName;
    }

    public get iconPath(): TreeItemIconPath {
        return getThemeAgnosticIconPath('Database.svg');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        try {
            const clientConfig: ClientConfig = await this.getClientConfig();
            const children: AzExtTreeItem[] = [
                new KustoTablesTreeItem(this, clientConfig)
            ];

            return children;
        } catch (error) {
            const parsedError: IParsedError = parseError(error);

            if (parsedError.errorType === invalidCredentialsErrorType) {
                // tslint:disable-next-line: no-floating-promises
                ext.ui.showWarningMessage(localize('couldNotConnect', 'Could not connect to "{0}": {1}', this.parent.label, parsedError.message));
            } else if (parsedError.errorType === firewallNotConfiguredErrorType) {
                const firewallTreeItem: AzExtTreeItem = new GenericTreeItem(this, {
                    contextValue: 'KustoFirewall',
                    label: localize('configureFirewall', 'Configure firewall to connect to "{0}"...', this.parent.label),
                    commandId: 'Kusto.configureFirewall'
                });
                firewallTreeItem.commandArgs = [this.parent];
                return [firewallTreeItem];
            } else {
                throw error;
            }
        }

        const credentialsTreeItem: AzExtTreeItem = new GenericTreeItem(this, {
            contextValue: 'KustoCredentials',
            label: localize('enterCredentials', 'Enter server credentials to connect to "{0}"...', this.parent.label),
            commandId: 'Kusto.enterCredentials'
        });
        credentialsTreeItem.commandArgs = [this.parent];
        return [credentialsTreeItem];
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const client: KustoManagementClient = createAzureClient(this.root, KustoManagementClient);
        await client.databases.deleteMethod(azureUtils.getResourceGroupFromId(this.fullId), this.parent.name, this.databaseName);
    }

    public async getClientConfig(): Promise<ClientConfig> {
        const { username, password } = await this.parent.getCredentials();

        if (username && password) {
            const ssl: ConnectionOptions = {
                // Always provide the certificate since it is accepted even when SSL is disabled
                // Certificate source: https://aka.ms/AA7wnvl
                ca: BaltimoreCyberTrustRoot
            };

            const host: string = nonNullProp(this.parent.server, 'fullyQualifiedDomainName');
            const clientConfig: ClientConfig = { user: username, password, ssl, host, port: 443, database: this.databaseName };

            // Ensure the client config is valid before returning
            const client: Client = new Client(clientConfig);
            try {
                await client.connect();
                return clientConfig;
            } finally {
                await client.end();
            }
        } else {
            throw {
                message: localize('mustEnterCredentials', 'Must enter credentials to connect to server.'),
                code: invalidCredentialsErrorType
            };
        }
    }
}

const BaltimoreCyberTrustRoot: string = `-----BEGIN CERTIFICATE-----
MIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ
RTESMBAGA1UEChMJQmFsdGltb3JlMRMwEQYDVQQLEwpDeWJlclRydXN0MSIwIAYD
VQQDExlCYWx0aW1vcmUgQ3liZXJUcnVzdCBSb290MB4XDTAwMDUxMjE4NDYwMFoX
DTI1MDUxMjIzNTkwMFowWjELMAkGA1UEBhMCSUUxEjAQBgNVBAoTCUJhbHRpbW9y
ZTETMBEGA1UECxMKQ3liZXJUcnVzdDEiMCAGA1UEAxMZQmFsdGltb3JlIEN5YmVy
VHJ1c3QgUm9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKMEuyKr
mD1X6CZymrV51Cni4eiVgLGw41uOKymaZN+hXe2wCQVt2yguzmKiYv60iNoS6zjr
IZ3AQSsBUnuId9Mcj8e6uYi1agnnc+gRQKfRzMpijS3ljwumUNKoUMMo6vWrJYeK
mpYcqWe4PwzV9/lSEy/CG9VwcPCPwBLKBsua4dnKM3p31vjsufFoREJIE9LAwqSu
XmD+tqYF/LTdB1kC1FkYmGP1pWPgkAx9XbIGevOF6uvUA65ehD5f/xXtabz5OTZy
dc93Uk3zyZAsuT3lySNTPx8kmCFcB5kpvcY67Oduhjprl3RjM71oGDHweI12v/ye
jl0qhqdNkNwnGjkCAwEAAaNFMEMwHQYDVR0OBBYEFOWdWTCCR1jMrPoIVDaGezq1
BE3wMBIGA1UdEwEB/wQIMAYBAf8CAQMwDgYDVR0PAQH/BAQDAgEGMA0GCSqGSIb3
DQEBBQUAA4IBAQCFDF2O5G9RaEIFoN27TyclhAO992T9Ldcw46QQF+vaKSm2eT92
9hkTI7gQCvlYpNRhcL0EYWoSihfVCr3FvDB81ukMJY2GQE/szKN+OMY3EU/t3Wgx
jkzSswF07r51XgdIGn9w/xZchMB5hbgF/X++ZRGjD8ACtPhSNzkE1akxehi/oCr0
Epn3o0WC4zxe9Z2etciefC7IpJ5OCBRLbf1wbWsaY71k5h+3zvDyny67G7fyUIhz
ksLi4xaNmjICq44Y3ekQEe5+NauQrz4wlHrQMz2nZQ/1/I6eYs9HRCwBXbsdtTLS
R9I4LtD+gdwyah617jzV/OeBHRnDJELqYzmp
-----END CERTIFICATE-----`;