import {
    mojang, appRoot, HOST
} from '..';
import deleteEmpty from 'delete-empty';
import clone from 'clone';
import fse from 'fs-extra';

export const ADMIN = {
    group: 'ADMIN',
    level: 100,
};

export const EDITOR = {
    group: 'EDITOR',
    level: 50,
};

export const VIEWER = {
    group: 'VIEWER',
    level: 0,
};

export const groups = [ADMIN, EDITOR, VIEWER];

export function groupToLevel({ group }) {
    return groups.find(({ group: g }) => g === group).level;
}

export function levelToGroup(level) {
    return groups.find(({ level: l }) => l === level).group;
}

export const VERSIONS_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';

export const path = (n, type) => {
    const pkg = n.split(':')[0];
    const name = n.split(':')[1];
    const version = n.split(':')[2];
    if (type === 'file') return `${pkg.replace(/\./g, '/')}/${name}`;
    return `${pkg.replace(/\./g, '/')}/${name}/${version}/${name}-${version}.jar`;
};


export async function buildPack(db, id) {
    const packs = await db
        .collection('packs')
        .find({})
        .map(({ _id, ...fields }) => ({ id: _id, ...fields }))
        .toArray();
    const pack = packs.find(({ id: i }) => i == id)
    const { data } = await mojang.version(pack.preset);
    const copy = clone(data);
    if (pack) {
        copy.id = pack.name;
        copy.libraries = pack.libraries && pack.libraries.filter(({ name }) => {
            return pack.disabled && !pack.disabled.find(({ name: n, type }) => n == name && type == 'library')
        }).concat(data.libraries).map((lib) => {
            if (lib.type === 'CUSTOM')
                lib.downloads.artifact.url = `${HOST}${lib.downloads.artifact.url}`;
            return lib;
        });

        copy.files = pack.files && pack.files.filter(({ name }) => {
            return pack.disabled && !pack.disabled.find(({ name: n, type }) => n == name && type == 'file')
        }).map((file) => {
            if (file.type === 'CUSTOM')
                file.downloads.artifact.url = `${HOST}${file.downloads.artifact.url}`;
            return file;
        }) || undefined;

        copy.mainClass = pack.mainClass || copy.mainClass;
        if (pack.args) {
            copy.arguments.game = [ ...data.arguments.game, ...pack.args.split(' ') ];
        }

        if (pack.jvmArgs) {
            copy.arguments.jvm = [ ...pack.jvmArgs.split(' '), ...data.arguments.jvm ];
        }
    }
    const version = `${appRoot}/public/versions/${pack.name.toLowerCase()}.json`;
    await fse.createFile(version)
    await fse.writeJson(version, copy);
    await deleteEmpty(`${appRoot}/public/`);
   
}
