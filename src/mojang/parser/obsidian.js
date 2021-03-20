export default (data) => {
    data.libraries = data.libraries.map(l => ({
        type: 'MOJANG',
        ...l,
    }));
    return data;
};
