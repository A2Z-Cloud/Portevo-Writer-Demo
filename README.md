# Portevo-Writer-Demo
Repository for testing the [Zoho Writer](https://www.zoho.com/writer/) merge functionality for [Portevo](https://portevo.co/).

#### Notice
This is developer documenation written for unix systems (tested on OSX) in order to simplify working with the repository and certain actions through the command line interface. If you are using Windows or different varieties of Linux you may need to modify commands as appropriate.

This respoistory was setup by [A2Z Cloud](https://a2zcloud.com/) and is currently maintained and managed by [A2Z Cloud](https://a2zcloud.com/).

This repository is currently hosted on [Github](https://github.com/A2Z-Cloud/Portevo-Writer-Demo).

#### Links
- [About](#about)
- [First Time Setup](#first-time-setup)
- [Test](#test)
- [Dependencies](#dependencies)
- [Notes](#notes)
---

### About
This respository contains a fully working example of calling the Zoho Writer merge and sign API call, documented [here](https://www.zoho.com/writer/help/api/v1/merge-and-sign.html). The example is written in Node, tests are run using NPM. It is important to understand the basics of interacting with the Zoho API, in particular the [authentication](https://www.zoho.com/writer/help/api/v1/oauth-2.html) before attempting to use this code. The documentation for the writer API in general can be found [here](https://www.zoho.com/writer/help/api/v1/getting-started.html).

The test that is run in `index.js` is made of two parts. First is a call to an [endpoint](https://www.zoho.com/writer/help/api/v1/get-all-fields.html) that will return all the merge and sign metadata for the document. This can be used to verify that the merge data within the `merge.json` file is accurate and up to date. The second action is the actual call to the merge and sign endpoint. Each action is encapsulated in a function that actually makes the call and checks the API response.

#### `/`
In the root of the repository we use Make for first time setup. This simplifies the actions you need to take to get Node and NPM and any dependencies installed through use of a virtual environment. You will need to ensure you have a version [Python 3](https://www.python.org/downloads/) installed before you proceed as pip is used to setup the virtual environments.

##### `/test`
This folder contains JSON files where you can modify the merge data passed to Zoho during a test. The test will also output the results of the test to this folder as JSON.

##### `/lib`
Zoho authentication and some simple utility functions have been encapsulated into code in this folder. This just makes the code in the main test (`index.js`) easier to understand for the actual actions we are testing.

---

### First Time Setup
Follow these instructions if you are working with the repository for the first time.

#### Git
When working with this repository for the first time you will need to clone the repository from the service it is hosted with. This will create a local version of the code base for you to work with. You can either download the files directly from the hosting provider, clone through a connected git desktop application or through the CLI if you have git installed. 
```bash
# The url for cloning can be found where the repository is hosted.
git clone https://host.com/path/to/repo-name.git/
cd repo-name
```

#### Build Tools
From here on we will be working in the command line so make sure you have a terminal open in the root of the respository you just cloned. The next thing you will need to do is get the tools you need to work with this repository. If you already have some of these tools installed or are confident in what you are doing you can skip over any steps and proceed straight to [testing](#Test).

We will be making use of virtual environments to get together the tools we need so the only thing we need to make sure of at this stage is we have a version of Python 3 installed and usable in the command line. For those that don't, follow the setup directions [on the website](https://www.python.org/downloads/).

A make file has been made to simplify the virtual environments setup for python and node.
```bash
# Install virtual environments and project dependencies.
make setup
```
There should now be two new folders, not tracked in git, for each virtual environemnt in the root of the project. 

#### Environment
The tests will need to load certain settings and sensitive variables from an environment file. We do this to make it easier to have different settings between local instances but also to ensure we dont track sensitive data in our source control (git). This means, before you can run anything locally, you will need to setup an environment file.

Create yourself a new file called `.env` in the root `/` directory. Its content should match this template.
```txt
Z_TLD=<Zoho_Data_Center_Top_Level_Domain>
Z_CLIENT_ID=<Zoho_Developer_Client_ID>
Z_CLIENT_SECRET=<Zoho_Developer_Client_SECRET>
Z_REFRESH_TOKEN=<Generated_Refresh_Token>
Z_TEMPLATE_ID=<Zoho_Writer_Document_ID>
```
You will need to source the information required for each variable or decide what it should be for your setup. To generate credentials for the Zoho API you can go to the Zoho [API Console](https://api-console.zoho.eu/). You will need to generate an OAuth refresh token from a user account to add to this file. This allows the tests to perform its actions on behalf of the user. The TLD is usually either `eu` or `com` demending on your [data centre](https://www.zoho.com/writer/help/api/v1/getting-started.html). The template ID for the document you are using for a merge is found in the URL when viewing the document on Zoho, for example; `https://writer.zoho.eu/writer/template/64ypu36c27f996bc24a91a3f29fda48a0ba26` the code at the end of this URL.

---

### Test
First activate the node virtual environment.
```
. nenv/bin/activate
```
Then run the test. 
```bash
npm run test
```
This uses the script definiton in the NPM `package.json` to call the `index.js` through Node.

---

### Dependencies
All the external packages used in the repository will be listed here for reference.

#### Testing
| Package Name | Description |
| ------------ | ----------- |
| [dotenv](https://github.com/motdotla/dotenv) | For loading sensitive data into the environment at runtime. |

#### Project Tools
| Package Name | Description |
| ------------ | ----------- |
| [nenv](https://github.com/ekalinin/nodeenv) | A tool to create isolated node.js environments. |

---

### Notes
This is provided as a self-contained example of using the writer merge API in Node.js and attempts to use minimal dependencies so as to not distract from the purpose of showing the API usage. This interface is subject to changes with Zoho versioning their API and may not be in date as of you reading this.
