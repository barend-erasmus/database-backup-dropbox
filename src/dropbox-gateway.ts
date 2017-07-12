// Imports
import * as co from 'co';
import * as rp from 'request-promise';

export class DropBoxGateway {

    public startSession(accessToken: string): Promise<string> {

        return co(function* () {

            const parameters = {
                "close": false
            };

            const json = yield rp({
                method: 'POST',
                uri: 'https://content.dropboxapi.com/2/files/upload_session/start',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify(parameters),
                    'Content-Type': 'application/octet-stream'
                },
                json: true
            });

            return json.session_id;
        });
    }

    public appendSession(accessToken: string, sessionId: string, offset: number, buffer: Buffer): Promise<boolean> {

        return co(function* () {
            const parameters = {
                "cursor": {
                    "session_id": sessionId,
                    "offset": offset
                },
                "close": false
            };

            yield rp({
                method: 'POST',
                uri: 'https://content.dropboxapi.com/2/files/upload_session/append_v2',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify(parameters),
                    'Content-Type': 'application/octet-stream'
                },
                body: buffer
            });

            return true;
        });
    }

    public endSession(accessToken: string, sessionId: string, filename: string, fileSize: number): Promise<boolean> {

        return co(function* () {
            const parameters = {
                "cursor": {
                    "session_id": sessionId,
                    "offset": fileSize
                },
                "commit": {
                    "path": filename,
                    "mode": "add",
                    "autorename": true,
                    "mute": false
                }
            };

            yield rp({
                method: 'POST',
                uri: 'https://content.dropboxapi.com/2/files/upload_session/finish',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify(parameters),
                    'Content-Type': 'application/octet-stream'
                }
            });

            return true;
        });

    }

}