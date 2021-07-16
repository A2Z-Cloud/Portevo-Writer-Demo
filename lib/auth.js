// –––– IMPORTS –––– //
// local imports
const Utils = require('./utils')


// –––– CONSTANTS –––– //
// Zoho Account (OAuth) URI Settings
const Z_AUTH = {
    URL: `accounts.zoho.${process.env.Z_TLD}`,
    AUTH_PATH: `/oauth/v2/auth`,
    TOKEN_PATH: `/oauth/v2/token`,
    USER_PATH: `/oauth/user/info`
}


// –––– GLOBALS –––– //
/**
 * Vairable used to track API access token timeout - epoch time for when the token
 * will expire.
 * @global z_expiry
 * @type {number}
 * @default
 */
 let z_expiry = null

 /**
  * Variable used to store the current active API access token.
  * @global z_access_token
  * @type {string}
  * @default
  */
 let z_access_token = null


// –––– FUNCTIONS –––– //
/**
 * Takes a refresh and access token, with a timeout, and adds them to the session on the context.
 * @function set_session_token
 * @param ctx The Koa context containing a client session.
 * @param refresh_token The token used to generate an access token.
 * @param access_token The token used to access the API.
 * @param timeout The lifetime of the access token in ms. Defaults to one hour.
 */
const set_session_token = (ctx, refresh_token, access_token, timeout=3600) => {
    // set the timeout for the access token
    // NOTE: remove some time from the expiry to make sure its always refreshed well within the limit
    ctx.session.z_expiry = Date.now() + (timeout*1000) - 1000

    // set the refresh and access tokens
    ctx.session.z_refresh_token = refresh_token
    ctx.session.z_access_token = access_token
}

/**
 * Checks the current state of the session and if a login is required.
 * @function validate_session
 * @param ctx The Koa context containing a client session.
 * @returns {boolean} True for valid, False for invalid.
 */
const validate_session = (ctx) => {
    const valid = ctx.session.z_refresh_token ? true : false
    // console.info(`Session validated as ${valid} with token ${ctx.session.z_refresh_token}`)
    return valid
}

/**
 * Revokes the current refresh token and removes it from the session
 * @function invalidate_session
 * @async
 * @param ctx The Koa context containing a client session.
 */
const invalidate_session = async(ctx) => {
    // prepare query params for the request
    const params = {
        token: ctx.session.z_refresh_token
    }
    const options = {
        host: Z_AUTH.URL,
        path: `${Z_AUTH.TOKEN_PATH}/revoke${Utils.to_query_string(params)}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }

    // send the request
    let response = null
    try { response = await Utils.send(options) }
    catch(err) { throw err }

    // validate the response format
    if(!(response.body && (response.body.status == 'success' || response.statusCode == 400)))
        throw Error(`Unexpected token response: ${JSON.stringify(response)}`)

    // clear the session
    set_session_token(ctx,null,null)
}

/**
 * Build the full url and query params needed to redirect to the
 * Zoho Accounts OAuth consent page.
 * @function get_code_redirect
 * @returns {string} The redirect url.
 */
const get_code_redirect = () => {
    // set the base url
    const redirect_url = `https://${Z_AUTH.URL}${Z_AUTH.AUTH_PATH}`
    
    // prepare url query params
    const redirect_params = {
        client_id: process.env.Z_CLIENT_ID,
        redirect_uri: process.env.Z_CLIENT_REDIRECT,
        scope: process.env.Z_AUTH_SCOPE,
        response_type: "code",
        access_type: "offline",
        prompt: "consent"
    }

    return redirect_url + Utils.to_query_string(redirect_params)
}

/**
 * Sends a request for a new refresh and access token using the client defined
 * in the environment variables and the generated auth code. Note that this will
 * store the generated access tokens in the session.
 * @function generate_access_token
 * @async
 * @param ctx The Koa context containing a client session.
 * @param code The auth code returned for the OAuth consent redirect.
 * @returns {string} The new access token or null if it failed to generate.
 */
const generate_access_token = async(ctx, code) => {
    // prepare query params for the request
    const token_params = {
        client_id: process.env.Z_CLIENT_ID,
        client_secret: process.env.Z_CLIENT_SECRET,
        redirect_uri: process.env.Z_CLIENT_REDIRECT,
        code: code,
        grant_type: "authorization_code"
    }

    // send the request
    let response = null
    try {
        response = await Utils.send({
            host: Z_AUTH.URL,
            path: Z_AUTH.TOKEN_PATH + Utils.to_query_string(token_params),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }) 
    } catch(err) { throw err }

    // validate the response format
    if(!(response.body && response.body.refresh_token))
        throw Error(`Unexpected token response: ${JSON.stringify(response)}`)

    // add tokens to session
    set_session_token(
        ctx,
        response.body.refresh_token,
        response.body.access_token,
        response.body.expires_in
    )

    // return the access token
    return response.body.access_token
}

/**
 * Uses a refresh token to generate a new access token.
 * @function refresh_access_token
 * @async
 * @param refresh_token The refresh token used to fetch a new access token.
 * @returns {Object} The new access token and expiry.
 */
const refresh_access_token = async(refresh_token) => {
    // build the query string
    const params = {
        client_id: process.env.Z_CLIENT_ID,
        client_secret: process.env.Z_CLIENT_SECRET,
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
    }

    // set the request options
    const options = {
        host: Z_AUTH.URL,
        path: Z_AUTH.TOKEN_PATH + Utils.to_query_string(params),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }

    // refresh the token
    const response = await Utils.send(options)
    Utils.check_result(options, null, response, "refresh_access_token")

    // add tokens to session
    return {
        access_token: response.body.access_token,
        timeout: response.body.expires_in
    }
}

/**
 * Identifies if a valid access token already exists. If not, generates a new
 * access token and resets the token timeout.
 * @function get_env_token
 * @async
 * @returns {string|Null} the existing or new API access token or null if generation failed
 */
const get_env_token = async(refresh_token) => {
    // check access token exists and has not expired
    const valid_token = (z_access_token != null && z_expiry > Date.now())
    if(valid_token === false) {
        // attempt to generate a new token
        let result = {}
        try { result = await refresh_access_token(refresh_token) }
        catch(err) { throw err }

        // update the access token and expiry globals
        z_access_token = result.access_token
        z_expiry = Date.now() + result.timeout
    }

    // return access token
    return z_access_token
}

/**
 * Validates an access token exists in the session and has not expired, otherwise a new
 * token will be generated and the result returned.
 * @function get_session_token
 * @async
 * @param ctx The Koa context containing a client session.
 * @returns {string|Null} The existing or new API access token or null if generation failed.
 */
const get_session_token = async(ctx) => {
    // get the token and expiry time from the session
    const refresh_token = ctx.session.z_refresh_token || null
    let access_token = ctx.session.z_access_token || null
    let expiry = ctx.session.z_expiry

    // if no refresh token exists in the session at all then return null
    // NOTE: the user should sign in before this as they need a refresh token
    if(refresh_token == null) return null

    // check token has not expired
    let has_expired = expiry < Date.now()
    // console.log('Validating session for request: ',ctx.request.url)
    // console.log('Time is: ',Utils.format_date(new Date()))
    // console.log('Session expires at: ',Utils.format_date(new Date(expiry)))
    // console.log('Session invalid: ',has_expired,'\n')
    if(access_token == null || has_expired) {
        // attempt to generate a new token
        let result = {}
        try { result = await refresh_access_token(refresh_token) }
        catch(err) { throw err }
        
        // update the session and token
        set_session_token(ctx, refresh_token, result.access_token, result.timeout)
        access_token = result.access_token ? result.access_token : null
    }

    // return the token
    return access_token
}

/**
 * Get the details of the current login user from Zoho.
 * @function get_login_user
 * @async
 * @param token The access token for Zoho APIs.
 * @returns {Object} The login user details.
 */
const get_login_user = async(token) => {
    // build options
    const options = {
        host: Z_AUTH.URL,
        path: Z_AUTH.USER_PATH,
        method: 'GET',
        headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        }
    }

    // send request
    const result = await Utils.send(options)
    Utils.check_result(options, null, result, "get_login_user") 

    // return content
    return result.body
}


// –––– MODULE EXPORT –––– //
module.exports = {
    validate_session,
    invalidate_session,
    get_code_redirect,
    generate_access_token,
    get_env_token,
    get_session_token,
    get_login_user
}
