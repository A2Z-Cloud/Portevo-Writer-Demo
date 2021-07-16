// –––– IMPORTS –––– //
// Make standard HTTPS web requests
const https = require('https')


// –––– CONSTANTS –––– //

// HTTP Codes
const HTTP_CODE = {
    ACCEPTED: 200,
    NOT_ACCEPTED: 300,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
}

// –––– FUNCTIONS –––– //
/**
 * If status code is not 200, log then throw error.
 * @param payload
 * @param result
 */
 const check_result = (options, payload, result) => {
    if(result.statusCode > HTTP_CODE.NOT_ACCEPTED) {
        // get the callee
        const callee = new Error().stack.split('at ')[2].split(' ')[0]

        // log to console
        console.error('\n--Unexpected Result--\n')
        console.error(`Failed to call:\n${callee}\n`)
        console.error(`Target URL:\n${options.host}\n`)
        console.error(`Set path:\n${options.path}\n`)
        console.error(`Sent headers:\n${JSON.stringify(options.headers,null,4)}\n`)
        console.error(`Sent content:\n${JSON.stringify(payload,null,4)}\n`)
        console.error(`Recieved response:\n${JSON.stringify(result,null,4)}\n`)

        // raise error
        let message = "Unreadable response."
        if(result.body.message || result.body.error)
            message = result.body.message ? result.body.message : result.body.error.message
        throw Error(message)
    }
}

/**
 * Converts a json structure into a url parameter string.
 * @function to_query_string
 * @param params
 * @returns {string} the url arg string.
 */
const to_query_string = (params) => {
    let query_string = '', delimiter = '?'
    for (const key in params) {
        query_string += `${delimiter}${key}=${encodeURIComponent(params[key])}`
        delimiter = '&'
    }
    return query_string
}

/**
 * Sends an HTTPS request.
 * @function send
 * @param options
 * @param body
 * @returns {Object|Error} the response from the attempt or an error.
 */
const send = (options,body) => {
    // return new pending promise
    return new Promise((resolve, reject) => {
        // send request
        const request = https.request(options, (response) => {
            // push data chunks into the result and resolve
            let result = []
            response.on('data', (chunk) => result.push(chunk))
            response.on('end', () =>  {
                let end_result = result.join('')
                try { end_result = JSON.parse(end_result==''?'{}':end_result) }
                catch(err) { console.error(err) }
                resolve({
                    'statusCode': response.statusCode,
                    'headers': JSON.parse(JSON.stringify(response.headers)),
                    'body': end_result
                })
            })
        })

        // push data and handle connection errors
        request.on('data', (content) => process.stdout.write(content))
        request.on('error', (err) => reject(err))

        // make sure body is a string
        if(body != null && typeof body == 'object')
            body = JSON.stringify(body)

        // send request
        if(body) request.write(body)
        request.end()
    })
}

/**
 * Translates a date object to a string in the format dd/mm/yyyy hh:mm.
 * @param date
 * @returns {string}
 */
const format_date = (date) => {
    let hours = date.getHours()
    let minutes = date.getMinutes()
    let seconds = date.getSeconds()
    const am_pm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes
    seconds = seconds < 10 ? '0'+seconds : seconds
    const str_time = `${hours}:${minutes}:${seconds} ${am_pm}`
    return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} ${str_time}`
}



// –––– MODULE EXPORT –––– //
module.exports = {
    format_date,
    check_result,
    to_query_string,
    send,
    HTTP_CODE
}
