import INVALID_CREDENTIALS from './invalidCredentials';
import INVALID_TOKEN from './invalidToken';
import INSUFFICIENT_PERMISSION from './insufficientPermission';
import INVALID_RESULT from './invalidResult';
import INCOMPATIBLE_VERSION from './incompatibleVersion';

const TEST = (parm) => {
    console.log('parm', parm);
    return ({
        message: parm,
    });
};

export {
    INVALID_CREDENTIALS,
    INVALID_TOKEN,
    INSUFFICIENT_PERMISSION,
    INCOMPATIBLE_VERSION,
    TEST,
    INVALID_RESULT,
};

export function error(res, { message, error: err, status = 200 }) {
    res.status(status).json({ error: err, message });
}
