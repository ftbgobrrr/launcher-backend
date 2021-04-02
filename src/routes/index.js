const routes = [
    {
        path: '/',
        route: require('./home'),
    },
    {
        path: '/packs',
        route: require('./packs'),
    },
    {
        path: '/import',
        route: require('./import'),
    },
    {
        path: '/news',
        route: require('./news')
    },
    {
        path: '/users',
        route: require('./users'),
    },
    {
        path: '/presets',
        route: require('./presets'),
    },
    {
        path: '/auth',
        route: require('./auth'),
    },
    
];

const loadRoutes = (app, routes) => {
    routes.forEach(({ path, sub, route }) => {
        if (sub) loadRoutes(route, sub);
        app.use(path, route);
    });
};

const addRoutes = (app) => {
    loadRoutes(app, routes);
};

export {
    addRoutes,
    routes,
};
