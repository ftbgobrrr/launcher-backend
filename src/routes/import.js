import express from 'express';
const router = express.Router();
import jwt from 'jwt-express';
import nodepath from 'path';
import fse from 'fs-extra';
import {promises as fs} from 'fs';
import extract from 'extract-zip'
import { promisify } from 'util';
import { ObjectId } from 'mongodb';
import sha1FileCallback from 'sha1-file';

import {
    mojang, appRoot, HOST, PORT,
} from '..';

import {
    buildPack
} from '../utils';

const sha1File = promisify(sha1FileCallback);

async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = nodepath.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function addFile(db, basepath, path, pack, type) {
    const cleanpath = (type === 'libraries' ? path.substring('libraries/'.length) : path).replace(/^\/|\/$/g, '');
    const splitpath = cleanpath.split('/');

    const getName = (type) => {
        if (type === 'libraries') {
            const packageName = splitpath.slice(0, -2).join('.')
            const version = splitpath[splitpath.length - 2]
            const libname = splitpath[splitpath.length - 1].replace('.jar', '');
            return `${packageName}:${libname}:${version}`;
        } else {
            const packageName = splitpath.slice(0, -1).join('.')
            const filename = splitpath[splitpath.length - 1];
            return `${packageName}:${filename}`;
        }
    }
    const name = getName(type);

    const url = `/public/${type}/${cleanpath}`.replaceAll(' ', '%20');
    const { size } = await fse.stat(basepath + '/' + path);
    const sha1 = await sha1File(basepath + '/' + path);
    const file = {
        name,
        type: 'CUSTOM',
        downloads: {
            artifact: {
                path: cleanpath,
                url,
                size,
                sha1,
            },
        }
    };

    const bulk = db.collection('packs').initializeOrderedBulkOp();
    bulk.find({ _id: new ObjectId(pack) }).updateOne({ $pull: { [type]: { name } } });
    bulk.find({ _id: new ObjectId(pack) }).updateOne({ $push: { [type]: file } });
    const { isOk } = await bulk.execute();

    const out = nodepath.normalize(`${appRoot}/public/${type}/${cleanpath}`);
    await fse.move(basepath + '/' + path, out, { overwrite: true });
   
    console.log(isOk);
}




router.post('/', async (req, res) => {
    const { pack } = req.body;
    if (!pack)
    {
        res.json({ error: 'pack is undefined' });
        return ;
    }

    const { files: { file } } = req;

    const zipOut = nodepath.normalize(`${appRoot}/public/import_temp/${pack}`);
    
    const zipFolder = await fs.stat(zipOut).catch(() => 'ok');
    console.log(zipFolder);
    if (zipFolder)
    {
        await fse.remove(zipOut);
        console.log('removed old folder')
    }

    await extract(file.tempFilePath, { dir: zipOut })

    const files = (await getFiles(zipOut)).map((path) => path.replace(zipOut + '/', ''));
    await Promise.all(files.map(path => {
        return addFile(req.db, zipOut, path, pack, path.startsWith('libraries') ? 'libraries' : 'files');
    }));

    await buildPack(req.db, pack);

    console.log(file);
    // await fse.remove(zipOut);
    // console.log('clean final install')

    res.send('hello')
});

module.exports = router;
