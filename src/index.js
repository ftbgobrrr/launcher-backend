import express from 'express';
import mongo from 'express-mongo-db';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import jwt from 'jwt-express';
import upash from 'upash';
import cors from 'cors';
import logger from 'morgan';
import fileUpload from 'express-fileupload';
import Mojang from './mojang';
import { error, INVALID_TOKEN, INSUFFICIENT_PERMISSION } from './errors';
import { addRoutes } from './routes';

const app = express();
const mojang = new Mojang();
const {
    PORT = 3000,
    HOST = 'http://localhost:3000',
    AUTH_SECRET = 'ducon',
    MONGO_URI = 'mongodb://localhost/launcher',
} = process.env;

app.use(logger('dev'));

app.use(mongo(MONGO_URI));
upash.install('argon2', require('@phc/argon2'));

app.use(cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(cookieParser());
app.use(jwt.init(AUTH_SECRET, { cookie: 'auth' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use('/public', express.static(`${__dirname}/public`));

addRoutes(app);

app.use((err, req, res, next) => {
    if (err.name == 'JWTExpressError') {
        if (err.message == 'JWT is insufficient') error(res, INSUFFICIENT_PERMISSION);
        else error(res, INVALID_TOKEN);
    } else {
		console.log(err);
        next(err);
    }
});

app.listen(PORT, () => {
    console.log(`Backend bind on port ${PORT}`);
});

const appRoot = __dirname;

export {
    mojang,
    appRoot,
    HOST,
    PORT,
};
