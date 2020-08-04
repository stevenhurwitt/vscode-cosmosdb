export const isWindows: boolean = /^win/.test(process.platform);

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ext } from './extensionVariables';

export function getResourcesPath(): string {
    return ext.context.asAbsolutePath('resources');
}

export function getThemedIconPath(iconName: string): IThemedIconPath {
    const a = {
        light: path.join(getResourcesPath(), 'icons', 'light', iconName),
        dark: path.join(getResourcesPath(), 'icons', 'dark', iconName)
    };
    assert(fs.existsSync(a.light));
    return a;

resource_uri = 'https://management.azure.com/subscriptions/edd2e6d9-156f-4b79-a2e8-8427403a99f1/resourceGroups/m1explorer'