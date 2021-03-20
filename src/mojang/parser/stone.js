export default (data) => {
    data.libraries = data.libraries.map(l => ({
        type: 'MOJANG',
        ...l,
    }));
    data.arguments = {
        game: [
            ...data.minecraftArguments.split(' '),
            {
                rules: [
                    {
                        action: 'allow',
                        features: {
                            has_custom_resolution: true,
                        },
                    },
                ],
                value: [
                    '--width',
                    '${resolution_width}',
                    '--height',
                    '${resolution_height}',
                ],
            },
        ],
        jvm: [
            {
                rules: [
                    {
                        action: 'allow',
                        os: { name: 'osx' },
                    },
                ],
                value: ['-XstartOnFirstThread'],
            },
            {
                rules: [
                    {
                        action: 'allow',
                        os: { name: 'windows' },
                    },
                ],
                value: '-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump',
            },
            {
                rules: [
                    {
                        action: 'allow',
                        os: {
                            name: 'windows',
                            version: '^10\\.',
                        },
                    },
                ],
                value: ['-Dos.name=Windows 10', '-Dos.version=10.0'],
            },
            {
                rules: [
                    {
                        action: 'allow',
                        os: { arch: 'x86' },
                    },
                ],
                value: '-Xss1M',
            },
            '-Djava.library.path=${natives_directory}',
            '-Dminecraft.launcher.brand=${launcher_name}',
            '-Dminecraft.launcher.version=${launcher_version}',
            '-cp',
            '${classpath}',
        ],
    };

    delete data.minecraftArguments;
    return data;
};
