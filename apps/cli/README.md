# overpass-cli

Replays the webhooks of the Overpass sandbox on your local server. The command opens an outgoing connection to Overpass: no tunnel, no public URL, no open port.

```sh
npx overpass-cli listen --forward-to http://localhost:3000/webhook --key ovp_test_... --api https://<overpass api>
```

The sandbox page of Overpass gives this command ready to copy, with your test key and the API address. Node.js 20 or later.

| Flag | Environment variable | Value |
| --- | --- | --- |
| `--forward-to` | | Your local endpoint. Plain http is accepted only for localhost, 127.0.0.1 and [::1]. |
| `--key` | `OVERPASS_KEY` | A sandbox test key, `ovp_test_...`. Keep it secret: whoever holds it receives its webhooks. |
| `--api` | `OVERPASS_API_URL` | The address of the Overpass API, in https. |

Once installed (`npm install -g overpass-cli`), the command is `overpass listen ...`. Press Ctrl+C to stop.

- Body and headers reach your server byte for byte, so your signature check runs as in production.
- A key only receives its own webhooks.
- After a disconnection the relay reconnects by itself and receives what it missed.
- Each delivery shows in the Overpass inspector: sent, received locally, status, duration, and a Replay button.

The simulated providers are unofficial and built from public documentation only.

Licence: MIT.
