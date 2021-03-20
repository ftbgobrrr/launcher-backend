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
