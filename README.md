# three_vite
Basic THREE.js template using [Vite](https://vitejs.dev).

Allows testing and modifying [official THREE.js examples](https://threejs.org/examples/) locally, at lightning speed.
After trying Parcel and Rollup, this is probably the most developer-friendly to start THREE.js development in 2023 : it's insanely fast, it supports live reload out of the box, while remaining simple to use and to extend.

## Batteries included

Pre-configured to support :

- glTF file loading
- ammo.js wasm physics library
- VSCode launch scripts
- THREE.js type definitions : for IntelliSense in VS Code

Have a look at vite.config.js and customize it to your needs (additional libraries, file formats etc.).

## Installation

Install [Node.js](https://nodejs.org)

- Clone or download repo
- run `npm install` : fetches and install all dependencies
- `npm run build` : packages all code and resources into the `dist` folder
- `npm run dev` : launches a server and opens your browser in `https://localhost:5173` by default
- Edit your code : your changes are reflected instantly!

## HTTPS

HTTPS is required to use some features such as the WebXR API


### Using Cloudflare Tunnel for free without a domain (recommended)

  - Install [Homebrew](https://brew.sh)

```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

then follow instructions


```bash
echo >> /Users/XXX/.zprofile

echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/XXX/.zprofile

eval "$(/opt/homebrew/bin/brew shellenv)"
```

  - **[Install `cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)**

```bash
brew install cloudflared
```
- run your app locally

```bash
npm run dev
```

- run `cloudflared` tunnel

```bash
cloudflared --url http://localhost:5173/
```

This will create a random temporary address ending in `*.trycloudflare.com`

You can share this address by sending a link or by generating a QR code (very useful for mobile devices and some XR headsets).

### Persistent link

If you want more persistence, you should register a domain name, or connect your github account to [Cloudflare Pages](https://pages.cloudflare.com) for free.

Alternatively, you could simply [use GitHub Pages to host your application persistently](https://sbcode.net/threejs/github-pages/).

### Tunneling alternatives

Check these tunneling alternatives such as `ngrok` or `zrok` for simple personal projects, use [tunneling solutions](https://github.com/anderspitman/awesome-tunneling) 


### Manual HTTPS setup

In order to use `https`, copy your certificates to the `.cert` folder, and change the `serve` command to:

`"serve": "http-server dist -S -C .cert/cert.pem -K .cert/key.pem`
