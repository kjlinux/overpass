# overpass-cli

Replays the webhooks of the Overpass sandbox on your local server. The command opens an outgoing connection to Overpass: no tunnel, no public URL, no open port.

```sh
npx overpass-cli listen --forward-to http://localhost:3000/webhook --key ovp_test_... --api https://<overpass api>
```

- Body and headers reach your server byte for byte, so your signature check runs as in production.
- A key only receives its own webhooks.
- After a disconnection the relay reconnects by itself and receives what it missed.
- Each delivery shows in the Overpass inspector: sent, received locally, status, duration, and a Replay button.

The simulated providers are unofficial and built from public documentation only.

Licence: MIT.
