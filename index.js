// –––– IMPORTS –––– //
// module imports
const querystring = require('querystring')
const fs = require("fs")
require('dotenv').config()

// local imports
const { get_env_token } = require('./lib/auth')
const Utils = require('./lib/utils')
const HTTP_CODE = Utils.HTTP_CODE

// –––– CONSTANTS –––– //
const WRITER_API = {
    URL: `zohoapis.${process.env.Z_TLD}`,
    DOCUMENTS_PATH: `/writer/api/v1/documents`
}

// –––– FUNCTIONS –––– //
/**
 * Returns all defined merge fields.
 * Requires auth scopes:
 * ZohoWriter.documentEditor.ALL,ZohoWriter.merge.ALL,ZohoSign.documents.ALL
 * @param token The access token used to auth the request
 * @param body The content passed to the deluge function
 * @returns {Object}
 */
const get_all_fields = async (token, document_id) => {
    // build options
    const options = {
        host: WRITER_API.URL,
        path: `${WRITER_API.DOCUMENTS_PATH}/${document_id}/fields`,
        method: 'GET',
        headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        }
    }

    // send request
    const result = await Utils.send(options)
    Utils.check_result(options, null, result) 

    // return content
    return result.body
}

/**
 * Merges data and sends for signatures.
 * Requires auth scopes:
 * ZohoWriter.documentEditor.ALL,ZohoWriter.merge.ALL,ZohoSign.documents.ALL
 * @param token The access token used to auth the request
 * @param body The content passed to the deluge function
 * @returns {Object}
 */
 const merge_and_sign = async (token, document_id, payload) => {
    // build options
    const options = {
        host: WRITER_API.URL,
        path: `${WRITER_API.DOCUMENTS_PATH}/${document_id}/merge/sign`,
        method: 'POST',
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
    }

    // send request as form
    const form_data = querystring.stringify(payload)
    options.headers['Content-Length'] = form_data.length
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const result = await Utils.send(options,form_data)
    Utils.check_result(options, form_data, result) 

    // send request as json
    // options.headers['Content-Type'] = 'application/json'
    // const result = await Utils.send(options,payload)
    // Utils.check_result(options, payload, result) 

    // return content
    return result.body
}

// generate an access token then make call
get_env_token(process.env.Z_REFRESH_TOKEN).then(token => {
    // get field ids
    get_all_fields(token,process.env.Z_TEMPLATE_ID)
    .then(result => {
        const log = JSON.stringify(result,null,4)
        // console.log(log)
        fs.writeFileSync(`${__dirname}/test/fields.json`,log)
    })

    // load merge data from file
    let data = fs.readFileSync(`${__dirname}/test/merge.json`,'utf8')
    if(data == null) throw Error("Missing data.")
    else data = JSON.parse(data)

    // stringify the signer and merge data before it form encodes
    // NOTE: not sure why but Node querystring seems to not encode 
    // unless these values are strings
    data.signer_data = JSON.stringify(data.signer_data)
    data.merge_data = JSON.stringify(data.merge_data)

    // test merge and sign
    merge_and_sign(token,process.env.Z_TEMPLATE_ID,data)
    .then(result => {
        // log the call result
        const log = JSON.stringify(result,null,4)
        // console.log(log)
        fs.writeFileSync(`${__dirname}/test/result.json`,log)
    })
})
