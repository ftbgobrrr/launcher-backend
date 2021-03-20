import { VERSIONS_URL } from '../utils'
import fetch from 'node-fetch';
import { INCOMPATIBLE_VERSION } from '../errors';

export default class Mojang {

    constructor() {
        this.manifest = null;
        this.parsers = [
            { min: 13, parser: () => import ('./parser/stone') },
            { min: 21, parser: () => import ('./parser/obsidian') },
        ]
    }

    async versions() {
        if (!this.manifest)
            await this.fetchManifest();
        return this.manifest.versions;
    }

    async version(id, full = true) {
        const version = (await this.versions()).find(({ id: i }) => i === id);
        if ((!version || !version.data) && full)
            await this.fetchVersion(id);
        return version;
    }

    async fetchManifest() {
        this.manifest = await fetch(VERSIONS_URL).then(res => res.json())
        return this.manifest;
    }

    async fetchVersion(id) {
        const version = (await this.versions()).find(({ id: i }) => i === id);
        version.data = await this.parseVersion(await fetch(version.url).then(res => res.json()));
        return version;
    }

    async parseVersion(data) {
        const { minimumLauncherVersion: jsonVersion } = data;
        const parser = this.parsers
            .sort(({ min: a }, { min: b}) => b - a)
            .find(({ min }) => min <= jsonVersion)
        if (!parser)
            throw INCOMPATIBLE_VERSION;
        return (await parser.parser()).default(data);
    }
}
