// Imports
import * as rp from 'request-promise';

export class DropBoxGateway {

    public async startSession(accessToken: string): Promise<string> {

        const parameters = {
            "close": false
        };

        const json = await rp({
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
    }

    public async appendSession(accessToken: string, sessionId: string, offset: number, buffer: Buffer): Promise<boolean> {
        const parameters = {
            "cursor": {
                "session_id": sessionId,
                "offset": offset
            },
            "close": false
        };

        await rp({
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
    }

    public async endSession(accessToken: string, sessionId: string, filename: string, fileSize: number): Promise<boolean> {
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

        await rp({
            method: 'POST',
            uri: 'https://content.dropboxapi.com/2/files/upload_session/finish',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Dropbox-API-Arg': JSON.stringify(parameters),
                'Content-Type': 'application/octet-stream'
            }
        });

        return true;
    }

}