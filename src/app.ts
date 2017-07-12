// Imports
import * as co from 'co';
import * as winston from 'winston';
import * as moment from 'moment';
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as delay from 'delay';
import * as readChunk from 'read-chunk';

// Import gateways
import { DropBoxGateway } from './dropbox-gateway';

const argv = require('yargs')
    .demand('fileNamePrefix', 'Filename Prefix')
    .demand('filePath', 'File Path')
    .demand('databaseName', 'Database Name')
    .demand('databaseUser', 'Database User')
    .demand('databasePassword', 'Database Password')
    .demand('databaseHost', 'Database Host')
    .demand('accessToken', 'Dropbox Access Token')
    .argv;

const fileNamePrefix = argv.fileNamePrefix;
const filePath = argv.filePath;
const databaseName = argv.databaseName;
const databaseUser = argv.databaseUser;
const databaseHost = argv.databaseHost;
const databasePassword = argv.databasePassword;
const accessToken = argv.accessToken;

co(function* () {

    while (true) {
        const dropBoxGateway = new DropBoxGateway();

        const fileName = `${fileNamePrefix}_${moment().format('MM-DD-YYYY-HH-mm-ss')}.Bak`;

        const sqlConfig = {
            user: databaseUser,
            password: databasePassword,
            server: databaseHost,
            database: databaseName
        };

        const pool = yield sql.connect(sqlConfig);
        const sqlResult = yield pool.request().query(`BACKUP DATABASE ${databaseName} TO DISK = '${path.join(filePath, fileName)}'`);
        pool.close();


        const fileSize = fs.statSync(path.join(filePath, fileName)).size;

        const chunkSize = 100000;

        const sessionId = yield dropBoxGateway.startSession(accessToken);

        for (let i = 0; i < fileSize; i = i + chunkSize) {
            const buffer = readChunk.sync(path.join(filePath, fileName), i, chunkSize);

            for (let j = 0; j < 5; j++) {
                try {
                    yield dropBoxGateway.appendSession(accessToken, sessionId, i, buffer);
                    break;
                } catch (err) {
                    winston.error(err);
                    yield delay(1000);
                }
            }

            winston.info(`${i} / ${fileSize}`);
        }

        yield dropBoxGateway.endSession(accessToken, sessionId, `/${fileName}`, fileSize);

        yield delay(43200000); // 12 Hours

    }

}).catch((err) => {
    winston.error(err);
});
