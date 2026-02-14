# three_vite_ts

TypeScript version of https://github.com/fdoganis/three_vite 

Requires TypeScript :

```bash
npm install -g typescript
```
on macOS :

```bash
sudo npm install -g typescript
```

Basic THREE.js template using [Vite](https://vitejs.dev).

Allows testing and modifying [official THREE.js examples](https://threejs.org/examples/) locally, at lightning speed.
After trying Parcel and Rollup, this is probably the most developer-friendly setup to start THREE.js development in 2026 : it's insanely fast, it supports live reload out of the box, while catching bugs early and remaining simple to use and to extend.

## Batteries included

### Pre-configured 

Supports :

- glTF file loading
  - with DRACO compression support
- ammo.js wasm physics library
  - but you should really give [cannon-es](https://github.com/pmndrs/cannon-es) a try!
- VSCode launch scripts
- **TypeScript** with THREE.js type definitions
  - for IntelliSense in VS Code
- recommended VS Code extensions

### Deployment to GitHub pages
  - make sure to [enable the publishing source in the settings of your repo](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)
  - in `Source` select `GitHub Actions`
    - see `deploy.yml` in `.github` folder
  - [set your website URL](https://github.com/orgs/community/discussions/46986)
    - in you repo click on the `gear icon` next to `About`
    - in `Website` add the following URL :
      - https://[GITUSERNAME].github.io/[REPOSITORY]_NAME

Have a look at vite.config.js and customize it to meet your needs (additional libraries, file formats etc.).

## Installation

- [Create your repo from template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template#creating-a-repository-from-a-template)
  - if you don't want to use the code as a template, clone or download repo
- Install [Node.js](https://nodejs.org)

- Commands (see package.json) 
  - `npm install` : fetches and installs all dependencies
  - `npm run dev` : launches a server and opens your browser in `https://localhost:5173` by default.
    - **fast**: no files generated
    - edit your code : your changes are reflected instantly!
  - `npm run build` : packages all code and resources into the `dist` folder, ready for deployment.
    - also generates main.js and map files to use in a pure JS environment
  - `npm run preview` : launches app using built files from dist folder
  - `npm run serve` : same as above, but more robust and faithful to final deployed app


## HTTPS

HTTPS is required to use the WebXR API


### Using Cloudflare Tunnel for free without an account or a domain (recommended)

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
npm run cloud
```
This command runs : `cloudflared tunnel --url http://localhost:5173/`

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

## Deploying the App with GitHub Pages

(original: https://github.com/meta-quest/webxr-first-steps?tab=readme-ov-file#build-and-deploy)

This repository includes a ready-to-use GitHub Actions workflow located at `.github/workflows/deploy.yml`, which automates both the build and deployment to GitHub Pages. Once enabled, every time you push changes to the `main` branch, a new build will automatically be deployed.

#### Steps to Enable GitHub Pages Deployment:

0. **IMPORTANT: Set the `base` variable** in `vite.config.js` (default name `/three_vite_ts`) to the actual name of your repository. Your app will be deployed to https://[GITUSERNAME].github.io/[REPOSITORY_NAME] (for example https://fdoganis.github.io/three_vite_ts)
1. Create your repository from this template or **Fork this repository** to your own GitHub account.
2. Navigate to your forked repository’s **Settings**.
3. Scroll down to the **Pages** section.
4. Under **Build and Deployment**, change the **Source** to **GitHub Actions**.

Once this is set, GitHub Actions will handle the build and deployment process automatically. Any time you push changes to the `main` branch, the app will be built and deployed to GitHub Pages without any additional manual steps.

You can monitor the status of the deployment job or manually re-run it via the **Actions** tab in your GitHub repository.

### Deploying to Your Own Hosting Solution

If you prefer to host the app yourself, you’ll need to manually build the app and then deploy the generated files to your hosting provider.

To generate the build, run the following command:

```bash
npm run build
```

This will create a `dist` folder containing the static files for the app. You can then upload these files to your hosting platform of choice.


# Credits

- Test model (red cube) from https://github.com/cx20/gltf-test/tree/master/sampleModels/Box (CC BY License)

- Some very interesting features (such as github pages deployment) have been borrowed from https://github.com/meta-quest/webxr-first-steps (MIT License)

  - Make sure to check this excellent tutorial out!
  - See [Deployment Instructions](https://github.com/meta-quest/webxr-first-steps?tab=readme-ov-file#build-and-deploy)
